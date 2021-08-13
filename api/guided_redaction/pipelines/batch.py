import logging
from datetime import datetime, timedelta
from time import sleep
from urllib.parse import urlsplit, urlunsplit

import requests
import simplejson as json
from django.db import transaction
from django.db.models import Q
from parse_dt import now

from base.queue import json, Queue

from guided_redaction.jobs import tasks
from guided_redaction.jobs.models import Attribute, Job
from guided_redaction.task_queues import get_task_queue
from .models import Pipeline


logger = logging.getLogger(__name__)

class RedactionQueueHandler(object):

    def __init__(self, name, settings):
        self.settings = settings
        self.queue = Queue(name, settings)
        self.unreceived_recording_ids = []

    def run(self,
        count=0,
        peek=False,
        restart=None,
        retry_wait=None,
        throttle=None,
        throttle_wait=None,
    ):
        if restart:
            self.restart()
            return
        if throttle is None:
            throttle = getattr(self.settings, 'REDACT_BATCH_JOB_THROTTLE', 25)
        max_retries = getattr(self.settings, 'REDACT_BATCH_JOB_RETRIES', 1)
        retry_wait = getattr(
            self.settings, 'REDACT_BATCH_JOB_RETRY_WAIT', 2 * 60 * 60
        ) # 2h
        if not throttle_wait:
            throttle_wait = 60
        reads = 0
        while not count or (reads < count):
            reads += 1
            retries_this_pass = 0
            running_jobs = Job.objects.filter(status='running', parent=None)
            running_job_count = running_jobs.count()
            retry_jobs = running_jobs.filter(
                Q(updated__lte=now() - timedelta(seconds=retry_wait)) |
                Q(created_on=now() - timedelta(seconds=retry_wait * 2))
            ).order_by("updated")
            for job in retry_jobs:
                retry_attrs = job.attributes.filter(
                    name='retries', value__gte=max_retries
                )
                if retry_attrs:
                    job.status = 'retried'
                    job.save()
                    continue 
                self.retry_job(job)
                retries_this_pass += 1
                break # do at most one retry (to check job count before doing another)
            unreceived_rids = self.get_unreceived_recording_ids()
            unreceived_count = len(unreceived_rids)
            if running_job_count + unreceived_count >= throttle:
                logger.info(
                    f"{running_job_count} jobs running and {unreceived_count} queued. "
                    f" Waiting until fewer than {throttle} "
                    "jobs before starting another."
                )
                if unreceived_count:
                    logger.info("Queued recording ids:")
                    for rid in unreceived_rids:
                        logger.info(f"    {rid}")
                logger.info(f'sleeping for {throttle_wait} seconds.')
                sleep(throttle_wait)
                continue
            if retries_this_pass:
                sleep(3)
                continue
            queue_item = self.queue.fetch(count=1, peek=peek)
            if queue_item:
                queue_item = queue_item[0]
                self.handle_queue_item(queue_item)
            sleep(3)

    def get_recording_data(self, recording_id):
        url = f"{self.settings.CAMPAIGN_BASE_URL}/values"
        headers = {"Authorization": f"Api-Key {self.settings.CAMPAIGN_API_KEY}"}
        verify = self.settings.CAMPAIGN_VERIFY_SSL
        payload = {
            "RecordingKey": recording_id,
            "action": "RecordingInfo",
        }
        response = requests.post(url, headers=headers, json=payload, verify=verify)
        if not response.ok:
            logger.error(
                "Failed to retreive recording info: "
                f"{response.status_code} {response.text}"
            )
            return {}
        try:
            result = response.json()
        except json.JSONDecodeError:
            logger.error(f"Could not decode recording info: {response.text}")
            return {}
        try:
            result_details =  json.loads(result.get("resultdetails"))
        except json.JSONDecodeError:
            return {}
        if result["result"] == "SUCCESS" and result_details:
            return result_details[0]
        return {}

    def dispatch_pipeline(self, payload):
        url_parts = list(urlsplit(self.settings.REDACT_FILE_BASE_URL))
        url_parts[2] = "/api/redact/v1/pipelines/dispatch"
        url_parts[3] = "batch"
        url = urlunsplit(url_parts)
        headers = {f"Authorization": f"Api-Key {self.settings.LOCAL_API_KEY}"}
        response = requests.post(url, json=payload, headers=headers)
        if 200 <= response.status_code < 300:
            self.unreceived_recording_ids.append(payload["input"]["recording_ids"][0])
            result = response.json()
            logger.info(result)
        else:
            logger.error("Error Starting Pipeline")
            logger.error(f"URL {url}")
            logger.error(f"Payload {payload}")
            logger.error(f"Response: {response.status_code} {response.text}")

    def get_unreceived_recording_ids(self):
        """returns the list of recording ids that have been dispatched to a
        pipeline, but have not yet been received and turned into a job
        """
        received_recording_ids = [
            a.value
            for a in Attribute.objects.filter(
                name="inbound_recording_id", value__in=self.unreceived_recording_ids
            )
        ]
        self.unreceived_recording_ids = [
            rid for rid in self.unreceived_recording_ids
            if rid not in received_recording_ids
        ]
        return self.unreceived_recording_ids

    def handle_queue_item(self, queue_item):
        try:
            annotation = json.loads(queue_item['Annotation'])
        except json.JSONDecodeError:
            logger.error(
                f"Could not decode annotation: {queue_item['Annotation']}"
            )
            return
        pipeline_name = queue_item.get("Pipeline")
        pipelines = Pipeline.objects.filter(name=pipeline_name)
        if not pipelines:
            logger.error(
                f"Could not find pipeline with name {pipeline_name}"
            )
            return
        pipeline_id = str(pipelines[0].id)
        try: 
            account = int(annotation.get("accountId"))
        except ValueError:
            logger.error(f"Invalid account {annotation.get('accountId')}")
            return
        timestamp = annotation.get("timestamp")
        try:
            dt = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ")
        except TypeError:
            logger.error(f"Invalid timestamp {timstamp}")
        date = dt.strftime("%Y-%m-%d")
        recording_id = annotation.get("value")
        recording_data = self.get_recording_data(recording_id)
        global_id = annotation.get("agentId")
        payload = {
            "owner": global_id,
            "pipeline_id": pipeline_id,
            "input": {"recording_ids": [recording_id]},
            "attributes": {
                "account": account,
                "lob": 0,
                "transaction_id": recording_data.get("transactionID"),
                "global_id": global_id,
            },
        }
        logger.info("Dispatching redaction pipeline")
        logger.info(json.dumps(payload, indent=2))
        self.dispatch_pipeline(payload)

    def restart(self):
        running_jobs = Job.objects.filter(status='running', parent=None)
        for job in running_jobs:
            self.retry_job(job, is_restart=True)

    def retry_job(self, job, is_restart=False):
        if not job:
            logger.error("Retry job has gone missing")
            return
        attributes = {}
        auto_delete_age = owner = pipeline = recording_id = None
        for attr in Attribute.objects.filter(job=job):
            if attr.name == "retries":
                attributes[attr.name] = attr.value + (0 if is_restart else 1)
            elif attr.name == "user_id":
                owner = attr.value
            elif attr.name == "pipeline_job_link":
                pipeline = attr.pipeline
            elif attr.name == "inbound_recording_id":
                recording_id = attr.value
            elif attr.name == "auto_delete_age":
                auto_delete_age = attr.value
                attributes[attr.name] = attr.value 
            else:  
                attributes[attr.name] = attr.value 
        logger.info(f"retry job {job.pk} attributes: {attributes}")
        if "retries" not in attributes and not is_restart:
            attributes["retries"] = 1
        if not recording_id:
            logger.error(
                f"Could not retry job {job.pk} because recording id is missing"
            )
            if auto_delete_age != "never":
                queue = job.hostname or get_task_queue()
                logger.info(
                    f"Deleting {job.pk} for lack of recording id on queue {queue}"
                )
                with transaction.atomic():
                    job.status = 'deleting'
                    job.save()
                tasks.delete_job.apply_async((job.pk,), queue=queue)
            return
        if not (owner and pipeline):
            logger.error(f"Could not retry job {job.pk} because job is missing "
                f"owner or pipeline info. owner: {owner}, pipeline: {pipeline.pk}"
            )
            return
        payload = {
            "pipeline_id": str(pipeline.pk),
            "input": {"recording_ids": [recording_id]},
        }
        payload["attributes"] = attributes
        self.dispatch_pipeline(payload)
        queue = job.hostname or get_task_queue()
        logger.info(
            f"New job dispatched to replace {job.pk}. "
            f"Deleting {job.pk} on queue {queue}"
        )
        with transaction.atomic():
            job.status = 'deleting'
            job.save()
        tasks.delete_job.apply_async((job.pk,), queue=queue)

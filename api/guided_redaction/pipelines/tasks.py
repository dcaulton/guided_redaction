import json
import random
import time

from celery import shared_task
from django.db import transaction

from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import PipelineT1DiffViewSet, PipelineT1SumViewSet
from guided_redaction.pipelines.controller_dispatch import DispatchController
from guided_redaction.utils.task_shared import get_pipeline_for_job

from .models import Pipeline


@shared_task
def dispatch_pipeline(request_data, owner, new_job_id):
    job_lifecycle_data = request_data.get('job_lifecycle_data', {})
    pipeline_id = request_data['pipeline_id']
    if not Pipeline.objects.filter(id=pipeline_id).exists():
        return self.error("invalid pipeline id specified", status_code=400)
    input_data = request_data['input']
    attributes = request_data.get('attributes')
    workbook_id = request_data.get("workbook_id")
    worker = DispatchController()
    worker.dispatch_pipeline(
        pipeline_id,
        input_data,
        workbook_id=workbook_id,
        owner=owner,
        parent_job=None,
        lifecycle_data=job_lifecycle_data,
        new_job_id=new_job_id,
        attributes=attributes,
    )

@shared_task
def t1_sum(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        with transaction.atomic():
            job.status = 'running'
            job.save()
            worker = PipelineT1SumViewSet()
            response = worker.process_create_request(json.loads(job.request_data))
            job.response_data = json.dumps(response.data)
            job.status = 'success'
            job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            worker = DispatchController()
            worker.handle_job_finished(job, pipeline)

@shared_task
def t1_diff(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        with transaction.atomic():
            job.status = 'running'
            job.save()
            worker = PipelineT1DiffViewSet()
            response = worker.process_create_request(json.loads(job.request_data))
            job.response_data = json.dumps(response.data)
            job.status = 'success'
            job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            worker = DispatchController()
            worker.handle_job_finished(job, pipeline)

@shared_task
def noop(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        time.sleep(5 + random.random()) # randomized sleep to avoid race conditions with complex noop pipelines
        job.response_data = job.request_data
        job.status = 'success'
        job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            worker = DispatchController()
            worker.handle_job_finished(job, pipeline)

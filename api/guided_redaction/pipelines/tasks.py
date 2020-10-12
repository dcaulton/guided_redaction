from celery import shared_task
import json
from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import (
    PipelinesViewSetDispatch, 
    PipelineT1DiffViewSet,
    PipelineT1SumViewSet
)


def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects.filter(job=job, name='pipeline_job_link').first().pipeline

@shared_task
def t1_sum(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        worker = PipelineT1SumViewSet()
        response = worker.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            worker = PipelinesViewSetDispatch()
            worker.handle_job_finished(job, pipeline)

@shared_task
def t1_diff(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        worker = PipelineT1DiffViewSet()
        response = worker.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            worker = PipelinesViewSetDispatch()
            worker.handle_job_finished(job, pipeline)

import json                                                                     
from celery import shared_task                                                  
from guided_redaction.jobs.models import Job
from guided_redaction.job_run_summaries.api import (
    JobRunSummariesViewSet,
)

@shared_task
def create_manual_jrs(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        worker = JobRunSummariesViewSet()
        response = worker.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

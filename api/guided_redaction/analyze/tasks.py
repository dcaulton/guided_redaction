from celery import shared_task
import json
from guided_redaction.jobs.models import Job

@shared_task
def scan_template(job_uuid):
    job = Job.objects.filter(uuid=job_uuid).first()
    if job:
        print('scanning template for job ', job_uuid)
        request_data = json.loads(job.request_data)
        print('request data ', request_data['templates'])
        job.status = 'success'
        job.save()
    else:
        print('error, calling scan_template on nonexistent job: ', job_uuid)

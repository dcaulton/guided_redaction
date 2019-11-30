from celery import shared_task
import json
from guided_redaction.jobs.models import Job
from guided_redaction.analyze.views import AnalyzeViewSetScanTemplate

@shared_task
def scan_template(job_uuid):
    job = Job.objects.filter(uuid=job_uuid).first()
    if job:
        print('scanning template for job ', job_uuid)
        request_data = json.loads(job.request_data)
        avsst = AnalyzeViewSetScanTemplate()
        response_data = avsst.process_create_request(request_data)
        if response_data['errors_400']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_400'])
        elif response_data['errors_422']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_422'])
        else:
            job.response_data = json.dumps(response_data['response_data'])
            job.status = 'success'
        job.save()
    else:
        print('error, calling scan_template on nonexistent job: ', job_uuid)

from celery import shared_task
import json
import os
from guided_redaction.jobs.models import Job
from guided_redaction.redact.api import RedactViewSetRedactImage


@shared_task
def redact(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        if not job.parent:
            children = Job.objects.filter(parent_id=job.id, status='created').order_by('sequence')
            if children.count():
              next_child = children[0]
              redact.delay(next_child.id)
              return
        else:
            rvsri = RedactViewSetRedactImage()
            response = rvsri.process_create_request(json.loads(job.request_data))
            prev_working_dir = get_file_uuid_from_response(response.data)
            job.response_data = json.dumps(response.data)
            job.status = 'success'
            job.save()
            children = Job.objects.filter(parent_id=job.parent_id, status='created').order_by('sequence')
            if children.count():
              next_child = children[0]

              ncrd = json.loads(next_child.request_data)
              if (ncrd['preserve_working_dir_across_batch'] == 'true' and prev_working_dir): 
                  ncrd['working_dir'] = prev_working_dir
                  next_child.request_data = json.dumps(ncrd)
                  next_child.save()

              redact.delay(next_child.id)
              return
            else:
              job.parent.status = 'success'
              job.parent.save()

def get_file_uuid_from_response(response_dict):
    the_uuid = ''
    if 'redacted_image_url' in response_dict:
        ts = response_dict['redacted_image_url'].split('/')
        print(ts)

        if len(ts) > 1:
            the_uuid = ts[-2]
    return the_uuid

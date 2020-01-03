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
            job.response_data = json.dumps(response.data)
            job.status = 'success'
            job.save()
            children = Job.objects.filter(parent_id=job.parent_id, status='created').order_by('sequence')
            if children.count():
              next_child = children[0]
              redact.delay(next_child.id)
              return
            else:
              job.parent.status = 'success'
              job.parent.save()

def get_file_uuids_from_response(request_dict):
    uuids = []
    if 'source_image_url' in request_dict:
        (x_part, file_part) = os.path.split(request_dict['source_image_url'])
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part and len(uuid_part) == 36:
            uuids.append(uuid_part)
    if 'target_movies' in request_dict:
        for movie_url in request_dict['target_movies'].keys():
            movie = request_dict['target_movies'][movie_url]
            if 'frames' in movie.keys() and movie['frames']:
                (x_part, file_part) = os.path.split(movie['frames'][0])
                (y_part, uuid_part) = os.path.split(x_part)
                if uuid_part and len(uuid_part) == 36:
                    uuids.append(uuid_part)
    return uuids

from celery import shared_task
import json
import os
from guided_redaction.jobs.models import Job
from guided_redaction.analyze.api import AnalyzeViewSetFilter, AnalyzeViewSetScanTemplate


@shared_task
def scan_template(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        print('scanning template for job '+ job_uuid)
        avsst = AnalyzeViewSetScanTemplate()
        response = avsst.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data.get('matches'))
        new_uuids = get_file_uuids_from_response(json.loads(job.request_data))
        if new_uuids:
            existing_uuids = json.loads(job.file_uuids_used)
            existing_uuids = existing_uuids + new_uuids
            job.file_uuids_used = json.dumps(existing_uuids)
        job.status = 'success'
        job.save()
    else:
        print('calling scan_template on nonexistent job: '+ job_uuid)

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

@shared_task
def filter(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        print('running filter for job '+ job_uuid)
        avsf = AnalyzeViewSetFilter()
        response = avsf.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        new_uuids = get_file_uuids_from_response(json.loads(job.request_data))
        if new_uuids:
            existing_uuids = json.loads(job.file_uuids_used)
            existing_uuids = existing_uuids + new_uuids
            job.file_uuids_used = json.dumps(existing_uuids)
        job.status = 'success'
        job.save()
    else:
        print('calling filter on nonexistent job: '+ job_uuid)


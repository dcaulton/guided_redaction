from celery import shared_task                                                  
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.parse.views import ParseViewSetSplitAndHashMovie


@shared_task
def split_and_hash_movie(job_uuid):
    job = Job.objects.filter(uuid=job_uuid).first()
    if job:
        job.status = 'running'
        job.save()
        print('scanning template for job ', job_uuid)
        request_data = json.loads(job.request_data)
        pvssahm = ParseViewSetSplitAndHashMovie()
        response_data = pvssahm.process_create_request(request_data)
        if response_data['errors_400']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_400'])
        elif response_data['errors_422']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_422'])
        else:
            job.response_data = json.dumps(response_data['response_data'])
            new_uuid = get_file_uuid_from_response(response_data['response_data'])
            if new_uuid:
                existing_uuids = json.loads(job.file_uuids_used)
                existing_uuids.append(new_uuid)
                job.file_uuids_used = json.dumps(existing_uuids)
            job.status = 'success'
        job.save()
    else:
        print('calling split_and_hash_movie on nonexistent job: '+ job_uuid) 

def get_file_uuid_from_response(response_dict):
    if 'frames' in response_dict and response_dict['frames']:
        (x_part, file_part) = os.path.split(response_dict['frames'][0])
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part and len(uuid_part) == 36:
            return uuid_part

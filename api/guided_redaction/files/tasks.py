from celery import shared_task                                                  
import pprint
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.files.api import (
    FilesViewSetMovieMetadata,
    FilesViewSetDownloadSecureFile
)


@shared_task
def get_secure_file(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling get_secure_file on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running get_secure_file for job {}'.format(job_uuid))
    worker = FilesViewSetDownloadSecureFile()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def save_movie_metadata(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling save_movie_metadata on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running save_movie_metadata for job {}'.format(job_uuid))
    worker = FilesViewSetMovieMetadata()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

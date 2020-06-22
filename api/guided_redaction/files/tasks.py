from celery import shared_task                                                  
import pprint
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.pipelines.api import PipelinesViewSetDispatch
from guided_redaction.attributes.models import Attribute
from guided_redaction.files.api import (
    FilesViewSetMovieMetadata,
    FilesViewSetDownloadSecureFile
)
from guided_redaction.utils.task_shared import (
    build_file_directory_user_attributes_from_movies
)


def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects.filter(job=job, name='pipeline_job_link').first().pipeline

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
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    build_file_directory_user_attributes_from_movies(job, response.data)

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = PipelinesViewSetDispatch()
        worker.handle_job_finished(job, pipeline)

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
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def load_movie_metadata(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling load_movie_metadata on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running load_movie_metadata for job {}'.format(job_uuid))
    worker = FilesViewSetMovieMetadata()
    response = worker.process_retrieve_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

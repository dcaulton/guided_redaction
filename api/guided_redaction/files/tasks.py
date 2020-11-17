from celery import shared_task                                                  
import pprint
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.pipelines.api import PipelinesViewSetDispatch
from guided_redaction.attributes.models import Attribute
from guided_redaction.files.api import (
    FilesViewSetMovieMetadata,
    FilesViewSetUnzipArchive,
    FilesViewSetDownloadSecureFile
)
from guided_redaction.utils.task_shared import (
    build_file_directory_user_attributes_from_movies
)
from guided_redaction.parse.tasks import split_and_hash_threaded


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

@shared_task
def unzip_archive(job_uuid):
    print('CALLING UNZIP ARCHIVE TASK')
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling unzip_archive on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running unzip_archive for job {}'.format(job_uuid))
    worker = FilesViewSetUnzipArchive()
    response = worker.process_unzip_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    dispatch_movie_split_jobs(response.data)
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    if 'errors' in response.data:
        job.status = 'failed'
    job.save()

def dispatch_movie_split_jobs(response_data):
    movies_to_dispatch = []
    if 'movies' in response_data:
        for movie_url in response_data['movies']:
            movies_to_dispatch.append(movie_url)
    if movies_to_dispatch:
        build_request_data = {
            'movie_urls': movies_to_dispatch,
            'preserve_movie_audio': True,
            'frameset_discriminator': 'gray8',
        }
        job = Job(
            request_data=json.dumps(build_request_data),
            status='created',
            description='split and hash movies from imported archive',
            app='parse',
            operation='split_and_hash_threaded',
            sequence=0,
        )
        job.save()

        split_and_hash_threaded.delay(job.id)

    

import logging
import os

import simplejson as json
from celery import shared_task                                                  

from guided_redaction.attributes.models import Attribute
from guided_redaction.files.api import (
    FilesViewSetMovieMetadata,
    FilesViewSetUnzipArchive,
    FilesViewSetDownloadSecureFile,
    FilesViewSetUploadSecureFile,
    FilesViewSetPurgeJob,
    FilesViewSetSaveGTAttribute,
)
from guided_redaction.jobs.models import Job                                    
from guided_redaction.parse.tasks import split_and_hash_threaded
from guided_redaction.pipelines.controller_dispatch import DispatchController
from guided_redaction.utils.gt import post_redacted_video_saved_event
from guided_redaction.utils.external_payload_utils import delete_external_payloads
from guided_redaction.utils.task_shared import (
    build_file_directory_user_attributes_from_urls,
    build_delete_files_with_job_attribute,
    build_file_directory_user_attributes_from_movies,
    get_account_lob_global_recording_gt_ids,
    get_pipeline_for_job,
)

log = logging.getLogger(__name__)

def send_redacted_video_saved_signal(upload_job, pipeline):
    account, lob, global_id, recording_id, gtid = \
        get_account_lob_global_recording_gt_ids(upload_job.parent)
    print(
        f'making gr video saved signal for recording {recording_id}, '
        f'account {account}, lob {lob}, global_id {global_id}, gtid {gtid}'
    )
    if any([f is None for f in (account, lob, global_id, recording_id, gtid)]):
        print(
            'Cannot make gr video saved signal. '
            f'Missing one or more of account {account}, lob {lob}, '
            f'global_id {global_id}, gtid {gtid}, or recording_id {recording_id}.'
        )
        return
    source_details = {
        'jobId': upload_job.parent.id,
        'pipelineName': pipeline.name,
        'recordingId': recording_id,
    }
    post_redacted_video_saved_event(
        account, lob, global_id, gtid, recording_id, source_details=source_details
    )

@shared_task
def save_gt_attribute(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling save_gt_attribute on nonexistent job: '+ job_uuid)
        return
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
    print('running save_gt_attribute for job {}'.format(job_uuid))
    worker = FilesViewSetSaveGTAttribute()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling save_gt_attribute on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    if 200 <= response.status_code < 300:
        job.status = 'success'
    else:
        error_string = \
            f"save_gt_attribute for job {job_uuid} with status code {response.status_code}"
        log.error(error_string)
        job.status = 'failed'
    job.save()
    job.update_percent_complete()

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

@shared_task
def purge_job(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling purge_job on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    # we can bypass the purge job by creating a job with status=bypassed
    if job.status != 'bypassed': 
        Job.objects.filter(pk=job_uuid).update(status='running')
        delete_external_payloads(job)
        print('running purge_job for job {}'.format(job_uuid))
        worker = FilesViewSetPurgeJob()
        response = worker.process_create_request(json.loads(job.request_data), job_uuid)
        if not Job.objects.filter(pk=job_uuid).exists():
            print('calling purge_job on nonexistent job: '+ job_uuid)
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        if 200 <= response.status_code < 300:
            job.status = 'purged'
        else:
            job.status = 'failed'
    job.save()
    job.update_percent_complete()

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

@shared_task
def get_secure_file(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling get_secure_file on nonexistent job: '+ job_uuid)
        return
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
    print('running get_secure_file for job {}'.format(job_uuid))
    worker = FilesViewSetDownloadSecureFile()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling get_secure_file on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    if 200 <= response.status_code < 300:
        print('gilligree {}'.format(job.response_data))
        job.status = 'success'
    else:
        log.error(
            f"get_secure_file for job {job_uuid} "
            f"with status code {response.status_code}"
        )
        job.status = 'failed'
    job.save()
    job.update_percent_complete()

    build_file_directory_user_attributes_from_movies(job, response.data)

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

@shared_task
def put_secure_file(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling put_secure_file on nonexistent job: '+ job_uuid)
        return
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
    print('running put_secure_file for job {}'.format(job_uuid))
    worker = FilesViewSetUploadSecureFile()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling put_secure_file on nonexistent job: '+ job_uuid)
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    if 200 <= response.status_code < 300:
        job.status = 'success'
    else:
        error_string = (
            f"put_secure_file for job {job_uuid} "
            " with status code {response.status_code}"
        )
        log.error(error_string)
        job.status = 'failed'
    job.save()
    job.update_percent_complete()
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        send_redacted_video_saved_signal(job, pipeline)
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

@shared_task
def save_movie_metadata(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling save_movie_metadata on nonexistent job: '+ job_uuid)
        return
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
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
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
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
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling unzip_archive on nonexistent job: '+ job_uuid)
        return
    Job.objects.filter(pk=job_uuid).update(status='running')
    job = Job.objects.get(pk=job_uuid)
    print('running unzip_archive for job {}'.format(job_uuid))
    worker = FilesViewSetUnzipArchive()
    response = worker.process_unzip_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    unzip_archive_request = json.loads(job.request_data)
    archive_url = unzip_archive_request.get('archive_url')
    url_list = [archive_url]
    build_file_directory_user_attributes_from_urls(job, url_list)
    build_delete_files_with_job_attribute(job, True)

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

    

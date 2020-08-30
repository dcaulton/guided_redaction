from celery import shared_task
import json
import os
from guided_redaction.jobs.models import Job
from guided_redaction.utils.task_shared import (
    evaluate_children,
    build_file_directory_user_attributes_from_movies,
    get_pipeline_for_job
)
from guided_redaction.redact.api import RedactViewSetRedactImage, RedactViewSetIllustrateImage
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import PipelinesViewSetDispatch


@shared_task
def redact_single(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        worker = RedactViewSetRedactImage()
        response = worker.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        build_file_directory_user_attributes_from_movies(job, response.data)

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'redact' and parent_job.operation == 'redact':
                redact_threaded.delay(parent_job.id)

def build_and_dispatch_redact_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    job_counter = 0
    request_data = json.loads(parent_job.request_data)
    movies = request_data['movies']
    for movie_url in movies:
        movie = movies[movie_url]
        for frameset_hash in movie['framesets']:
            if 'areas_to_redact' in movie['framesets'][frameset_hash].keys():
                job_counter += 1
                request_data = {
                    'movie_url': movie_url,
                    'frameset_hash': frameset_hash,
                    'image_url': movie['framesets'][frameset_hash]['images'][0],
                    'areas_to_redact': movie['framesets'][frameset_hash]['areas_to_redact'],
                    'redact_rule': request_data['redact_rule'],
                    'meta': request_data['meta'],
                }
                job = Job(
                    request_data=json.dumps(request_data),
                    status='created',
                    description='redact image for frameset {}'.format(frameset_hash),
                    app='redact',
                    operation='redact',
                    sequence=0,
                    parent=parent_job,
                )
                job.save()
                redact_single.delay(job.id)

def wrap_up_redact_threaded(job, children):
    aggregate_response_data = {
      'movies': {},
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        redacted_image_url = child_response_data['redacted_image_url']
        child_request_data = json.loads(child.request_data)
        movie_url = child_request_data['movie_url']
        frameset_hash = child_request_data['frameset_hash']
        child_request_data = json.loads(child.request_data)
        if movie_url not in aggregate_response_data['movies']:
            aggregate_response_data['movies'][movie_url] = {}
            aggregate_response_data['movies'][movie_url]['framesets'] = {}
        agg_resp_data_framesets = aggregate_response_data['movies'][movie_url]['framesets']
        agg_resp_data_framesets[frameset_hash] = {}
        agg_resp_data_framesets[frameset_hash]['redacted_image'] = redacted_image_url
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.save()

@shared_task
def redact_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        next_step = evaluate_children('REDACT', 'redact', children)

        print('next step is {}'.format(next_step))
        if next_step == 'build_child_tasks':
            build_and_dispatch_redact_threaded_children(job)
        elif next_step == 'noop':
            pass
        elif next_step == 'wrap_up':
            wrap_up_redact_threaded(job, children)
            pipeline = get_pipeline_for_job(job.parent)
            if pipeline:
                worker = PipelinesViewSetDispatch()
                worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
            job.status = 'failed'
            job.save()
        return

@shared_task
def illustrate(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        rvsri = RedactViewSetIllustrateImage()
        response = rvsri.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()
        build_file_directory_user_attributes_from_movies(job, response.data)

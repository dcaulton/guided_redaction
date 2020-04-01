from celery import shared_task
import json
import os
from guided_redaction.jobs.models import Job
from guided_redaction.redact.api import RedactViewSetRedactImage, RedactViewSetIllustrateImage
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import PipelinesViewSetDispatch


def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects.filter(job=job, name='pipeline_job_link').first().pipeline

@shared_task
def redact_single(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        rvsri = RedactViewSetRedactImage()
        response = rvsri.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'redact' and parent_job.operation == 'redact':
                redact_threaded.delay(parent_job.id)

def evaluate_redact_threaded_children(children):
    children_count = 0
    completed_children_count = 0
    failed_children_count = 0
    for child in children:
        if child.operation == 'redact':
            children_count += 1
            if child.status == 'success':
                completed_children_count += 1
            elif child.status == 'failed':
                failed_children_count += 1
    def print_totals():
        print('REDACT CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
            children_count, completed_children_count, failed_children_count))
    print_totals()
    if children_count == 0:
        return ('build_child_tasks', 0)
    elif children_count == completed_children_count:
        return ('wrap_up', 1)
    elif children_count > 0:
        complete_percent = completed_children_count / children_count
        return ('update_percent_complete', complete_percent)
    elif failed_children_count > 0:
        return ('abort', 0)

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
                    'mask_method': request_data['mask_method'],
                    'meta': request_data['meta'],
                }
                job = Job(
                    request_data=json.dumps(request_data),
                    status='created',
                    description='redact image for frameset {}'.format(frameset_hash),
                    app='redact',
                    operation='redact',
                    sequence=0,
                    elapsed_time=0.0,
                    parent=parent_job,
                )
                job.save()
                msg = 'build_and_dispatch_redact_threaded_children: '
                msg += 'dispatching job for frameset {}'.format(frameset_hash)
                print(msg)
                redact_single.delay(job.id)
                # intersperse these evenly in the job stack so we get regular updates
                if job_counter% 5 == 0:
                    redact_threaded.delay(parent_job.id)
        redact_threaded.delay(parent_job.id)

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
    job.elapsed_time = 1
    job.save()

@shared_task
def redact_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_redact_threaded_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
            build_and_dispatch_redact_threaded_children(job)
        elif next_step == 'update_percent_complete':
            job.elapsed_time = percent_done
            job.save()
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

def get_file_uuid_from_response(response_dict):
    the_uuid = ''
    if 'redacted_image_url' in response_dict:
        ts = response_dict['redacted_image_url'].split('/')
        print(ts)

        if len(ts) > 1:
            the_uuid = ts[-2]
    return the_uuid

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

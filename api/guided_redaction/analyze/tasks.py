from celery import shared_task
import json
import os
from guided_redaction.jobs.models import Job
from guided_redaction.analyze.api import (
    AnalyzeViewSetFilter, 
    AnalyzeViewSetScanTemplate,
    AnalyzeViewSetEastTess
)


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

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'analyze' and parent_job.operation == 'scan_template_threaded':
                scan_template_threaded.delay(parent_job.id)
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

@shared_task
def scan_template_threaded(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_scan_template_threaded_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_scan_template_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.elapsed_time = percent_done
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_scan_template_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def evaluate_scan_template_threaded_children(children):
    scan_template_children = 0
    scan_template_completed_children = 0
    scan_template_failed_children = 0
    for child in children:
        if child.operation == 'scan_template':
            scan_template_children += 1
            if child.status == 'success':
                scan_template_completed_children += 1
            elif child.status == 'failed':
                scan_template_failed_children += 1
    def print_totals():
        print('SCAN TEMPLATE CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
            scan_template_children, scan_template_completed_children, scan_template_failed_children))
    print_totals()
    if scan_template_children == 0:
        return ('build_child_tasks', 0)
    elif scan_template_children == scan_template_completed_children:
        return ('wrap_up', 1)
    elif scan_template_children > 0:
        complete_percent = scan_template_completed_children/scan_template_children
        return ('update_percent_complete', complete_percent)
    elif split_movie_failed_children > 0:
        return ('abort', 0)

def build_and_dispatch_scan_template_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    template = request_data['template']
    source_image_url = request_data['source_image_url']
    movies = request_data['target_movies']
    for movie_url in movies:
        movie = movies[movie_url]
        target_movies = {}
        target_movies[movie_url] = movie
        request_data = json.dumps({
            'template': template,
            'source_image_url': source_image_url,
            'target_movies': target_movies,
        })
        job = Job(
            request_data=request_data,
            file_uuids_used=[], # TODO, figure this out
            status='created',
            description='scan_template for movie {}'.format(movie_url),
            app='analyze',
            operation='scan_template',
            sequence=0,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('build_and_dispatch_scan_template_thread_children: dispatching job for movie {}'.format(movie_url))
        scan_template.delay(job.id)

def wrap_up_scan_template_threaded(job, children):
    aggregate_response_data = {}
    for child in children:
        child_response_data = json.loads(child.response_data)
        # the children will all have just one movie in their response
        # also, we know that no child failed at this point
        print('========================== WRAPPING UP')
        print('child response data keys are {}'.format(child_response_data.keys()))
        print('zeroth key is {}'.format(list(child_response_data.keys())[0]))
        movie_url = list(child_response_data.keys())[0]
        aggregate_response_data[movie_url] = child_response_data[movie_url]

    print('wrap_up_scan_template_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.elapsed_time = 1
    job.save()

@shared_task
def scan_ocr(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        scanner = AnalyzeViewSetEastTess()
        response = scanner.process_create_request(json.loads(job.request_data))
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

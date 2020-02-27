from celery import shared_task
import json
import os
from fuzzywuzzy import fuzz
from guided_redaction.jobs.models import Job
from guided_redaction.analyze.api import (
    AnalyzeViewSetFilter, 
    AnalyzeViewSetScanTemplate,
    AnalyzeViewSetTelemetry,
    AnalyzeViewSetTimestamp,
    AnalyzeViewSetEastTess
)


@shared_task
def scan_template(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        print('scanning template for job '+ job_uuid)
        avsst = AnalyzeViewSetScanTemplate()
        response = avsst.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        request = json.loads(job.request_data)
        if ('match_method' not in request['template'] or
            request['template']['match_method'] == 'any'):
            job.response_data = json.dumps(response.data)
        elif request['template']['match_method'] == 'all':
            built_response_data = {}
            all_anchor_keys = set([x['id'] for x in request['template']['anchors']])
            raw_response = response.data
            for movie_url in raw_response.keys():
                built_response_data[movie_url] = {}
                for frameset_hash in raw_response[movie_url].keys():
                    anchor_matches = raw_response[movie_url][frameset_hash]
                    anchor_match_keys = set(raw_response[movie_url][frameset_hash].keys())
                    if anchor_match_keys == all_anchor_keys:
                        built_response_data[movie_url][frameset_hash] = raw_response[movie_url][frameset_hash]
            job.response_data = json.dumps(built_response_data)
        job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'analyze' and parent_job.operation == 'scan_template_threaded':
                scan_template_threaded.delay(parent_job.id)
    else:
        print('calling scan_template on nonexistent job: '+ job_uuid)

@shared_task
def filter(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        print('running filter for job '+ job_uuid)
        avsf = AnalyzeViewSetFilter()
        response = avsf.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()
    else:
        print('calling filter on nonexistent job: '+ job_uuid)

@shared_task
def get_timestamp(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling get_timestamp on nonexistent job: '+ job_uuid)
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running get_timestamp for job '+ job_uuid)
    worker = AnalyzeViewSetTimestamp()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'get_timestamp_threaded':
            get_timestamp_threaded.delay(parent_job.id)

@shared_task
def get_timestamp_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_get_timestamp_threaded_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_get_timestamp_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.elapsed_time = percent_done
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_get_timestamp_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def evaluate_get_timestamp_threaded_children(children):
    children_count = 0
    completed_children_count = 0
    failed_children_count = 0
    for child in children:
        if child.operation == 'get_timestamp':
            children_count += 1
            if child.status == 'success':
                completed_children_count += 1
            elif child.status == 'failed':
                failed_children_count += 1
    def print_totals():
        print('GET TIMESTAMP CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
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

def build_and_dispatch_get_timestamp_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    movies = request_data['movies']
    for index, movie_url in enumerate(movies.keys()):
        movie = movies[movie_url]
        build_movies = {}
        build_movies[movie_url] = movie
        request_data = json.dumps({
            'movies': build_movies,
        })
        job = Job(
            request_data=request_data,
            status='created',
            description='get_timestamp for movie {}'.format(movie_url),
            app='analyze',
            operation='get_timestamp',
            sequence=0,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('build_and_dispatch_get_timestamp_thread_children: dispatching job for movie {}'.format(movie_url))
        get_timestamp.delay(job.id)
        # intersperse these evenly in the job stack so we get regular updates
        if index % 5 == 0:
            get_timestamp_threaded.delay(parent_job.id)
    get_timestamp_threaded.delay(parent_job.id)

def wrap_up_get_timestamp_threaded(job, children):
    aggregate_response_data = {}
    for child in children:
        child_response_data = json.loads(child.response_data)
        if len(child_response_data.keys()) > 0:
            movie_url = list(child_response_data.keys())[0]
            aggregate_response_data[movie_url] = child_response_data[movie_url]

    print('wrap_up_get_timestamp_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.elapsed_time = 1
    job.save()


@shared_task
def scan_template_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
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
    elif split_template_failed_children > 0:
        return ('abort', 0)

def build_and_dispatch_scan_template_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    template = request_data['template']
    source_image_url = request_data['source_image_url']
    movies = request_data['movies']
    for index, movie_url in enumerate(movies):
        movie = movies.get(movie_url)
        build_movies = {}
        build_movies[movie_url] = movie
        request_data = json.dumps({
            'template': template,
            'source_image_url': source_image_url,
            'movies': build_movies,
        })
        job = Job(
            request_data=request_data,
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
        # intersperse these evenly in the job stack so we get regular updates
        if index % 5 == 0:
            scan_template_threaded.delay(parent_job.id)
    scan_template_threaded.delay(parent_job.id)

def wrap_up_scan_template_threaded(job, children):
    aggregate_response_data = {
        'movies': {},
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        if not child_response_data:
            continue
        if len(child_response_data['movies'].keys()) > 0:
            movie_url = list(child_response_data['movies'].keys())[0]
            aggregate_response_data['movies'][movie_url] = child_response_data['movies'][movie_url]

    print('wrap_up_scan_template_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.elapsed_time = 1
    job.save()

@shared_task
def scan_ocr_image(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        scanner = AnalyzeViewSetEastTess()
        response = scanner.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'analyze' and parent_job.operation == 'scan_ocr_movie':
                scan_ocr_movie.delay(parent_job.id)

@shared_task
def telemetry_find_matching_frames(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        scanner = AnalyzeViewSetTelemetry()
        response = scanner.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

@shared_task
def scan_ocr_movie(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_scan_ocr_movie_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_scan_ocr_movie_children(job)
        elif next_step == 'update_percent_complete':
          job.elapsed_time = percent_done
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_scan_ocr_movie(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_scan_ocr_movie_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    for movie_url in request_data['movies']:
        movie = request_data['movies'][movie_url]
        scan_area = request_data['scan_area']
        roi_start_x = scan_area['start'][0]
        roi_start_y = scan_area['start'][1]
        roi_end_x = scan_area['end'][0]
        roi_end_y = scan_area['end'][1]
        skip_east = False
        if 'skip_east' in request_data:
            skip_east = request_data['skip_east']
        for index, frameset_hash in enumerate(movie['framesets'].keys()):
            frameset = movie['framesets'][frameset_hash]
            first_image_url = frameset['images'][0]
            child_job_request_data = json.dumps({
                'movie_url': movie_url,
                'image_url': first_image_url,
                'frameset_hash': frameset_hash,
                'roi_start_x': roi_start_x,
                'roi_start_y': roi_start_y,
                'roi_end_x': roi_end_x,
                'roi_end_y': roi_end_y,
                'skip_east': skip_east,
            })
            job = Job(
                request_data=child_job_request_data,
                status='created',
                description='scan_ocr for frameset {}'.format(frameset_hash),
                app='analyze',
                operation='scan_ocr_image',
                sequence=0,
                elapsed_time=0.0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_scan_ocr_movie_children: dispatching job for frameset {}'.format(frameset_hash))
            scan_ocr_image.delay(job.id)
            # intersperse these evenly in the job stack so we get regular updates
            if index % 5 == 0:
                scan_ocr_movie.delay(parent_job.id)
        scan_ocr_movie.delay(parent_job.id)
    scan_ocr_movie.delay(parent_job.id)

def evaluate_scan_ocr_movie_children(child_jobs):
    children = 0
    completed_children = 0
    failed_children = 0
    for child in child_jobs:
        children += 1
        if child.status == 'success':
            completed_children += 1
        elif child.status == 'failed':
            failed_children += 1
    def print_totals():
        print('SCAN OCR CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
            children, completed_children, failed_children))
    print_totals()
    if children == 0:
        return ('build_child_tasks', 0)
    elif children == completed_children:
        return ('wrap_up', 1)
    elif children > 0:
        complete_percent = completed_children/children
        return ('update_percent_complete', complete_percent)
    elif failed_children > 0:
        return ('abort', 0)

def wrap_up_scan_ocr_movie(parent_job, children):
    parent_request_data = json.loads(parent_job.request_data)
    aggregate_response_data = {}
    print('========================== WRAPPING UP OCR')
    for child in children:
        child_response_data = json.loads(child.response_data)
        if not child_response_data:
            continue
        child_request_data = json.loads(child.request_data)
        frameset_hash = child_request_data['frameset_hash']
        movie_url = child_request_data['movie_url']
        if ('movies' not in aggregate_response_data):
            aggregate_response_data['movies'] = {}
        areas_to_redact = child_response_data['recognized_text_areas']
        if (parent_request_data['match_text'] and parent_request_data['match_percent']):
            areas_to_redact = find_relevant_areas_from_response(
                parent_request_data['match_text'], 
                parent_request_data['match_percent'], 
                areas_to_redact
            )
            if len(areas_to_redact) == 0:
                continue
        if (movie_url not in aggregate_response_data):
            aggregate_response_data['movies'][movie_url] = {}
            aggregate_response_data['movies'][movie_url]['framesets'] = {}
        aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = {}
        aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash]['recognized_text_areas'] = areas_to_redact
    print('wrap_up_scan_template_threaded: wrapping up parent job')
    parent_job.status = 'success'
    parent_job.response_data = json.dumps(aggregate_response_data)
    parent_job.elapsed_time = 1
    parent_job.save()

def find_relevant_areas_from_response(match_strings, match_percent, areas_to_redact):
    relevant_areas = []
    for area in areas_to_redact:
        subject_string_was_added = False
        subject_string = area['text']
        for match_string in match_strings:
            if subject_string_was_added: 
                continue
            partial_ratio = fuzz.partial_ratio(match_string, subject_string)
            if partial_ratio >= match_percent:
                subject_string_was_added = True
                relevant_areas.append(area)
    return relevant_areas

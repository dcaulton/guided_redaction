from celery import shared_task
import json
import os
from fuzzywuzzy import fuzz
from guided_redaction.jobs.models import Job
from guided_redaction.analyze.api import (
    AnalyzeViewSetFilter, 
    AnalyzeViewSetScanTemplate,
    AnalyzeViewSetTelemetry,
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
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        print('running filter for job '+ job_uuid)
        avsf = AnalyzeViewSetFilter()
        response = avsf.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
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
    movies = request_data['target_movies']
    for index, movie_url in enumerate(movies.keys()):
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
        # intersperse these evenly in the job stack so we get regular updates
        if index % 5 == 0:
            scan_template_threaded.delay(parent_job.id)
    scan_template_threaded.delay(parent_job.id)

def wrap_up_scan_template_threaded(job, children):
    aggregate_response_data = {}
    for child in children:
        child_response_data = json.loads(child.response_data)
        if len(child_response_data.keys()) > 0:
            movie_url = list(child_response_data.keys())[0]
            aggregate_response_data[movie_url] = child_response_data[movie_url]

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
            })
            job = Job(
                request_data=child_job_request_data,
                file_uuids_used=[],
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
        if (movie_url not in aggregate_response_data):
            aggregate_response_data[movie_url] = {}
            aggregate_response_data[movie_url]['framesets'] = {}
        areas_to_redact = child_response_data['recognized_text_areas']
        aggregate_response_data[movie_url]['framesets'][frameset_hash] = {}
        if (parent_request_data['match_text'] and parent_request_data['match_percent']):
            areas_to_redact = find_relevant_areas_from_response(
                parent_request_data['match_text'], 
                parent_request_data['match_percent'], 
                areas_to_redact
            )
        aggregate_response_data[movie_url]['framesets'][frameset_hash]['recognized_text_areas'] = areas_to_redact
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

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
    AnalyzeViewSetSelectedArea,
    AnalyzeViewSetEastTess
)


def evaluate_children(operation, child_operation, children):
    all_children = 0
    completed_children = 0
    failed_children = 0
    for child in children:
        if child.operation == child_operation:
            all_children += 1
            if child.status == 'success':
                completed_children += 1
            elif child.status == 'failed':
                failed_children += 1
    print('CHILDREN FOR {}: {} COMPLETE: {} FAILED: {}'.format(
        operation, all_children, completed_children, failed_children
    ))
    if all_children == 0:
        return ('build_child_tasks', 0)
    elif all_children == completed_children:
        return ('wrap_up', 1)
    elif all_children > 0:
        complete_percent = completed_children/all_children
        return ('update_percent_complete', complete_percent)
    elif failed_children > 0:
        return ('abort', 0)

@shared_task
def scan_template(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        print('scanning template for job {}'.format(job_uuid))
        avsst = AnalyzeViewSetScanTemplate()
        response = avsst.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        request = json.loads(job.request_data)
        template_id = request['template_id']
        if ('match_method' not in request['templates'][template_id] or
            request['templates'][template_id]['match_method'] == 'any'):
            job.response_data = json.dumps(response.data)
        elif request['templates'][template_id]['match_method'] == 'all':
            built_response_data = {}
            all_anchor_keys = set([x['id'] for x in request['templates'][template_id]['anchors']])
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
            if parent_job.app == 'analyze' and parent_job.operation == 'scan_template_multi':
                scan_template_multi.delay(parent_job.id)
    else:
        print('calling scan_template on nonexistent job: {}'.format(job_uuid))

@shared_task
def filter(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        print('running filter for job {}'.format(job_uuid))
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
        print('calling get_timestamp on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running get_timestamp for job {}'.format(job_uuid))
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
        (next_step, percent_done) = evaluate_children('GET TIMESTAMP THREADED', 'get_timestamp', children)
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
def scan_template_multi(job_uuid):
    # MULTI TEMPLATE MULTI MOVIE
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('SCAN TEMPLATE MULTI', 'scan_template', children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_scan_template_multi_children(job)
        elif next_step == 'update_percent_complete':
          job.elapsed_time = percent_done
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_scan_template_multi(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_scan_template_multi_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    movies = request_data['movies']
    total_index = 0
    for template_id in request_data['templates']:
        template = request_data['templates'][template_id]
        build_templates = {}
        build_templates[template_id] = template
        for movie_url in request_data['movies']:
            total_index += 1
            build_movies = {}
            build_movies[movie_url] = movies[movie_url]
            build_request_data = json.dumps({
                'templates': build_templates,
                'template_id': template_id,
                'movies': build_movies,
            })
            job = Job(
                request_data=build_request_data,
                status='created',
                description='scan_template {} for movie {}'.format(template['name'], movie_url),
                app='analyze',
                operation='scan_template',
                sequence=0,
                elapsed_time=0.0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_scan_template_multi_children: dispatching job for movie {}'.format(movie_url))
            scan_template.delay(job.id)
            # intersperse these evenly in the job stack so we get regular updates
            if total_index % 5 == 0:
                scan_template_multi.delay(parent_job.id)
    scan_template_multi.delay(parent_job.id)

def wrap_up_scan_template_multi(job, children):
    aggregate_response_data = {
        'movies': {},
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        if not child_response_data:
            continue
        if len(child_response_data['movies'].keys()) > 0:
            movie_url = list(child_response_data['movies'].keys())[0]
            if movie_url not in aggregate_response_data['movies']:
                aggregate_response_data['movies'][movie_url] = {}
                aggregate_response_data['movies'][movie_url]['framesets'] = {}
            for frameset_hash in child_response_data['movies'][movie_url]['framesets']:
                if frameset_hash not in aggregate_response_data['movies'][movie_url]['framesets']:
                    aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = {}
                for anchor_id in child_response_data['movies'][movie_url]['framesets'][frameset_hash]:
                    aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = \
                        child_response_data['movies'][movie_url]['framesets'][frameset_hash][anchor_id]

    print('wrap_up_scan_template_multi: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.elapsed_time = 1
    job.save()

@shared_task
def scan_template_threaded(job_uuid):
    # ASSUMES WE ONLY HAVE ONE TEMPLATE
    # DOESNT EXPECT TEMPLATE ID, JUST A HASH WITH ONE TEMPLATE
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('SCAN TEMPLATE THREADED', 'scan_template', children)
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

def build_and_dispatch_scan_template_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    template_id = list(request_data['templates'].keys())[0]
    template = request_data['templates'][template_id]
    movies = request_data['movies']
    for index, movie_url in enumerate(movies):
        movie = movies.get(movie_url)
        build_movies = {}
        build_movies[movie_url] = movie
        build_templates = {}
        build_templates[template_id] = template
        request_data = json.dumps({
            'templates': build_templates,
            'template_id': template_id,
            'movies': build_movies,
        })
        job = Job(
            request_data=request_data,
            status='created',
            description='scan_template {} for movie {}'.format(template['name'], movie_url),
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
            if parent_job.app == 'analyze' and parent_job.operation == 'scan_ocr':
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
        (next_step, percent_done) = evaluate_children('SCAN OCR MOVIE', 'scan_ocr_image', children)
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

def get_ocr_roi(ocr_rule, frameset):
  roi = {}
  roi['start'] = [ocr_rule['start_coords'][0], ocr_rule['start_coords'][1]]
  roi['end'] = [ocr_rule['end_coords'][0], ocr_rule['end_coords'][1]]
  if 'location' in frameset and 'size' in frameset:
    roi['start'] = [frameset['location'][0], frameset['location'][1]]
    roi['end'] = [
        roi['start'][0] + frameset['size'][0], 
        roi['start'][1] + frameset['size'][1]
    ]
  return roi

def build_and_dispatch_scan_ocr_movie_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    ocr_rule_id = list(request_data['ocr_rules'].keys())[0]
    ocr_rule = request_data['ocr_rules'][ocr_rule_id]
    movies = request_data['movies']
    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    for movie_url in movies:
        movie = movies[movie_url]
        for index, frameset_hash in enumerate(movie['framesets'].keys()):
            frameset = movie['framesets'][frameset_hash]
            roi = get_ocr_roi(ocr_rule, frameset)
            if 'images' in frameset:
                first_image_url = frameset['images'][0]
            else:
                first_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            child_job_request_data = json.dumps({
                'movie_url': movie_url,
                'image_url': first_image_url,
                'frameset_hash': frameset_hash,
                'roi_start_x': roi['start'][0],
                'roi_start_y': roi['start'][1],
                'roi_end_x': roi['end'][0],
                'roi_end_y': roi['end'][1],
                'skip_east': ocr_rule['skip_east'],
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

def wrap_up_scan_ocr_movie(parent_job, children):
    parent_request_data = json.loads(parent_job.request_data)
    ocr_rule_id = list(parent_request_data['ocr_rules'].keys())[0]
    ocr_rule = parent_request_data['ocr_rules'][ocr_rule_id]
    aggregate_response_data = {}
    print('========================== WRAPPING UP OCR')
    for child in children:
        child_response_data = json.loads(child.response_data)
        if not child_response_data:
            continue
        child_request_data = json.loads(child.request_data)
        frameset_hash = child_request_data['frameset_hash']
        movie_url = child_request_data['movie_url']
        print('--------looking at ocr results for {}'.format(movie_url.split('/')[-1]))
        if ('movies' not in aggregate_response_data):
            aggregate_response_data['movies'] = {}
        areas_to_redact = child_response_data
        if (ocr_rule['match_text'] and ocr_rule['match_percent']):
            areas_to_redact = find_relevant_areas_from_response(
                ocr_rule['match_text'], 
                int(ocr_rule['match_percent']), 
                areas_to_redact
            )
            if len(areas_to_redact) == 0:
                continue
        if (movie_url not in aggregate_response_data['movies']):
            aggregate_response_data['movies'][movie_url] = {}
            aggregate_response_data['movies'][movie_url]['framesets'] = {}
        aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = areas_to_redact
    print('wrap_up_scan_template_threaded: wrapping up parent job')
    parent_job.status = 'success'
    parent_job.response_data = json.dumps(aggregate_response_data)
    parent_job.elapsed_time = 1
    parent_job.save()

def find_relevant_areas_from_response(match_strings, match_percent, areas_to_redact):
    relevant_areas = {}
    for a2r_key in areas_to_redact:
        area = areas_to_redact[a2r_key]
        subject_string = area['text']
        for pattern in match_strings:
            pattern_length = len(pattern)
            subject_string_length = len(subject_string)
            num_compares = subject_string_length - pattern_length + 1
            if pattern_length > subject_string_length:
                ratio = fuzz.ratio(pattern, subject_string)
                if ratio >= match_percent:
                    relevant_areas.append(area)
                    continue
            for i in range(num_compares):
                ratio = fuzz.ratio(pattern, subject_string[i:i+pattern_length])
                if ratio >= match_percent:
                    relevant_areas[a2r_key] = area
                    continue
    return relevant_areas

@shared_task
def selected_area(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling selected_area on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running selected_area for job {}'.format(job_uuid))
    worker = AnalyzeViewSetSelectedArea()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'selected_area_threaded':
            selected_area_threaded.delay(parent_job.id)

@shared_task
def selected_area_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('SELECTED AREA THREADED', 'selected_area', children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_selected_area_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.elapsed_time = percent_done
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_selected_area_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_selected_area_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    selected_area_metas = request_data['selected_area_metas']
    movies = request_data['movies']
    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    for selected_area_meta_id in selected_area_metas:
        selected_area_meta = selected_area_metas[selected_area_meta_id]
        for index, movie_url in enumerate(movies.keys()):
            movie = movies[movie_url]
            build_movies = {}
            build_movies[movie_url] = movie
            if source_movies:
                build_movies['source'] = source_movies
            build_request_data = json.dumps({
                'movies': build_movies,
                'selected_area_meta': selected_area_meta,
            })
            job = Job(
                request_data=build_request_data,
                status='created',
                description='get selected area for movie {}'.format(movie_url),
                app='analyze',
                operation='selected_area',
                sequence=0,
                elapsed_time=0.0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_selected_area_threaded_children: dispatching job for movie {}'.format(movie_url))
            selected_area.delay(job.id)

def wrap_up_selected_area_threaded(job, children):
    aggregate_response_data = {
      'movies': {}
    }
    for child in children:
        child_response_movies = json.loads(child.response_data)['movies']
        if len(child_response_movies.keys()) > 0:
            movie_url = list(child_response_movies.keys())[0]
            aggregate_response_data['movies'][movie_url] = child_response_movies[movie_url]

    print('wrap_up_selected_area_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.elapsed_time = 1
    job.save()


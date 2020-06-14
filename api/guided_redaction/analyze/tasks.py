from celery import shared_task
import random
import time
import uuid
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
import json
import os
from fuzzywuzzy import fuzz
from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import PipelinesViewSetDispatch
from guided_redaction.analyze.api import (
    AnalyzeViewSetFilter, 
    AnalyzeViewSetScanTemplate,
    AnalyzeViewSetTelemetry,
    AnalyzeViewSetTimestamp,
    AnalyzeViewSetSelectedArea,
    AnalyzeViewSetEntityFinder,
    AnalyzeViewSetOcrSceneAnalysis,
    AnalyzeViewSetOcrMovieAnalysis,
    AnalyzeViewSetTemplateMatchChart,
    AnalyzeViewSetOcrMatchChart,
    AnalyzeViewSetOcrSceneAnalysisChart,
    AnalyzeViewSetSelectedAreaChart,
    AnalyzeViewSetTrainHog,
    AnalyzeViewSetTestHog,
    AnalyzeViewSetOcr
)


def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects.filter(job=job, name='pipeline_job_link').first().pipeline

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
        template_id = list(request['tier_1_scanners']['template'].keys())[0]
        if ('match_method' not in request['tier_1_scanners']['template'][template_id] or
            request['tier_1_scanners']['template'][template_id]['match_method'] == 'any'):
            job.response_data = json.dumps(response.data)
        elif request['tier_1_scanners']['template'][template_id]['match_method'] == 'all':
            built_response_data = {}
            all_anchor_keys = set([x['id'] for x in request['tier_1_scanners']['template'][template_id]['anchors']])
            raw_response = response.data
            for movie_url in raw_response.keys():
                built_response_data[movie_url] = {}
                for frameset_hash in raw_response[movie_url].keys():
                    anchor_matches = raw_response[movie_url][frameset_hash]
                    anchor_match_keys = set(raw_response[movie_url][frameset_hash].keys())
                    if anchor_match_keys == all_anchor_keys:
                        built_response_data[movie_url][frameset_hash] = \
                            raw_response[movie_url][frameset_hash]
            # TODO get this to respect save_match_statistics
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
          job.update_percent_complete(percent_done)
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
    job.update_percent_complete(1)
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
          job.update_percent_complete(percent_done)
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
    for template_id in request_data['tier_1_scanners']['template']:
        template = request_data['tier_1_scanners']['template'][template_id]
        build_templates = {}
        build_templates[template_id] = template
        for movie_url in request_data['movies']:
            total_index += 1
            build_movies = {}
            build_movies[movie_url] = movies[movie_url]
            build_request_data = json.dumps({
                'tier_1_scanners': {
                    'templates': build_templates,
                },
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
    job.update_percent_complete(1)
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
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_scan_template_threaded(job, children)
          pipeline = get_pipeline_for_job(job.parent)
          if pipeline:
              worker = PipelinesViewSetDispatch()
              worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_scan_template_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    template_id = list(request_data['tier_1_scanners']['template'].keys())[0]
    template = request_data['tier_1_scanners']['template'][template_id]
    movies = request_data['movies']
    for index, movie_url in enumerate(movies):
        if movie_url == 'source':
            continue
        movie = movies.get(movie_url)
        build_movies = {}
        build_movies[movie_url] = movie
        if 'source' in movies:
            source_movie = movies['source'][movie_url]
            build_movies['source'] = {}
            build_movies['source'][movie_url] = source_movie
        build_templates = {}
        build_templates[template_id] = template
        request_data = json.dumps({
            'tier_1_scanners': {
                'template': build_templates,
            },
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
            parent=parent_job,
        )
        job.save()
        print('build_and_dispatch_scan_template_thread_children: dispatching job for movie {}'.format(movie_url))
        scan_template.delay(job.id)
        # intersperse these evenly in the job stack so we get regular updates
        if index % 5 == 0:
            scan_template_threaded.delay(parent_job.id)
    scan_template_threaded.delay(parent_job.id)

def aggregate_statistics_from_template_child(aggregate_response_data, child_response_data):
    if 'statistics' in child_response_data:
        for movie_url in child_response_data['statistics']['movies']:
            if movie_url not in aggregate_response_data['statistics']:
                aggregate_response_data['statistics']['movies'][movie_url] = {'framesets': {}}
            crd_framesets = \
                child_response_data['statistics']['movies'][movie_url]['framesets']
            ard_stats_framesets = \
                aggregate_response_data['statistics']['movies'][movie_url]['framesets']
            for frameset_hash in crd_framesets:
                if frameset_hash not in ard_stats_framesets:
                    aggregate_response_data['statistics']['movies'][movie_url]['framesets'][frameset_hash] = {}
                for anchor_id in crd_framesets[frameset_hash]:
                    aggregate_response_data['statistics']['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = crd_framesets[frameset_hash][anchor_id]

def wrap_up_scan_template_threaded(job, children):
    aggregate_response_data = {
        'movies': {},
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        if 'statistics' in child_response_data and 'statistics' not in aggregate_response_data:
            aggregate_response_data['statistics'] = {'movies': {}}
        if not child_response_data:
            continue
        if len(child_response_data['movies'].keys()) > 0:
            movie_url = list(child_response_data['movies'].keys())[0]
            aggregate_response_data['movies'][movie_url] = child_response_data['movies'][movie_url]
        aggregate_statistics_from_template_child(aggregate_response_data, child_response_data)

    print('wrap_up_scan_template_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.update_percent_complete(1)
    job.save()

@shared_task
def scan_ocr_image(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
        scanner = AnalyzeViewSetOcr()
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
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_scan_ocr_movie(job, children)
          pipeline = get_pipeline_for_job(job.parent)
          if pipeline:
              worker = PipelinesViewSetDispatch()
              worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_scan_ocr_movie_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    ocr_rule_id = list(request_data['tier_1_scanners']['ocr'].keys())[0]
    ocr_rule = request_data['tier_1_scanners']['ocr'][ocr_rule_id]
    movies = request_data['movies']
    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    for movie_url in movies:
        movie = movies[movie_url]
        for index, frameset_hash in enumerate(movie['framesets'].keys()):
            frameset = movie['framesets'][frameset_hash]
            if 'images' in frameset:
                first_image_url = frameset['images'][0]
            else:
                first_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            child_job_request_data = json.dumps({
                'movie_url': movie_url,
                'image_url': first_image_url,
                'frameset_hash': frameset_hash,
                'ocr_rule': ocr_rule,
                'tier_1_data': frameset,
            })
            job = Job(
                request_data=child_job_request_data,
                status='created',
                description='scan_ocr for frameset {}'.format(frameset_hash),
                app='analyze',
                operation='scan_ocr_image',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_scan_ocr_movie_children: dispatching job for frameset {}'.format(frameset_hash))
            scan_ocr_image.delay(job.id)
            # intersperse these evenly in the job stack so we get regular updates
            if index % 5 == 0:
                scan_ocr_movie.delay(parent_job.id)

def wrap_up_scan_ocr_movie(parent_job, children):
    parent_request_data = json.loads(parent_job.request_data)
    ocr_rule_id = list(parent_request_data['tier_1_scanners']['ocr'].keys())[0]
    ocr_rule = parent_request_data['tier_1_scanners']['ocr'][ocr_rule_id]
    aggregate_response_data = {}
    aggregate_stats = {'movies': {}}
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
        areas_to_redact = child_response_data
        if (ocr_rule['match_text'] and ocr_rule['match_percent']):
            if 'match_percent' not in aggregate_stats:
                aggregate_stats['match_percent'] = ocr_rule['match_percent']
            if movie_url not in aggregate_stats['movies']:
                aggregate_stats['match_percent'] = ocr_rule['match_percent']
                aggregate_stats['movies'][movie_url] = {'framesets': {}}
            (areas_to_redact, match_percentages) = find_relevant_areas_from_response(
                ocr_rule['match_text'], 
                int(ocr_rule['match_percent']), 
                areas_to_redact
            )
            aggregate_stats['movies'][movie_url]['framesets'][frameset_hash] = match_percentages
            if len(areas_to_redact) == 0:
                continue
        if (movie_url not in aggregate_response_data['movies']):
            aggregate_response_data['movies'][movie_url] = {}
            aggregate_response_data['movies'][movie_url]['framesets'] = {}
        aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = areas_to_redact
    aggregate_response_data['statistics'] = aggregate_stats
    print('wrap_up_scan_template_threaded: wrapping up parent job')
    parent_job.status = 'success'
    parent_job.response_data = json.dumps(aggregate_response_data)
    parent_job.update_percent_complete(1)
    parent_job.save()

def find_relevant_areas_from_response(match_strings, match_percent, areas_to_redact):
    relevant_areas = {}
    match_percentages = {}
    for a2r_key in areas_to_redact:
        area = areas_to_redact[a2r_key]
        subject_string = area['text']
        for pattern in match_strings:
            if pattern not in match_percentages:
                match_percentages[pattern] = {'percent': 0}
            pattern_length = len(pattern)
            subject_string_length = len(subject_string)
            num_compares = subject_string_length - pattern_length + 1
            if pattern_length > subject_string_length:
                ratio = fuzz.ratio(pattern, subject_string)
                if ratio > match_percentages[pattern]['percent']:
                    match_percentages[pattern]['percent'] = ratio
                if ratio >= match_percent:
                    relevant_areas.append(area)
                    continue
            for i in range(num_compares):
                ratio = fuzz.ratio(pattern, subject_string[i:i+pattern_length])
                if ratio > match_percentages[pattern]['percent']:
                    match_percentages[pattern]['percent'] = ratio
                if ratio >= match_percent:
                    relevant_areas[a2r_key] = area
                    continue
    return (relevant_areas, match_percentages)

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
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_selected_area_threaded(job, children)
          pipeline = get_pipeline_for_job(job.parent)
          if pipeline:
              worker = PipelinesViewSetDispatch()
              worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_selected_area_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    selected_area_metas = request_data['tier_1_scanners']['selected_area']
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
    job.update_percent_complete(1)
    job.save()

@shared_task
def template_match_chart(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling template_match_chart on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running template_match_chart for job {}'.format(job_uuid))

    req_obj = json.loads(job.request_data)
    build_job_data = {}
    if 'job_ids' in req_obj:
        for job_id in req_obj['job_ids']:
            job = Job.objects.get(pk=job_id)
            build_job_data[job_id] = {
                'request_data': json.loads(job.request_data),
                'response_data': json.loads(job.response_data),
            }


    worker = AnalyzeViewSetTemplateMatchChart()
    response = worker.process_create_request({
        'job_data': build_job_data,
    })
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def ocr_match_chart(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ocr_match_chart on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running ocr_match_chart for job {}'.format(job_uuid))

    req_obj = json.loads(job.request_data)
    build_job_data = {}
    if 'job_ids' in req_obj:
        for job_id in req_obj['job_ids']:
            job = Job.objects.get(pk=job_id)
            build_job_data[job_id] = {
                'request_data': json.loads(job.request_data),
                'response_data': json.loads(job.response_data),
            }


    worker = AnalyzeViewSetOcrMatchChart()
    response = worker.process_create_request({
        'job_data': build_job_data,
    })
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def selected_area_chart(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling selected_area_chart on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running selected_area_chart for job {}'.format(job_uuid))

    req_obj = json.loads(job.request_data)
    build_job_data = {}
    if 'job_ids' in req_obj:
        for job_id in req_obj['job_ids']:
            job = Job.objects.get(pk=job_id)
            build_job_data[job_id] = {
                'request_data': json.loads(job.request_data),
                'response_data': json.loads(job.response_data),
            }


    worker = AnalyzeViewSetSelectedAreaChart()
    response = worker.process_create_request({
        'job_data': build_job_data,
    })
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def ocr_scene_analysis_chart(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ocr_scene_analysis_chart on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running ocr_scene_analysis_chart for job {}'.format(job_uuid))

    req_obj = json.loads(job.request_data)
    build_job_data = {}
    if 'job_ids' in req_obj:
        for job_id in req_obj['job_ids']:
            job = Job.objects.get(pk=job_id)
            build_job_data[job_id] = {
                'request_data': json.loads(job.request_data),
                'response_data': json.loads(job.response_data),
            }


    worker = AnalyzeViewSetOcrSceneAnalysisChart()
    response = worker.process_create_request({
        'job_data': build_job_data,
    })
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def ocr_scene_analysis(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ocr_scene_analysis on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running ocr_scene_analysis for job {}'.format(job_uuid))
    worker = AnalyzeViewSetOcrSceneAnalysis()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'ocr_scene_analysis_threaded':
            ocr_scene_analysis_threaded.delay(parent_job.id)

@shared_task
def ocr_scene_analysis_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('OCR SCENE ANALYSIS THREADED', 'ocr_scene_analysis', children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_ocr_scene_analysis_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_ocr_scene_analysis_threaded(job, children)
          pipeline = get_pipeline_for_job(job.parent)
          if pipeline:
              worker = PipelinesViewSetDispatch()
              worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_ocr_scene_analysis_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    osas = request_data['tier_1_scanners']['ocr_scene_analysis']
    movies = request_data['movies']
    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    for osa_id in osas:
        osa = osas[osa_id]
        for index, movie_url in enumerate(movies.keys()):
            movie = movies[movie_url]
            build_movies = {}
            build_movies[movie_url] = movie
            if source_movies:
                build_movies['source'] = source_movies
            build_request_data = json.dumps({
                'movies': build_movies,
                'ocr_scene_analysis_meta': osa,
            })
            job = Job(
                request_data=build_request_data,
                status='created',
                description='ocr scene analysis for movie {}'.format(movie_url),
                app='analyze',
                operation='ocr_scene_analysis',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_ocr_scene_analysis_threaded_children: dispatching job for movie {}'.format(movie_url))
            ocr_scene_analysis.delay(job.id)

def wrap_up_ocr_scene_analysis_threaded(job, children):
    aggregate_response_data = {
      'movies': {}
    }
    aggregate_stats = {'movies': {}}
    for child in children:
        child_response_movies = json.loads(child.response_data)['movies']
        child_stats = json.loads(child.response_data)['statistics']
        if len(child_response_movies.keys()) > 0:
            movie_url = list(child_response_movies.keys())[0]
            aggregate_response_data['movies'][movie_url] = child_response_movies[movie_url]
            if movie_url not in aggregate_stats['movies']:
                aggregate_stats['movies'][movie_url] = {'framesets': {}}
            for frameset_hash in child_stats['movies'][movie_url]['framesets']:
                aggregate_stats['movies'][movie_url]['framesets'][frameset_hash] = \
                    child_stats['movies'][movie_url]['framesets'][frameset_hash]

    aggregate_response_data['statistics'] = aggregate_stats
    print('wrap_up_ocr_scene_analysis_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.update_percent_complete(1)
    job.save()





@shared_task
def oma_first_scan_collect_one_frame(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling oma_first_scan_collect_one_frame on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running oma_first_scan_collect_one_frame for job {}'.format(job_uuid))
    worker = AnalyzeViewSetOcrMovieAnalysis()
    rd = json.loads(job.request_data)
    response = worker.process_first_scan_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'oma_first_scan_threaded':
            oma_first_scan_threaded.delay(parent_job.id)

@shared_task
def ocr_movie_analysis_condense_all_frames(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ocr_movie_analysis_condense_all_frames on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running ocr_movie_analysis_condense_all_frames for job {}'.format(job_uuid))
    worker = AnalyzeViewSetOcrMovieAnalysis()
    rd = json.loads(job.request_data)
    response = worker.process_condense_all_frames_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

@shared_task
def oma_first_scan_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children(
            'OCR MOVIE ANALYSIS FIRST SCAN THREADED', 
            'oma_first_scan_collect_one_frame', 
            children
        )
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_oma_first_scan_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_oma_first_scan_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_oma_first_scan_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    oma_key = list(request_data['tier_1_scanners']['ocr_movie_analysis'].keys())[0]
    oma_rule = request_data['tier_1_scanners']['ocr_movie_analysis'][oma_key]
    if 'skip_frames' in oma_rule:
        skip_frames = int(oma_rule['skip_frames'])
    else:
        skip_frames = 10
    if oma_rule['debug_level'] != 'everything':
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        the_uuid = str(uuid.uuid4())
        file_writer.create_unique_directory(the_uuid)
        oma_rule['debug_directory'] = the_uuid

    for movie_url in request_data['movies']:
        for frameset_index, frameset_hash in enumerate(request_data['movies'][movie_url]['framesets']):
            if frameset_index % skip_frames != 0:
                continue
            build_request_data = {'movies': {}}
            build_request_data['movies'][movie_url] = {}
            build_request_data['movies'][movie_url]['framesets'] = {}
            build_request_data['movies'][movie_url]['framesets'][frameset_hash] = \
                request_data['movies'][movie_url]['framesets'][frameset_hash]
            build_request_data['oma_rule'] = oma_rule
            job = Job(
                request_data=json.dumps(build_request_data),
                status='created',
                description='oma first scan for movie {} frameset hash {}'.format(movie_url, frameset_hash),
                app='analyze',
                operation='oma_first_scan_collect_one_frame',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_oma_first_scan_threaded_children: dispatching job for movie {} frameset {}'.format(movie_url, frameset_hash))
            oma_first_scan_collect_one_frame.delay(job.id)
            if frameset_index % 5 == 0:
                oma_first_scan_threaded.delay(parent_job.id)
        oma_first_scan_threaded.delay(parent_job.id)

def get_image_url_from_request(request_obj):
    if 'movies' in request_obj:
        movie_url = list(request_obj['movies'].keys())[0]
        frameset_hash = list(request_obj['movies'][movie_url]['framesets'].keys())[0]
        image_url = request_obj['movies'][movie_url]['framesets'][frameset_hash]['images'][0]
        return image_url

def wrap_up_oma_first_scan_threaded(parent_job, children):
    aggregate_response_data = {
      'movies': {},
      'apps': {},
      'rta_dict': {},
      'sorted_rtas': {},
    }
    print('wrap_up_oma_first_scan_threaded: wrapping up parent job')
    children = Job.objects.filter(parent=parent_job).order_by('created_on')
    build_movie = {'framesets':{}, 'frames': []}
    for child_counter, child in enumerate(children):
         child_response = json.loads(child.response_data)
         image_url = child_response['apps_image_url']
         source_image_url = get_image_url_from_request(json.loads(child.request_data))
         build_frameset = {
             'images': [image_url],
             'source_image': source_image_url,
         }
         build_movie['frames'].append(image_url)
         build_movie['framesets'][child_counter] = build_frameset
    aggregate_response_data['movies']['first_scan_apps'] = build_movie
    parent_job.status = 'success'
    parent_job.update_percent_complete(1)
    parent_job.response_data = json.dumps(aggregate_response_data)
    parent_job.save()


@shared_task
def entity_finder(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling entity_finder on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running entity_finder for job {}'.format(job_uuid))
    worker = AnalyzeViewSetEntityFinder()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'entity_finder_threaded':
            entity_finder_threaded.delay(parent_job.id)

@shared_task
def entity_finder_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('ENTITY FINDER THREADED', 'entity_finder', children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_child_tasks':
          build_and_dispatch_entity_finder_threaded_children(job)
        elif next_step == 'update_percent_complete':
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_entity_finder_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def build_and_dispatch_entity_finder_threaded_children(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    efs = request_data['tier_1_scanners']['entity_finder']
    movies = request_data['movies']
    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    for ef_id in efs:
        entity_finder_meta = efs[ef_id]
        for index, movie_url in enumerate(movies.keys()):
            movie = movies[movie_url]
            build_movies = {}
            build_movies[movie_url] = movie
            if source_movies:
                build_movies['source'] = source_movies
            build_request_data = json.dumps({
                'movies': build_movies,
                'entity_finder_meta': entity_finder_meta,
            })
            job = Job(
                request_data=build_request_data,
                status='created',
                description='entity finder for movie {}'.format(movie_url),
                app='analyze',
                operation='entity_finder',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_entity_finder_threaded_children: dispatching job for movie {}'.format(movie_url))
            entity_finder.delay(job.id)

def wrap_up_entity_finder_threaded(job, children):
    aggregate_response_data = {
      'movies': {}
    }
    aggregate_stats = {'movies': {}}
    for child in children:
        child_response_movies = json.loads(child.response_data)['movies']
        child_stats = json.loads(child.response_data)['statistics']
        if len(child_response_movies.keys()) > 0:
            movie_url = list(child_response_movies.keys())[0]
            aggregate_response_data['movies'][movie_url] = child_response_movies[movie_url]
            if movie_url not in aggregate_stats['movies']:
                aggregate_stats['movies'][movie_url] = {'framesets': {}}
            for frameset_hash in child_stats['movies'][movie_url]['framesets']:
                aggregate_stats['movies'][movie_url]['framesets'][frameset_hash] = \
                    child_stats['movies'][movie_url]['framesets'][frameset_hash]

    aggregate_response_data['statistics'] = aggregate_stats
    print('wrap_up_entity_finder_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.update_percent_complete(1)
    job.save()

@shared_task
def test_hog(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling test_hog on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running test_hog for job {}'.format(job_uuid))
    worker = AnalyzeViewSetTestHog()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
        return
    print('test_hog is complete')
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'hog_train_threaded':
            train_hog_threaded.delay(parent_job.id)

@shared_task
def train_hog(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling train_hog on nonexistent job: {}'.format(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    print('running train_hog for job {}'.format(job_uuid))
    worker = AnalyzeViewSetTrainHog()
    rd = json.loads(job.request_data)
    response = worker.process_create_request(rd)
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    print('train_hog is complete')
    job = Job.objects.get(pk=job_uuid)
    job.response_data = json.dumps(response.data)
    job.status = 'success'
    job.save()

    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'hog_train_threaded':
            train_hog_threaded.delay(parent_job.id)

@shared_task
def train_hog_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_train_hog_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_train_task':
          build_and_dispatch_train_hog(job)
        elif next_step == 'build_test_tasks':
          build_and_dispatch_test_hog(job, children)
        elif next_step == 'update_percent_complete':
          job.update_percent_complete(percent_done)
          job.save()
        elif next_step == 'wrap_up':
          wrap_up_train_hog_threaded(job, children)
        elif next_step == 'abort':
          job.status = 'failed'
          job.save()

def wrap_up_train_hog_threaded(job, children):
    aggregate_response_data = {
      'movies': {}
    }
    aggregate_stats = {'movies': {}}
    hog_rule = ''
    for child in children:
        if child.operation == 'hog_test':
            if not hog_rule:
                # get the hog rule so we know classifier_path and features_path from training phase
                child_req_data = json.loads(child.request_data)
                hog_id = list(child_req_data['tier_1_scanners']['hog'].keys())[0]
                hog_rule = child_req_data['tier_1_scanners']['hog'][hog_id]
                aggregate_response_data['tier_1_scanners'] = {'hog': {}}
                aggregate_response_data['tier_1_scanners']['hog'][hog_id] = hog_rule
            child_response_movies = json.loads(child.response_data)['movies']
            child_stats = json.loads(child.response_data)['statistics']
            # iterate through all the hits and stats we have for test images
            if len(child_response_movies.keys()) > 0:
                movie_url = list(child_response_movies.keys())[0]
                if movie_url not in aggregate_stats['movies']:
                    aggregate_stats['movies'][movie_url] = {'framesets': {}}
                if movie_url not in aggregate_response_data['movies']:
                    aggregate_response_data['movies'][movie_url] = {'framesets': {}}
                for frameset_hash in child_response_movies[movie_url]['framesets']:
                    frameset = child_response_movies[movie_url]['framesets'][frameset_hash]
                    aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = frameset
                for frameset_hash in child_stats['movies'][movie_url]['framesets']:
                    aggregate_stats['movies'][movie_url]['framesets'][frameset_hash] = \
                        child_stats['movies'][movie_url]['framesets'][frameset_hash]

    aggregate_response_data['statistics'] = aggregate_stats
    print('wrap_up_train_hog_threaded: wrapping up parent job')
    job.status = 'success'
    job.response_data = json.dumps(aggregate_response_data)
    job.update_percent_complete(1)
    job.save()

def evaluate_train_hog_children(children):
    train_success = False
    train_failed = False
    train_running = False
    if not children:
        return('build_train_task', 0)
    for child in children:
        if child.operation == 'hog_train':
            if child.status == 'success':
                train_success = True
            if child.status == 'failed':
                train_failed = True
            if child.status == 'running':
                train_running = True
    if train_running: 
        return('update_percent_complete', 0)
    if train_failed:
        return('abort', 1)
    if train_success and len(children) == 1:
        return('build_test_tasks', .5)

    test_children = 0
    test_complete_children = 0
    test_failed_children = 0

    for child in children:
        if child.operation == 'hog_test':
            test_children += 1
            if child.status == 'success':
                test_complete_children += 1
            elif child.status == 'failed':
                test_failed_children += 1
    if test_children == test_complete_children:
        return('wrap_up', 1)
    percent_done = .5 + (.5 * (test_complete_children / test_children))
    return('update_percent_complete', percent_done)


def build_and_dispatch_train_hog(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    job = Job(
        request_data=parent_job.request_data,
        status='created',
        description='train hog subtask',
        app='analyze',
        operation='hog_train',
        sequence=0,
        parent=parent_job,
    )
    job.save()
    print('build_and_dispatch_train_hog: dispatching job')
    train_hog.delay(job.id)

def get_hog_files(hog_rule, children):
    for child in children:
        if child.operation == 'hog_train':
            child_response = json.loads(child.response_data)
            hog_rule['features_path'] = child_response['features_path']
            hog_rule['classifier_path'] = child_response['classifier_path']
            return

def build_and_dispatch_test_hog(parent_job, children):
    print('building and dispatching test hog tasks')
    parent_job.status = 'running'
    parent_job.update_percent_complete(.5)
    parent_job.save()
    parent_request_data = json.loads(parent_job.request_data)
    movies = parent_request_data['movies']
    hog_id = list(parent_request_data['tier_1_scanners']['hog'].keys())[0]
    hog_rule = parent_request_data['tier_1_scanners']['hog'][hog_id]
    get_hog_files(hog_rule, children)
    training_movies_images = get_training_image_urls(hog_rule)
    random_offset = random.randrange(0, int(hog_rule['testing_image_skip_factor']))
    print('random offset for training frames is {}'.format(random_offset))
    for movie_url in movies:
        movie = movies[movie_url]
        for frameset_index, frameset_hash in enumerate(movie['framesets']):
            frameset = movie['framesets'][frameset_hash]
            image_url = frameset['images'][0]
            if movie_url in training_movies_images \
                and image_url in training_movies_images[movie_url]:
                # skip - its a training image
                continue
            if (frameset_index + random_offset) % int(hog_rule['testing_image_skip_factor']) != 0:
                # skip because of skip factor
                continue
            build_movies = {}
            build_movies[movie_url] = {'framesets': {}}
            build_movies[movie_url]['framesets'][frameset_hash] = frameset
            build_t1_scanners = {}
            build_t1_scanners['hog'] = {}
            build_t1_scanners['hog'][hog_id] = hog_rule
            build_request_obj = {
                'movies': build_movies,
                'tier_1_scanners': build_t1_scanners,
            }

            job = Job(
                request_data=json.dumps(build_request_obj),
                status='created',
                description='test hog subtask',
                app='analyze',
                operation='hog_test',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            print('build_and_dispatch_test_hog: dispatching job')
            test_hog.delay(job.id)
    print('build and dispatch test hog is complete')
    
def get_training_image_urls(hog_rule):
    resp_data = {}
    for ti_key in hog_rule['training_images']:
        ti = hog_rule['training_images'][ti_key]
        if ti['movie_url'] not in resp_data:
            resp_data[ti['movie_url']] = {}
        resp_data[ti['movie_url']][ti['image_url']] = 1
    for hn_key in hog_rule['hard_negatives']:
        hn = hog_rule['hard_negatives'][hn_key]
        if hn['movie_url'] not in resp_data:
            resp_data[hn['movie_url']] = {}
        resp_data[hn['movie_url']][hn['image_url']] = 1
    return resp_data

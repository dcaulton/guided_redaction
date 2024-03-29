import math
from celery import shared_task
import random
import time
import uuid
from django.conf import settings
import json
import os

from django.db import transaction
from guided_redaction.jobs.models import Job
from guided_redaction.utils.task_shared import (
    evaluate_children,
    job_has_anticipated_operation_count_attribute,
    make_anticipated_operation_count_attribute_for_job,
    job_is_wrapping_up,
    get_pipeline_for_job
)
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.controller_dispatch import DispatchController
from guided_redaction.analyze.api import (
    AnalyzeViewSetChart,
    AnalyzeViewSetFilter, 
    AnalyzeViewSetScanTemplate,
    AnalyzeViewSetTimestamp,
    AnalyzeViewSetSelectedArea,
    AnalyzeViewSetMeshMatch,
    AnalyzeViewSetSelectionGrower,
    AnalyzeViewSetTrainHog,
    AnalyzeViewSetTestHog,
    AnalyzeViewSetManualCompileDataSifter,
    AnalyzeViewSetIntersect,
    AnalyzeViewSetDataSifter,
    AnalyzeViewSetT1Filter,
    AnalyzeViewSetFocusFinder,
    AnalyzeViewSetDiff,
    AnalyzeViewSetFeature,
    AnalyzeViewSetTrainFeatureWorker,
    AnalyzeViewSetOcr
)


ocr_batch_size = getattr(settings, 'REDACT_OCR_BATCH_SIZE', 20)
template_batch_size = getattr(settings, 'REDACT_TEMPLATE_BATCH_SIZE', 10)
sg_batch_size_with_ocr = 10
sg_batch_size_no_ocr = 100

def dispatch_parent_job(job):
    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'analyze' and parent_job.operation == 'template_threaded':
            template_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'scan_template_multi':
            scan_template_multi.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'get_timestamp_threaded':
            get_timestamp_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'ocr_threaded':
            ocr_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'selected_area_threaded':
            selected_area_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'mesh_match_threaded':
            mesh_match_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'selection_grower_threaded':
            selection_grower_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'data_sifter_threaded':
            data_sifter_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'focus_finder_threaded':
            focus_finder_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'diff_threaded':
            diff_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'feature_threaded':
            feature_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'hog_train_threaded':
            train_hog_threaded.delay(parent_job.id)
        if parent_job.app == 'analyze' and parent_job.operation == 'oma_first_scan_threaded':
            oma_first_scan_threaded.delay(parent_job.id)

def build_and_dispatch_generic_batched_threaded_children(
    parent_job,
    scanner_type,
    batch_size,
    operation_name,
    finish_operation_function,
    child_task
):
    if parent_job.status != 'running': 
        Job.objects.filter(pk=parent_job.id).update(status='running')
        parent_job = Job.objects.get(pk=parent_job.id)
    if parent_job.request_data_path and len(parent_job.request_data) < 3:
        parent_job.get_data_from_cache()
    request_data = json.loads(parent_job.request_data)
    scanners = request_data['tier_1_scanners'][scanner_type]
    print(f"scanners found: {scanners} for {parent_job.operation} {parent_job.pk}")
    movies = request_data['movies']
    source_movies = {}

    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
        # there are cases where the ONLY movies we get into a t1 scanner
        # are source movies. (in this case a pipeline, using its main input
        # as input to a particular node) when so upgrade them to regular movies
        if not movies:
            movies = source_movies

    if len(movies) == 0:
        print(
            f"Not dispatching children because "
            f"no movies in request data of {parent_job.operation} {parent_job.pk}"
        )
        finish_operation_function(parent_job)
        return

    num_jobs = 0
    for index, movie_url in enumerate(movies.keys()):
        movie = movies[movie_url]
        num_jobs += math.ceil(len(movie['framesets']) / batch_size)
    if not job_has_anticipated_operation_count_attribute(parent_job) and num_jobs > 1:
        make_anticipated_operation_count_attribute_for_job(parent_job, num_jobs)
    print(f'dispatch generic batched threaded: preparing to dispatch {num_jobs} jobs')

    job_ids_to_dispatch = []
    with transaction.atomic():
        for scanner_id in scanners:
            scanner = scanners[scanner_id]
            if target_wants_ocr_data(operation_name, scanner):
                prescanned_ocr_results = get_prescanned_ocr_data(scanner)
            build_t1_scanner_obj = {}
            build_t1_scanner_obj[scanner_type] = {scanner_id: scanner}
            for index, movie_url in enumerate(movies.keys()):
                if movie_url == 'source':
                    continue
                movie = movies[movie_url]
                num_jobs = math.ceil(len(movie['framesets']) / batch_size)
                if 'frames' in movie and movie['frames']:
                    frames = movie['frames']
                    framesets = movie['framesets']
                elif movie_url in source_movies:
                    frames = source_movies[movie_url]['frames']
                    framesets = source_movies[movie_url]['framesets']
                else:
                    print(
                        f"No frames to work on {parent_job.operation} {parent_job.pk}"
                    )
                    return # nothing to work on
                hashes_in_order = get_frameset_hashes_in_order(frames, framesets, movie)

                for i in range(num_jobs):
                    start_point = i * batch_size
                    end_point = ((i+1) * batch_size)
                    if i == (num_jobs-1):
                        end_point = len(movie['framesets'])
                    build_obj = {
                        'tier_1_scanners': build_t1_scanner_obj,
                        'movies': {},
                    }
                    build_obj['movies'][movie_url] = {
                        'framesets': {},
                        'frames': [],
                    }

                    hashes_to_use = hashes_in_order[start_point:end_point]
                    for frameset_hash in hashes_to_use:
                        build_obj['movies'][movie_url]['framesets'][frameset_hash] = \
                            movie['framesets'][frameset_hash]
                        if movie_is_full_movie(movie):
                            build_obj['movies'][movie_url]['frames'] += \
                                movie['framesets'][frameset_hash]['images']
                        else:
                            build_obj['movies'][movie_url]['frames'] += \
                                source_movies[movie_url]['framesets'][frameset_hash]['images']
                    if not movie_is_full_movie(movie):
                        build_obj['movies']['source'] = {}
                        build_obj['movies']['source'][movie_url] = \
                            source_movies[movie_url]
                    if target_wants_ocr_data(operation_name, scanner):
                        add_ocr_data(build_obj['movies'], prescanned_ocr_results)
                    build_request_data = json.dumps(build_obj)
                    job = Job(
                        request_data=build_request_data,
                        status='created',
                        description=operation_name + ' for movie {}'.format(movie_url),
                        app='analyze',
                        operation=operation_name,
                        sequence=0,
                        parent=parent_job,
                    )
                    job.save()
                    print(
                        'build_and_dispatch batched threaded children for '
                        f'{scanner_type}: dispatching job for movie {movie_url}'
                    )
                    job_ids_to_dispatch.append(job.id)
    for job_id in job_ids_to_dispatch:
        child_task.delay(job_id)

def target_wants_ocr_data(operation, t1_scanner):
    if operation in ['selection_grower'] and \
        'ocr_job_id' in t1_scanner and \
        t1_scanner['ocr_job_id']:
        return True

def get_prescanned_ocr_data(t1_scanner):
    job = Job.objects.get(pk=t1_scanner['ocr_job_id'])
    ocr_data = json.loads(job.response_data)['movies']
    return ocr_data

def add_ocr_data(build_movies, prescanned_ocr_results):
    for movie_url in build_movies:
        if movie_url == 'source':
            continue
        for frameset_hash in build_movies[movie_url]['framesets']:
            if movie_url in prescanned_ocr_results and \
                frameset_hash in prescanned_ocr_results[movie_url]['framesets']:
                ocr_matches = prescanned_ocr_results[movie_url]['framesets'][frameset_hash]
                for match_id in ocr_matches:
                    ocr_match = ocr_matches[match_id]
                    build_movies[movie_url]['framesets'][frameset_hash][match_id] = ocr_match

def build_and_dispatch_generic_threaded_children(
        parent_job, 
        scanner_type, 
        operation, 
        child_task, 
        finish_func
    ):
    request_data = json.loads(parent_job.request_data)
    if parent_job.status != 'running':
        Job.objects.filter(pk=parent_job.id).update(status='running')
        parent_job = Job.objects.get(pk=parent_job.id)

    scanner_metas = request_data['tier_1_scanners'][scanner_type]
    movies = request_data['movies']

    source_movies = {}
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']

    if len(movies) == 0:
        finish_func(parent_job)
        return

    job_ids_to_dispatch = []
    with transaction.atomic():
        for scanner_meta_id in scanner_metas:
            t1_scanner = scanner_metas[scanner_meta_id]
            if target_wants_ocr_data(operation, t1_scanner):
                prescanned_ocr_results = get_prescanned_ocr_data(t1_scanner)
            build_scanner_meta = {scanner_meta_id: t1_scanner}
            for index, movie_url in enumerate(movies.keys()):
                movie = movies[movie_url]
                build_movies = {}
                build_movies[movie_url] = movie
                if source_movies:
                    build_movies['source'] = {}
                    build_movies['source'][movie_url] = source_movies[movie_url]
                if target_wants_ocr_data(operation, t1_scanner):
                    add_ocr_data(build_movies, prescanned_ocr_results)
                build_request_data = json.dumps({
                    'movies': build_movies,
                    'tier_1_scanners': {
                        scanner_type: build_scanner_meta,
                    }
                })
                job = Job(
                    request_data=build_request_data,
                    status='created',
                    description=scanner_type + ' for movie {}'.format(movie_url),
                    app='analyze',
                    operation=operation,
                    sequence=0,
                    parent=parent_job,
                )
                job.save()
                print(
                    f'build_and_dispatch_{operation}_threaded_children: '
                    f'dispatching job for movie {movie_url}'
                )
                job_ids_to_dispatch.append(job.id)
    for job_id in job_ids_to_dispatch:
        child_task.delay(job_id)

def generic_worker_call(job_uuid, operation, worker_class):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ' + operation + ' on nonexistent job: {}'.format(job_uuid))
        return
    job = Job.objects.get(pk=job_uuid)
    if job.status in ['success', 'failed']:                                     
        return                                                                  
    if job.status != 'running':
        Job.objects.filter(pk=job_uuid).update(status='running')
        job = Job.objects.get(pk=job_uuid)
    print('running ' + operation + ' job {}'.format(job_uuid))
    worker = worker_class()
    response = worker.process_create_request(json.loads(job.request_data))
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    with transaction.atomic():
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        if 'errors' in response.data:
            job.status = 'failed'
        job.save()
    dispatch_parent_job(job)

def generic_threaded(
    job_uuid, child_operation, title, build_and_dispatch_func, finish_func, task_id=None
):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        next_step = evaluate_children(title, child_operation, children)
        print(f'next step for {job.operation} is {next_step}')
        if next_step == 'build_child_tasks':
          build_and_dispatch_func(job)
        elif next_step == 'wrap_up' and job.status not in ['success', 'failed']:
            do_wrap_up = False
            if task_id:
                wrapping_up_task = job_is_wrapping_up(job, task_id)
                if not wrapping_up_task or (wrapping_up_task == task_id):
                    print(
                        f"wrapping up job {job_uuid} {job.operation} in task: {task_id}"
                    )
                    do_wrap_up = True
                else:
                    print(
                        f"job {job_uuid} {job.operation} is already wrapping up "
                        f"in another task: {wrapping_up_task} (reported by task: "
                        f"{task_id})"
                    )
            else:
                do_wrap_up = True
            if do_wrap_up:
                finish_func(job)
                if "ocr" in job.operation:
                    job_response_data = \
                        f"ocr response data length {len(job.response_data)}"
                else:
                    job_response_data = job.response_data
                print(
                    f"reloaded response_data {job.pk}: "
                    f"{job.operation} {job_response_data}"
                )
        elif next_step == 'abort':
            with transaction.atomic():
                job.status = 'failed'
                job.harvest_failed_child_job_errors(children)
                job.save()

def wrap_up_generic_threaded(job, children, scanner_type):
    aggregate_response_data = {
      'movies': {},
      'statistics': {
          'movies': {},
      },
    }
    with transaction.atomic():
        for child in children:
            child_response_data = json.loads(child.response_data)
            child_response_movies = child_response_data['movies']
            child_response_stats = {'movies': {}}
            if 'statistics' in child_response_data:
                child_response_stats = child_response_data['statistics']
            for movie_url in child_response_stats['movies']:
                aggregate_response_data['statistics']['movies'][movie_url] = child_response_stats['movies'][movie_url]

            if len(child_response_movies.keys()) > 0:
                for movie_url in child_response_movies:
                    if movie_url not in aggregate_response_data['movies']:
                        aggregate_response_data['movies'][movie_url] = {'framesets': {}}
                    for frameset_hash in child_response_data['movies'][movie_url]['framesets']:
                        frameset = child_response_data['movies'][movie_url]['framesets'][frameset_hash]
                        if frameset_hash not in aggregate_response_data['movies'][movie_url]['framesets']:
                            aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] = {}
                        agg_data_this_frameset = \
                            aggregate_response_data['movies'][movie_url]['framesets'][frameset_hash] 
                        for match_key in frameset:
                           agg_data_this_frameset[match_key] = frameset[match_key]

        job.status = 'success'
        job.response_data = json.dumps(aggregate_response_data)
        job.save()
    job.update_percent_complete()
    print('wrap_up_' + scanner_type + '_threaded: wrapping up parent job')

def generic_top_level_threaded_with_optional_ocr_id(
    job_uuid,
    scanner_type,
    scanner_type_title,
    build_dispatch_children_routine,
    finish_routine
):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
    request_data = json.loads(job.request_data)
    scanner_id = list(request_data['tier_1_scanners'][scanner_type].keys())[0]
    scanner = request_data['tier_1_scanners'][scanner_type][scanner_id]
    if 'ocr_job_id' not in scanner or not scanner['ocr_job_id']:
        if Job.objects.filter(parent=job).count() > 0:
            print('loading ocr jobs results')
            ocr_job_id = Job.objects.filter(parent=job).first().id
            scanner['ocr_job_id'] = str(ocr_job_id)
            request_data['tier_1_scanners'][scanner_type][scanner['id']] = scanner
            with transaction.atomic():
                job.request_data = json.dumps(request_data)
                job.save()
        else:
            print('{}: dispatching required ocr jobs first'.format(scanner_type))
            ocr_id = 'ocr_' + str(uuid.uuid4())
            stub_ocr_meta = {
                "id": ocr_id,
                "name": "stub",
                "start": [],
                "end": [],
                "match_text": [],
                "match_percent": 70,
                "skip_frames": 0,
                "skip_east": False,
                "data_sifter_job_id": "",
                "ocr_job_id": "",
                "scan_level": "tier_1",
                "attributes": {}
            }
            if 'ocr' not in request_data['tier_1_scanners']:
                request_data['tier_1_scanners']['ocr'] = {}
            request_data['tier_1_scanners']['ocr'][ocr_id] = stub_ocr_meta
            with transaction.atomic():
                job.request_data = json.dumps(request_data)
                job.save()

            build_and_dispatch_generic_batched_threaded_children(
                job,
                'ocr',
                ocr_batch_size,
                'scan_ocr',
                None,
                scan_ocr
            )
            return
    generic_threaded(
        job_uuid,
        scanner_type,
        scanner_type_title,
        build_dispatch_children_routine,
        finish_routine
    )

def get_frameset_hash_for_frame(frame, framesets):
    for frameset_hash in framesets:
        if frame in framesets[frameset_hash]['images']:
            return frameset_hash

def get_frameset_hashes_in_order(frames, framesets, filter_movie):
    ret_arr = []
    for frame in frames:
        frameset_hash = get_frameset_hash_for_frame(frame, framesets)
        if frameset_hash and frameset_hash not in ret_arr:
            ret_arr.append(frameset_hash)
    if len(ret_arr) == len(filter_movie['framesets']):
        return ret_arr    # frames and framesets are the same as filter movie
    else:
        # it looks like we have our filter movie input is a t1 output, with a source movie
        # being used to give us commplete frames and framesets with image names for ordering
        resp = [x for x in ret_arr if x in filter_movie['framesets']]
        return resp

def movie_is_full_movie(movie):
    if 'frames' in movie:
        return True
    return False
                    
#=====DATA SIFTER COMPILER========================
@shared_task
def manual_compile_data_sifter(job_uuid):
    generic_worker_call(job_uuid, 'manual_compile_data_sifter', AnalyzeViewSetManualCompileDataSifter)

#=======GET TIMESTAMP=============================
@shared_task
def get_timestamp(job_uuid):
    generic_worker_call(job_uuid, 'get_timestamp', AnalyzeViewSetTimestamp)

@shared_task
def get_timestamp_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'get_timestamp', 
        'GET TIMESTAMP THREADED', 
        build_and_dispatch_get_timestamp_threaded_children, 
        wrap_up_get_timestamp_threaded
    )

def build_and_dispatch_get_timestamp_threaded_children(parent_job):
    if parent_job.status != 'running':
        with transaction.atomic():
            parent_job.status = 'running'
            parent_job.quick_save()
    request_data = json.loads(parent_job.request_data)
    movies = request_data['movies']
    jobs_to_dispatch = []
    with transaction.atomic():
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
            jobs_to_dispatch.append({"movie_url": movie_url, "job": job})
    for data in jobs_to_dispatch:
        movie_url = data["movie_url"]
        job = data["job"]
        print(
            'build_and_dispatch_get_timestamp_thread_children: '
            f'dispatching job for movie {movie_url}'
        )
        get_timestamp.delay(job.id)

def wrap_up_get_timestamp_threaded(job, children):
    wrap_up_generic_threaded(job, children, 'get_timestamp')

#=====TEMPLATE====================================
@shared_task
def scan_template(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        Job.objects.filter(pk=job_uuid).update(status='running')
        job = Job.objects.get(pk=job_uuid)
        print('scanning template for job {}'.format(job_uuid))
        avsst = AnalyzeViewSetScanTemplate()
        response = avsst.process_create_request(json.loads(job.request_data))
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        request = json.loads(job.request_data)
        template_id = list(request['tier_1_scanners']['template'].keys())[0]
        template = request['tier_1_scanners']['template'][template_id]
        if 'match_method' not in template or template['match_method'] == 'any':
            jrd = response.data
        elif template['match_method'] == 'all':
            built_response_data = {}
            all_anchor_keys = set([x['id'] for x in template['anchors']])
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
            jrd = built_response_data
        if template['scan_level'] == 'tier_2':
            convert_to_tier_2(jrd, template)
        with transaction.atomic():
            job.response_data = json.dumps(jrd)
            job.status = 'success'
            job.save()

        dispatch_parent_job(job)
    else:
        print('calling scan_template on nonexistent job: {}'.format(job_uuid))

@shared_task
def scan_template_multi(job_uuid):
    # MULTI TEMPLATE MULTI MOVIE
    generic_threaded(
        job_uuid, 
        'scan_template', 
        'SCAN TEMPLATE MULTI', 
        build_and_dispatch_scan_template_multi_children, 
        wrap_up_scan_template_multi
    )

def build_and_dispatch_scan_template_multi_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job, 
        'template', 
        'scan_template', 
        scan_template, 
        finish_scan_template_multi
    )

def finish_scan_template_multi(job):
  children = Job.objects.filter(parent=job)
  wrap_up_scan_template_multi(job, children)
  pipeline = get_pipeline_for_job(job.parent)
  if pipeline:
      worker = DispatchController()
      worker.handle_job_finished(job, pipeline)

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
    with transaction.atomic():
        job.status = 'success'
        job.response_data = json.dumps(aggregate_response_data)
        job.save()

def finish_template_threaded(job):
  children = Job.objects.filter(parent=job)
  wrap_up_template_threaded(job, children)
  pipeline = get_pipeline_for_job(job.parent)
  if pipeline:
      worker = DispatchController()
      worker.handle_job_finished(job, pipeline)

@shared_task
def template_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'scan_template', 
        'SCAN TEMPLATE THREADED', 
        build_and_dispatch_template_threaded_children, 
        finish_template_threaded
    )

def build_and_dispatch_template_threaded_children(parent_job):
    prd = json.loads(parent_job.request_data)
    templates = prd.get('tier_1_scanners', {}).get('template', {}) 
    first_template_key = list(templates.keys())[0]
    template = templates[first_template_key]
    if template.get('run_multiple'):
        build_and_dispatch_generic_batched_threaded_children(
            parent_job,
            'template',
            template_batch_size,
            'scan_template',
            None,
            scan_template
            )
    else:
        build_and_dispatch_generic_threaded_children(
            parent_job, 
            'template', 
            'scan_template', 
            scan_template, 
            finish_template_threaded
        )

def aggregate_statistics_from_template_child(aggregate_response_data, child_response_data):
    if 'statistics' in child_response_data:
        if 'movies' not in child_response_data['statistics']:
            return
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

def wrap_up_template_threaded(job, children):
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

    print('wrap_up_template_threaded: wrapping up parent job')
    with transaction.atomic():
        job.status = 'success'
        job.response_data = json.dumps(aggregate_response_data)
        job.save()

def convert_to_tier_2(response_data, template):
    print('converting to tier 2')
    for movie_url in response_data['movies']:
        for frameset_hash in response_data['movies'][movie_url]['framesets']:
            frameset = response_data['movies'][movie_url]['framesets'][frameset_hash]
            for anchor_id in frameset:
                match_obj = frameset[anchor_id]
                anchor_found_scale = match_obj['scale']
                anchor_found_coords = match_obj['location']
                mask_zones = get_mask_zones_for_anchor(template, anchor_id)
                for mask_zone in mask_zones:
                    (new_location, new_size) = get_area_to_redact_from_template_match(
                        mask_zone, anchor_id, template, anchor_found_coords, anchor_found_scale
                    )
                    match_obj['location'] = new_location
                    match_obj['size'] = new_size

def get_mask_zones_for_anchor(template, anchor_id):
    mask_zones = []
    for mask_zone in template['mask_zones']:
        if 'anchor_id' in mask_zone:
            if mask_zone['anchor_id'] == anchor_id:
                mask_zones.append(mask_zone)
        else:
            mask_zones.append(mask_zone)
    return mask_zones

def get_area_to_redact_from_template_match(
        mask_zone, 
        anchor_id, 
        template, 
        anchor_found_coords, 
        anchor_found_scale
    ):
    anchor = None
    for x in template['anchors']:
        # it looks like we get anchor id as xxx-0 from the compose panel, where xxx is the real anchor id
        if x['id'] in anchor_id:
            anchor = x
    if not anchor: 
        print('cant find anchor in template match')
        return
    anchor_spec_coords = anchor['start']
    mz_size = (
        int((mask_zone['end'][0] - mask_zone['start'][0]) / anchor_found_scale),
        int((mask_zone['end'][1] - mask_zone['start'][1]) / anchor_found_scale)
    )
    mz_spec_offset = [
        mask_zone['start'][0] - anchor_spec_coords[0],
        mask_zone['start'][1] - anchor_spec_coords[1]
    ]
    mz_spec_offset_scaled = [
        mz_spec_offset[0] / anchor_found_scale,
        mz_spec_offset[1] / anchor_found_scale
    ]
    new_start = (
        int(anchor_found_coords[0] + mz_spec_offset_scaled[0]),
        int(anchor_found_coords[1] + mz_spec_offset_scaled[1])
    )
    return (new_start, mz_size)

#=====OCR=========================================
@shared_task
def scan_ocr(job_uuid):
    generic_worker_call(job_uuid, 'scan_ocr', AnalyzeViewSetOcr)

@shared_task(bind=True)
def ocr_threaded(self, job_uuid):
    task_id = self.request.id
    generic_threaded(
        job_uuid, 
        'scan_ocr', 
        'SCAN OCR THREADED', 
        build_and_dispatch_ocr_threaded_children, 
        finish_ocr_threaded,
        task_id,
    )

def finish_ocr_threaded(job):
    children = Job.objects.filter(parent=job)
    wrap_up_ocr_threaded(job, children)
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)
    dispatch_parent_job(job)

def build_and_dispatch_ocr_threaded_children(parent_job):
    build_and_dispatch_generic_batched_threaded_children(
        parent_job,
        'ocr',
        ocr_batch_size,
        'scan_ocr',
        finish_ocr_threaded,
        scan_ocr
    )

# TODO This whole method might be okay with just a generic call now.  We have all the fuzz matching in the 
#   controller now
def wrap_up_ocr_threaded(parent_job, children):
    parent_request_data = json.loads(parent_job.request_data)
    ocr_rule_id = list(parent_request_data['tier_1_scanners']['ocr'].keys())[0]
    ocr_rule = parent_request_data['tier_1_scanners']['ocr'][ocr_rule_id]
    build_movies = {}
    aggregate_stats = {'movies': {}}
    for child in children:
        child_response_data = json.loads(child.response_data)
        if not child_response_data:
            continue
        for movie_url in child_response_data['movies']:
            if movie_url not in build_movies:
                build_movies[movie_url] = {'framesets': {}}
            resp_movie = child_response_data['movies'][movie_url]
            for frameset_hash in resp_movie['framesets']:
                areas_to_redact = resp_movie['framesets'][frameset_hash]
                build_movies[movie_url]['framesets'][frameset_hash] = areas_to_redact

    return_data = {
        'movies': build_movies,
        'statistics': aggregate_stats,
    }

    print('wrap_up_ocr_threaded: wrapping up parent job')
    with transaction.atomic():
        parent_job.status = 'success'
        parent_job.response_data = json.dumps(return_data)
        parent_job.save()
#=====SELECTION GROWER============================
@shared_task
def selection_grower(job_uuid):
    generic_worker_call(job_uuid, 'selection_grower', AnalyzeViewSetSelectionGrower)

def finish_selection_grower_threaded(job):
  children = Job.objects.filter(parent=job)
  wrap_up_generic_threaded(job, children, 'selection_grower')
  pipeline = get_pipeline_for_job(job.parent)
  if pipeline:
      worker = DispatchController()
      worker.handle_job_finished(job, pipeline)

@shared_task
def selection_grower_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'selection_grower', 
        'SELECTION GROWER THREADED', 
        build_and_dispatch_selection_grower_threaded_children, 
        finish_selection_grower_threaded
    )

def build_and_dispatch_selection_grower_threaded_children(parent_job):
    pj_request_data = json.loads(parent_job.request_data)
    the_grower = {}
    if 'tier_1_scanners' in pj_request_data:
        first_key = list(pj_request_data['tier_1_scanners']['selection_grower'].keys())[0]
        the_grower = pj_request_data['tier_1_scanners']['selection_grower'][first_key]
    batch_size = sg_batch_size_no_ocr
    if the_grower and the_grower['usage_mode'] == 'capture_grid':
        batch_size = sg_batch_size_with_ocr
    build_and_dispatch_generic_batched_threaded_children(
        parent_job,
        'selection_grower',
        batch_size,
        'selection_grower',
        finish_selection_grower_threaded,
        selection_grower
    )

#=====MESH MATCH==================================
@shared_task
def mesh_match(job_uuid):
    generic_worker_call(job_uuid, 'mesh_match', AnalyzeViewSetMeshMatch)

def finish_mesh_match_threaded(job):
  children = Job.objects.filter(parent=job)
  wrap_up_generic_threaded(job, children, 'mesh_match')
  pipeline = get_pipeline_for_job(job.parent)
  if pipeline:
      worker = DispatchController()
      worker.handle_job_finished(job, pipeline)

@shared_task
def mesh_match_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'mesh_match', 
        'MESH MATCH THREADED', 
        build_and_dispatch_mesh_match_threaded_children, 
        finish_mesh_match_threaded
    )

def build_and_dispatch_mesh_match_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job, 
        'mesh_match', 
        'mesh_match', 
        mesh_match, 
        finish_mesh_match_threaded
    )

#=====SELECTED AREA===============================
@shared_task
def selected_area(job_uuid):
    generic_worker_call(job_uuid, 'selected_area', AnalyzeViewSetSelectedArea)

def finish_selected_area_threaded(job):
  children = Job.objects.filter(parent=job)
  wrap_up_generic_threaded(job, children, 'selected_area')
  pipeline = get_pipeline_for_job(job.parent)
  if pipeline:
      worker = DispatchController()
      worker.handle_job_finished(job, pipeline)

@shared_task(bind=True)
def selected_area_threaded(self, job_uuid):
    task_id = self.request.id
    generic_threaded(
        job_uuid, 
        'selected_area', 
        'SELECTED AREA THREADED', 
        build_and_dispatch_selected_area_threaded_children, 
        finish_selected_area_threaded,
        task_id,
    )

def build_and_dispatch_selected_area_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job, 
        'selected_area', 
        'selected_area', 
        selected_area, 
        finish_selected_area_threaded
    )

#=====CHARTS======================================

def generic_chart(job_uuid, chart_type):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling ' + chart_type + ' chart on nonexistent job: {}'.format(job_uuid))
    with transaction.atomic():
        job = Job.objects.get(pk=job_uuid)
        job.status = 'running'
        job.save()
    print('running ' +chart_type + ' chart for job {}'.format(job_uuid))

    req_obj = json.loads(job.request_data)
    build_job_data = {}
    if 'job_ids' in req_obj:
        for job_id in req_obj['job_ids']:
            job = Job.objects.get(pk=job_id)
            build_job_data[job_id] = {
                'request_data': json.loads(job.request_data),
                'response_data': json.loads(job.response_data),
            }


    worker = AnalyzeViewSetChart()
    response = worker.process_create_request({
        'job_data': build_job_data,
        'chart_info': {
            'chart_type': chart_type,
        },
    })
    if not Job.objects.filter(pk=job_uuid).exists():
        return
    with transaction.atomic():
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

@shared_task
def template_match_chart(job_uuid):
    generic_chart(job_uuid, 'template_match')

@shared_task
def selection_grower_chart(job_uuid):
    generic_chart(job_uuid, 'selection_grower')

@shared_task
def ocr_match_chart(job_uuid):
    generic_chart(job_uuid, 'ocr_match')

@shared_task
def selected_area_chart(job_uuid):
    generic_chart(job_uuid, 'selected_area')

#=====DATA SIFTER===============================

@shared_task
def data_sifter(job_uuid):
    generic_worker_call(job_uuid, 'data_sifter', AnalyzeViewSetDataSifter)

@shared_task
def data_sifter_threaded(job_uuid):
    scanner_type = 'data_sifter'
    scanner_type_title = 'DATA SIFTER THREADED'
    build_dispatch_children_routine = build_and_dispatch_data_sifter_threaded_children
    finish_routine = finish_data_sifter_threaded
    return generic_top_level_threaded_with_optional_ocr_id(
        job_uuid, scanner_type, scanner_type_title, build_dispatch_children_routine, finish_routine
    )

def finish_data_sifter_threaded(job):
    children = Job.objects.filter(parent=job, operation='data_sifter')
    wrap_up_generic_threaded(job, children, 'data_sifter')

    if Job.objects.filter(parent=job, operation='scan_ocr').count() > 0:
        # ocr was run on the fly, we don't want this ocr job ids for future runs
        request_data = json.loads(job.request_data)
        data_sifter_id = list(request_data['tier_1_scanners']['data_sifter'].keys())[0]
        data_sifter = request_data['tier_1_scanners']['data_sifter'][data_sifter_id]
        data_sifter['ocr_job_id'] = ''
        with transaction.atomic():
            job.request_data = json.dumps(request_data)
            job.save()

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

def build_and_dispatch_data_sifter_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job, 
        'data_sifter', 
        'data_sifter', 
        data_sifter, 
        finish_data_sifter_threaded
    )

#=====FOCUS FINDER ===============================

@shared_task
def focus_finder(job_uuid):
    generic_worker_call(job_uuid, 'focus_finder', AnalyzeViewSetFocusFinder)

@shared_task
def focus_finder_threaded(job_uuid):
    scanner_type = 'focus_finder'
    scanner_type_title = 'FOCUS FINDER THREADED'
    build_dispatch_children_routine = build_and_dispatch_focus_finder_threaded_children
    finish_routine = finish_focus_finder_threaded
    return generic_top_level_threaded_with_optional_ocr_id(
        job_uuid, scanner_type, scanner_type_title, build_dispatch_children_routine, finish_routine
    )

def finish_focus_finder_threaded(job):
    children = Job.objects.filter(parent=job, operation='focus_finder')
    wrap_up_generic_threaded(job, children, 'focus_finder')

    if Job.objects.filter(parent=job, operation='scan_ocr').count() > 0:
        # ocr was run on the fly, we don't want this ocr job ids for future runs
        request_data = json.loads(job.request_data)
        scanner_id = list(request_data['tier_1_scanners']['focus_finder'].keys())[0]
        scanner = request_data['tier_1_scanners']['focus_finder'][scanner_id]
        scanner['ocr_job_id'] = ''
        with transaction.atomic():
            job.request_data = json.dumps(request_data)
            job.save()

    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = PipelinesViewSetDispatch()
        worker.handle_job_finished(job, pipeline)

def build_and_dispatch_focus_finder_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job,
        'focus_finder',
        'focus_finder',
        focus_finder,
        finish_focus_finder_threaded
    )

#=====DIFF ===============================

@shared_task
def diff(job_uuid):
    generic_worker_call(job_uuid, 'diff', AnalyzeViewSetDiff)

@shared_task
def diff_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'diff', 
        'DIFF THREADED', 
        build_and_dispatch_diff_threaded_children, 
        finish_diff_threaded
    )

def finish_diff_threaded(job):
    children = Job.objects.filter(parent=job, operation='diff')
    wrap_up_generic_threaded(job, children, 'diff')
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = PipelinesViewSetDispatch()
        worker.handle_job_finished(job, pipeline)

def build_and_dispatch_diff_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job,
        'diff',
        'diff',
        diff,
        finish_diff_threaded
    )

#=====FEATURE ===============================

@shared_task
def feature(job_uuid):
    generic_worker_call(job_uuid, 'feature', AnalyzeViewSetFeature)

@shared_task
def feature_threaded(job_uuid):
    generic_threaded(
        job_uuid, 
        'feature', 
        'FEATURE THREADED', 
        build_and_dispatch_feature_threaded_children, 
        finish_feature_threaded
    )

def finish_feature_threaded(job):
    children = Job.objects.filter(parent=job, operation='feature')
    wrap_up_generic_threaded(job, children, 'feature')
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = PipelinesViewSetDispatch()
        worker.handle_job_finished(job, pipeline)

def build_and_dispatch_feature_threaded_children(parent_job):
    build_and_dispatch_generic_threaded_children(
        parent_job,
        'feature',
        'feature',
        feature,
        finish_feature_threaded
    )

#===HOG=================================

@shared_task
def test_hog(job_uuid):
    generic_worker_call(job_uuid, 'test_hog', AnalyzeViewSetTestHog)

@shared_task
def train_hog(job_uuid):
    generic_worker_call(job_uuid, 'train_hog', AnalyzeViewSetTrainHog)

@shared_task
def train_hog_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if not job_has_anticipated_operation_count_attribute(job):
            make_anticipated_operation_count_attribute_for_job(job, 2)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_train_hog_children(children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        if next_step == 'build_train_task':
          build_and_dispatch_train_hog(job)
        elif next_step == 'build_test_tasks':
          build_and_dispatch_test_hog(job, children)
        elif next_step == 'wrap_up':
          wrap_up_train_hog_threaded(job, children)
        elif next_step == 'abort':
            with transaction.atomic():
                job.status = 'failed'
                job.harvest_failed_child_job_errors(children)
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
    with transaction.atomic():
        job.status = 'success'
        job.response_data = json.dumps(aggregate_response_data)
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
    with transaction.atomic():
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
    with _transaction.atomic():
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
    jobs_to_dispatch = []
    with transaction.atomic():
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
                jobs_to_dispatch.append(job)
    for job in jobs_to_dispatch:
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

#=======================================

@shared_task
def train_feature_anchor(job_uuid):
    generic_worker_call(job_uuid, 'train_feature_worker', AnalyzeViewSetTrainFeatureWorker)

@shared_task
def intersect(job_uuid):
    generic_worker_call(job_uuid, 'intersect', AnalyzeViewSetIntersect)
    job = Job.objects.get(pk=job_uuid)
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)

@shared_task
def filter(job_uuid):
    generic_worker_call(job_uuid, 'filter', AnalyzeViewSetFilter)

@shared_task
def t1_filter(job_uuid):
    generic_worker_call(job_uuid, 't1_filter', AnalyzeViewSetT1Filter)
    job = Job.objects.get(pk=job_uuid)
    pipeline = get_pipeline_for_job(job.parent)
    if pipeline:
        worker = PipelinesViewSetDispatch()
        worker.handle_job_finished(job, pipeline)

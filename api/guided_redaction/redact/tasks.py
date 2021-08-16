import json
import os

from celery import shared_task
from django.db import transaction
from guided_redaction.jobs.models import Job
from guided_redaction.utils.gt import (
    post_data_redacted_event, post_no_redaction_data_found_event,
)
from guided_redaction.utils.task_shared import (
    evaluate_children,
    job_is_wrapping_up,
    build_file_directory_user_attributes_from_movies,
    get_account_lob_global_recording_gt_ids,
    get_pipeline_for_job
)
from guided_redaction.redact.api import (
    RedactViewSetRedactImage, 
    RedactViewSetIllustrateImage, 
    RedactViewSetRedactT1Movie
)
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.controller_dispatch import DispatchController

dispatch_movies_threshold = 10

def send_redaction_data_signal(redact_job, pipeline, redaction_needed):
    account, lob, global_id, recording_id, gtid = \
        get_account_lob_global_recording_gt_ids(redact_job.parent)
    source_details = {
        'jobId': redact_job.parent.id,
        'pipelineName': pipeline.name,
        'recordingId': recording_id,
    }
    print(
        f'making gr redaction data signal for recording {recording_id}, '
        f'account {account}, lob {lob}, global_id {global_id}, gtid {gtid}'
    )
    if any([f is None for f in (account, lob, global_id, recording_id, gtid)]):
        print(
            'Cannot make gr redaction data signal. '
            f'Missing one or more of account {account}, lob {lob}, '
            f'global_id {global_id}, gtid {gtid}, or recording_id {recording_id}'
        )
        return
    if redaction_needed:
        print('posting redaction was needed record')
        post_data_redacted_event(
            account, lob, global_id, gtid, recording_id, source_details=source_details
        )
    else:
        print('posting redaction not needed record')
        post_no_redaction_data_found_event(
            account, lob, global_id, gtid, recording_id, source_details=source_details
        )

def dispatch_parent_job(job):
    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if (parent_job.app == 'redact' and
            parent_job.operation == 'redact' and
            parent_job.status not in ['success', 'failed']
        ):
            redact_threaded.delay(parent_job.id)
        if (
            parent_job.app == 'redact' and
            parent_job.operation == 'redact_t1' and
            parent_job.status not in ['success', 'failed']
        ):
            redact_t1_threaded.delay(parent_job.id)

def build_default_redact_rule(request_data):
    request_data['redact_rule'] = {
        'mask_method': 'black_rectangle',
        'id': 'redact_rule_default_123',
        'name': 'default',
    }

@shared_task
def redact_t1_single(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('redact t1 job not found, exiting')
        return

    job = Job.objects.get(pk=job_uuid)
    if job.status in ['success', 'failed']:
        return
    if job.status != 'running':
        with transaction.atomic():
            job.status = 'running'
            job.quick_save()
    print('running redact t1 job {}'.format(job_uuid))

    parsed_request_data = json.loads(job.request_data)
    if 'redact_rule' not in parsed_request_data:
        build_default_redact_rule(parsed_request_data)
    worker = RedactViewSetRedactT1Movie()
    response = worker.process_create_request(parsed_request_data)

    if not Job.objects.filter(pk=job_uuid).exists():
        return
    with transaction.atomic():
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        if 'errors' in response.data:
            job.status = 'failed'
        job.save()

    build_file_directory_user_attributes_from_movies(job, response.data)

    dispatch_parent_job(job)

@shared_task
def redact_single(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('redact job not found, exiting')
        return

    job = Job.objects.get(pk=job_uuid)
    if job.status in ['success', 'failed']:
        return
    if job.status != 'running':
        with transaction.atomic():
            job.status = 'running'
            job.quick_save()
    print('running redact job {}'.format(job_uuid))

    parsed_request_data = json.loads(job.request_data)
    if 'redact_rule' not in parsed_request_data:
        build_default_redact_rule(parsed_request_data)
    worker = RedactViewSetRedactImage()
    response = worker.process_create_request(parsed_request_data)

    if not Job.objects.filter(pk=job_uuid).exists():
        return
    with transaction.atomic():
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        if 'errors' in response.data:
            job.status = 'failed'
        job.save()

    build_file_directory_user_attributes_from_movies(job, response.data)

    dispatch_parent_job(job)

def build_and_dispatch_redact_t1_threaded_children(parent_job):
    if parent_job.status != 'running':
        with transaction.atomic():
            parent_job.status = 'running'
            parent_job.quick_save()
    job_counter = 0
    request_data = json.loads(parent_job.request_data)
    meta = request_data['meta']
    movies = request_data['movies']
    source_movies = False
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    if 'redact_rule' not in request_data:
        build_default_redact_rule(request_data)
    redact_rule = request_data['redact_rule']
    print(f'there will be {len(movies)} t1 redact jobs')
    dispatch_redact_by_movie(movies, source_movies, redact_rule, meta, parent_job)

def build_and_dispatch_redact_threaded_children(parent_job):
    if parent_job.status != 'running':
        with transaction.atomic():
            parent_job.status = 'running'
            parent_job.quick_save()
    job_counter = 0
    request_data = json.loads(parent_job.request_data)
    meta = request_data['meta']
    movies = request_data['movies']
    source_movies = False
    if 'source' in movies:
        source_movies = movies['source']
        del movies['source']
    if 'redact_rule' not in request_data:
        build_default_redact_rule(request_data)
    redact_rule = request_data['redact_rule']
    tot_num_frames = sum([len(movies[movie_url]['framesets']) for movie_url in movies])
    tot_num_jobs = tot_num_frames
    if tot_num_frames > dispatch_movies_threshold: 
        tot_num_jobs = len(movies)
    print(
        f'there will be {tot_num_frames} frames, {tot_num_jobs} redact jobs'
    )
    if tot_num_frames > dispatch_movies_threshold:
        dispatch_redact_by_movie(movies, source_movies, redact_rule, meta, parent_job)
    else:
        dispatch_redact_by_framesets(
            movies, source_movies, redact_rule, meta, parent_job
        )

def dispatch_redact_by_movie(movies, source_movies, redact_rule, meta, parent_job):
    job_counter = 0
    job_ids_to_dispatch = []
    with transaction.atomic():
        for movie_url in movies:
            movie = movies[movie_url]
            source_movie = {}
            if source_movies and movie_url in source_movies:
                source_movie = source_movies[movie_url]
            build_request_data = build_movie_request_data(
                movie, movie_url, redact_rule, meta, source_movie
            )
            job = Job(
                request_data=json.dumps(build_request_data),
                status='created',
                description='redact image for movie {}'.format(movie_url),
                app='redact',
                operation='redact_t1_single',
                sequence=job_counter,
                parent=parent_job,
            )
            job.save()
            print(
                f'dispatching redact t1 job number {job_counter} / '
                f'{job.id} for movie {movie_url}'
            )
            job_ids_to_dispatch.append(job.id)
            job_counter += 1

    if job_ids_to_dispatch:
        for job_id in job_ids_to_dispatch:
            redact_t1_single.delay(job_id)
    else:
        # We can't just dispatch parent_job here, because when
        # evaluate_children() sees there are no children, it will 
        # try to dispatch them again so we have to duplicate the wrap-up
        # code here.
        wrap_up_redact_t1_threaded(parent_job, [])
        pipeline = get_pipeline_for_job(parent_job.parent)
        if pipeline:
            if (Attribute.objects
                .filter(pipeline=pipeline, name='save_redaction_was_needed_record')
                .exists()
            ):
                send_redaction_data_signal(parent_job, pipeline, False)
            worker = DispatchController()
            worker.handle_job_finished(parent_job, pipeline)

def dispatch_redact_by_framesets(movies, source_movies, redact_rule, meta, parent_job):
    jobs_to_dispatch = []
    with transaction.atomic():
        for movie_url in movies:
            movie = movies[movie_url]
            for frameset_hash in movie['framesets']:
                frameset = movie['framesets'][frameset_hash]
                build_request_data = None
                if frameset_is_tier_2(frameset):
                    build_request_data = build_t2_image_request_data(
                      movie_url, frameset_hash, frameset, redact_rule, meta
                    )
                elif frameset_is_tier_1(frameset):
                    build_request_data = build_t1_image_request_data(
                      movie_url, 
                      frameset_hash, 
                      frameset, 
                      redact_rule,
                      meta,
                      source_movies
                    )

                if build_request_data:
                    job = Job(
                        request_data=json.dumps(build_request_data),
                        status='created',
                        description='redact image for frameset {frameset_hash}',
                        app='redact',
                        operation='redact',
                        sequence=job_counter,
                        parent=parent_job,
                    )
                    job.save()
                    jobs_to_dispatch.append(job)
    for job_counter, job in enumerate(jobs_to_dispatch):
        print('dispatching redact job {job.id} for frameset {frameset_hash}')
        redact_single.delay(job.id)
        if (job_counter + 1) % 100 == 0:
            print('---redact job number {job_counter + 1} has been dispatched')

def frameset_is_tier_1(frameset):
    if 'images' not in frameset.keys():
        return True

def frameset_is_tier_2(frameset):
    if 'areas_to_redact' in frameset.keys():
        return True

def build_movie_request_data(movie, movie_url, redact_rule, meta, source_movie):
    request_data = {
        'movie_url': movie_url,
        'movie': movie,
        'source_movie': source_movie,
        'redact_rule': redact_rule,
        'meta': meta,
    }
    return request_data

def build_t1_image_request_data(movie_url, frameset_hash, frameset, redact_rule, meta, source_movies):
    areas_to_redact = []
    [areas_to_redact.append(frameset[match_key]) for match_key in frameset]
    source_image_url = ''
    if movie_url in source_movies and frameset_hash in source_movies[movie_url]['framesets']:
        source_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]

    if source_image_url:
        request_data = {
            'movie_url': movie_url,
            'frameset_hash': frameset_hash,
            'image_url': source_image_url,
            'areas_to_redact': areas_to_redact,
            'redact_rule': redact_rule,
            'meta': meta,
        }
        return request_data

def build_t2_image_request_data(movie_url, frameset_hash, frameset, redact_rule, meta):
    request_data = {
        'movie_url': movie_url,
        'frameset_hash': frameset_hash,
        'image_url': frameset['images'][0],
        'areas_to_redact': frameset['areas_to_redact'],
        'redact_rule': redact_rule,
        'meta': meta,
    }
    return request_data

def wrap_up_redact_t1_threaded(job, children):
    build_response_data = {
      'movies': {}
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        for movie_url in child_response_data['movies']:
            if movie_url not in build_response_data['movies']:
                build_response_data['movies'][movie_url] = {'framesets': {}}
            for frameset_hash in child_response_data['movies'][movie_url]['framesets']:
                frameset_data = child_response_data['movies'][movie_url]['framesets'][frameset_hash]
                build_response_data['movies'][movie_url]['framesets'][frameset_hash] = frameset_data
    with transaction.atomic():
        job.status = 'success'
        job.response_data = json.dumps(build_response_data)
        job.save()

def wrap_up_redact_threaded(job, children):
    aggregate_response_data = {
      'movies': {},
    }
    for child in children:
        child_response_data = json.loads(child.response_data)
        if 'redacted_image_url' not in child_response_data:
            print('problem getting redacted image url for job {} {}'.format(
                child, child_response_data
            ))
            continue
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
    with transaction.atomic():
        job.status = 'success'
        job.response_data = json.dumps(aggregate_response_data)
        job.save()

@shared_task(bind=True)
def redact_t1_threaded(self, job_uuid):
    task_id = self.request.id
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        print(f"reloaded response_data {job.pk}: {job.operation} {job.response_data}")
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        next_step = evaluate_children('T1 REDACT', 'redact_t1_single', children)

        print('next step is {}'.format(next_step))
        if next_step == 'build_child_tasks':
            build_and_dispatch_redact_t1_threaded_children(job)
        elif next_step == 'noop':
            pass
        elif next_step == 'wrap_up' and job.status not in ['success', 'failed']:
            wrapping_up_task = job_is_wrapping_up(job, task_id)
            if not wrapping_up_task or (wrapping_up_task == task_id):
                print(
                    f"wrapping up job {job_uuid} redact_t1_threaded in task: {task_id}"
                )
                wrap_up_redact_t1_threaded(job, children)
                pipeline = get_pipeline_for_job(job.parent)
                if pipeline:
                    if (Attribute.objects
                        .filter(pipeline=pipeline)
                        .filter(name='save_redaction_was_needed_record')
                        .exists()
                    ):
                        send_redaction_data_signal(job, pipeline, True)
                        worker = DispatchController()
                        worker.handle_job_finished(job, pipeline)
            else:
                print(
                    f"job {job_uuid} redact_t1_threaded is already wrapping up "
                    f"in another task: {wrapping_up_task} (reported by: {task_id})"
                )
        elif next_step == 'abort':
            with transaction.atomic():
                job.status = 'failed'
                job.save()
        return

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
                worker = DispatchController()
                worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
            with transaction.atomic():
                job.status = 'failed'
                job.save()
        return

@shared_task
def illustrate(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        with transaction.atomic():
            job.status = 'running'
            job.save()
            rvsri = RedactViewSetIllustrateImage()
            response = rvsri.process_create_request(json.loads(job.request_data))
            job.response_data = json.dumps(response.data)
            job.status = 'success'
            job.save()
        build_file_directory_user_attributes_from_movies(job, response.data)

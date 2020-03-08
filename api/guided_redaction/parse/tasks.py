from celery import shared_task                                                  
import pprint
import math
import os
import json                                                                     
import ffmpeg
from guided_redaction.jobs.models import Job                                    
from guided_redaction.parse.api import (
        ParseViewSetZipMovie,
        ParseViewSetSplitMovie,
        ParseViewSetCopyMovie,
        ParseViewSetChangeMovieResolution,
        ParseViewSetRebaseMovies,
        ParseViewSetHashFrames
)


hash_frames_batch_size = 50
split_frames_multithreaded_threshold = 200
split_frames_chunk_size = 100

# TODO this is a cut and past from analyze/tasks.py.  Find a better way to share it soon
# also, get it working for split_and_hash_threaded
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
def zip_movie(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling zip_movie on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()
    request_data = json.loads(job.request_data)
    print('zipping movie for job ', job_uuid)
    pvszm = ParseViewSetZipMovie()
    response_data = pvszm.process_create_request(request_data)
    if response_data['errors_400']:
        job.status = 'failed'
        job.response_data = json.dumps(response_data['errors_400'])
    elif response_data['errors_422']:
        job.status = 'failed'
        job.response_data = json.dumps(response_data['errors_422'])
    else:
        job.response_data = json.dumps(response_data['response_data'])
        job.status = 'success'
    job.save()

@shared_task
def split_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_children('SPLIT THREADED', 'split_movie', children)
        print('next step is {}, percent done {}'.format(next_step, percent_done))
        request_data = json.loads(job.request_data)
        movie_url = request_data['movie_url']
        if next_step == 'build_child_tasks':
            movie_length_seconds = get_movie_length_in_seconds(movie_url)
            build_and_dispatch_split_tasks_multithreaded(job, movie_url, movie_length_seconds)
        elif next_step == 'update_percent_complete':
            job.elapsed_time = percent_done
            job.save()
        elif next_step == 'wrap_up':
            movies_obj = gather_split_threaded_data(children)
            movies_obj['movies'][movie_url]['framesets'] = {}
            frames = movies_obj['movies'][movie_url]
            job.response_data = json.dumps(movies_obj)
            job.status = 'success'
            job.save()
        elif next_step == 'abort':
            job.status = 'failed'
            job.save()

@shared_task
def split_movie(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling split_movie on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        pvssahm = ParseViewSetSplitMovie()
        response = pvssahm.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'parse' and parent_job.operation == 'split_and_hash_threaded':
                split_and_hash_threaded.delay(parent_job.id)
            elif parent_job.app == 'parse' and parent_job.operation == 'split_threaded':
                split_threaded.delay(parent_job.id)

@shared_task
def hash_frames(job_uuid):
    # TODO make this threading aware
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        pvssahm = ParseViewSetHashFrames()
        response = pvssahm.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        response_data = response.data
        movie_url = list(request_data['movies'].keys())[0]
        movie_obj = request_data
        movie_obj['movies'][movie_url]['framesets'] = response_data['framesets']
        job.response_data = json.dumps(movie_obj)
        job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'parse' and parent_job.operation == 'split_and_hash_threaded':
                split_and_hash_threaded.delay(parent_job.id)
    else:
        print('calling hash_frames on nonexistent job: '+ job_uuid) 

@shared_task
def split_and_hash_threaded(job_uuid):
    print('split and hash threaded, job id is '+str(job_uuid))
    job = Job.objects.get(pk=job_uuid)
    if job:
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        (next_step, percent_done) = evaluate_split_and_hash_threaded_children(children)
        if next_step:
            print('split and hash threaded next step is '+ next_step)
        else:
            print('split and hash threaded next step is null')
        if next_step == 'make_and_dispatch_split_tasks':
            make_and_dispatch_split_tasks(job)
            return
        elif next_step == 'make_and_dispatch_hash_tasks':
            make_and_dispatch_hash_tasks(job, children)
            job.elapsed_time = percent_done
            job.save()
        elif next_step == 'abort':
            print('aborting split and hash threaded, some child tasks have failed')
            job.status = 'failed'
            job.save()
            return
        elif next_step == 'wrap_up':
            wrap_up_split_and_hash_threaded(job, children)
        elif next_step == 'update_complete_percent':
            job.elapsed_time = percent_done
            job.save()
        else:
            print('some subtasks arent complete or failed, let them finish')
            return
    else:
        print('calling split_and_hash_movie on nonexistent job: '+ job_uuid) 

def wrap_up_split_and_hash_threaded(parent_job, children):
    framesets = {}
    hash_children = [x for x in children if x.operation == 'hash_movie']
    frameset_discriminator = ''
    for hash_child in hash_children:
        child_response_data = json.loads(hash_child.response_data)
        movie_url = list(child_response_data['movies'].keys())[0]
        if not frameset_discriminator:
            frameset_discriminator = child_response_data['movies'][movie_url]['frameset_discriminator']
        frameset_hashes = child_response_data['movies'][movie_url]['framesets'].keys()
        for frameset_hash in frameset_hashes:
            if frameset_hash in framesets:
               framesets[frameset_hash]['images'] += child_response_data['movies'][movie_url]['framesets'][frameset_hash]['images']
            else:
               framesets[frameset_hash] = {}
               framesets[frameset_hash]['images'] = child_response_data['movies'][movie_url]['framesets'][frameset_hash]['images']
            framesets[frameset_hash]['images'] = sorted(framesets[frameset_hash]['images'])
        
    resp_data = json.loads(parent_job.response_data)
    req_data = json.loads(parent_job.request_data)
    movie_url = req_data['movie_url']
    resp_data['movies'][movie_url]['framesets'] = framesets 
    resp_data['movies'][movie_url]['frameset_discriminator'] = frameset_discriminator
    parent_job.response_data = json.dumps(resp_data)
    parent_job.status = 'success'
    parent_job.elapsed_time = 1
    parent_job.save()
    print('wrapping up split and hash threaded')

def evaluate_split_and_hash_threaded_children(children):
    types = set()
    split_movie_children = 0
    split_movie_completed_children = 0
    split_movie_failed_children = 0
    hash_frames_children = 0
    hash_frames_completed_children = 0
    hash_frames_failed_children = 0
    for child in children:
        if child.operation == 'split_movie':
            split_movie_children += 1
            if child.status == 'success': 
                split_movie_completed_children += 1
            elif child.status == 'failed':
                split_movie_failed_children += 1
        elif child.operation == 'hash_movie':
            hash_frames_children += 1
            if child.status == 'success': 
                hash_frames_completed_children += 1
            elif child.status == 'failed':
                hash_frames_failed_children += 1
    def print_totals():
        print('SPLIT MOVIE CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
            split_movie_children, split_movie_completed_children, split_movie_failed_children))
        print('HASH FRAMES CHILDREN: {} COMPLETE: {} FAILED: {}'.format(
            hash_frames_children, hash_frames_completed_children, hash_frames_failed_children))
    print_totals()
    if split_movie_children == 0:
        return ('make_and_dispatch_split_tasks', 0)
    elif hash_frames_children > 0 and hash_frames_children == hash_frames_completed_children:
        return ('wrap_up', 1)
    elif hash_frames_children > 0 and hash_frames_failed_children > 0:
        return ('abort', 0)
    elif hash_frames_children > 0:
        complete_percent = .5 + .5*(hash_frames_completed_children/hash_frames_children)
        return ('update_complete_percent', complete_percent)
    elif split_movie_children > split_movie_completed_children and hash_frames_children == 0:
        complete_percent = .5*(split_movie_completed_children/split_movie_children)
        return ('update_complete_percent', complete_percent)
    elif split_movie_children == split_movie_completed_children and hash_frames_children == 0:
        return ('make_and_dispatch_hash_tasks', .5)
    elif split_movie_failed_children > 0:
        return ('abort', 0)

def gather_split_threaded_data(split_tasks):
    frames = []
    audio_url = ''
    frame_dimensions = []
    for i, split_task in enumerate(split_tasks):
        resp_data = json.loads(split_task.response_data)
        req_data = json.loads(split_task.request_data)
        movie_url = req_data['movie_url']
        frames += resp_data['movies'][movie_url]['frames']
        if 'frame_dimensions' in resp_data['movies'][movie_url]:
            frame_dimensions = resp_data['movies'][movie_url]['frame_dimensions']
        if 'audio_url' in resp_data['movies'][movie_url]:
            audio_url = resp_data['movies'][movie_url]['audio_url']
    frames.sort()
    movies_obj = {}
    movies_obj['movies'] = {}
    movies_obj['movies'][movie_url] = {
        'frames': frames,
        'frame_dimensions': frame_dimensions,
    }
    if audio_url:
        movies_obj['movies'][movie_url]['audio_url'] = audio_url

    return movies_obj

def make_and_dispatch_hash_tasks(parent_job, split_tasks):
    movies_obj = gather_split_threaded_data(split_tasks)
    request_data = json.loads(parent_job.request_data)
    movie_url = request_data['movie_url']
    frameset_discriminator = request_data['frameset_discriminator']
    frames = movies_obj['movies'][movie_url]['frames']
    parent_job.response_data = json.dumps(movies_obj)
    parent_job.save()

    num_jobs = math.ceil(len(frames) / hash_frames_batch_size)
    for i in range(num_jobs):
        start_point = i * hash_frames_batch_size
        end_point = ((i+1) * hash_frames_batch_size)
        if i == (num_jobs-1):
            end_point = len(frames)
        build_movie_obj = {}
        build_movie_obj['movies'] = {}
        build_movie_obj['movies'][movie_url] = {
            'frames': frames[start_point:end_point],
            'frameset_discriminator': frameset_discriminator,
        }
        request_data = json.dumps(build_movie_obj)
        job = Job(
            request_data=request_data,
            status='created',
            description='hash_movie',
            app='parse',
            operation='hash_movie',
            sequence=i,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('make and dispatch hash tasks, dispatching job {}'.format(job.id))
        hash_frames.delay(job.id)
        if i % 3 == 0:
            split_and_hash_threaded.delay(parent_job.id)
    return

def get_movie_length_in_seconds(movie_url):
    worker = ParseViewSetSplitMovie()
    duration = worker.get_movie_length_in_seconds(movie_url)
    return duration
    
def make_and_dispatch_split_tasks(parent_job):
    request_data = json.loads(parent_job.request_data)
    movie_url = request_data['movie_url']
    movie_length_seconds = get_movie_length_in_seconds(movie_url)
    if movie_length_seconds < split_frames_multithreaded_threshold:
        parent_job.status = 'running'
        parent_job.save()
        job = Job(
            request_data=parent_job.request_data,
            status='created',
            description='split_movie',
            app='parse',
            operation='split_movie',
            sequence=0,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('make and dispatch split tasks, dispatching job {}'.format(job.id))
        split_movie.delay(job.id)
    else: 
        build_and_dispatch_split_tasks_multithreaded(parent_job, movie_url, movie_length_seconds)

def build_and_dispatch_split_tasks_multithreaded(parent_job, movie_url, movie_length_seconds):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    movie_url = request_data['movie_url']
    preserve_movie_audio = False
    num_jobs = math.ceil(movie_length_seconds/split_frames_chunk_size)
    for i in range(num_jobs):
        build_request_data = {}
        build_request_data['movie_url'] = movie_url
        start_offset = i * split_frames_chunk_size
        build_request_data['start_seconds_offset'] = start_offset
        if i < num_jobs - 1:
            build_request_data['num_frames'] = split_frames_chunk_size
        else:
            build_request_data['num_frames'] = movie_length_seconds % split_frames_chunk_size
        job = Job(
            request_data=json.dumps(build_request_data),
            status='created',
            description='split_movie threaded',
            app='parse',
            operation='split_movie',
            sequence=0,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('build and dispatch split tasks multithreaded, dispatching job {}'.format(job.id))
        split_movie.delay(job.id)
        if i % 5 == 0:
            if parent_job.operation == 'split_and_hash_threaded': 
                split_and_hash_threaded.delay(parent_job.id)
            if parent_job.operation == 'split_threaded': 
                split_threaded.delay(parent_job.id)
    if 'preserve_movie_audio' in request_data and request_data['preserve_movie_audio']:
        build_request_data = {}
        build_request_data['movie_url'] = movie_url
        build_request_data['preserve_movie_audio'] = request_data['preserve_movie_audio']
        build_request_data['start_seconds_offset'] = 0
        build_request_data['num_frames'] = 0
        job = Job(
            request_data=json.dumps(build_request_data),
            status='created',
            description='split_movie threaded',
            app='parse',
            operation='split_movie',
            sequence=0,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('build and dispatch split tasks multithreaded, dispatching job {} for audio'.format(job.id))
        split_movie.delay(job.id)
    if parent_job.operation == 'split_and_hash_threaded': 
        split_and_hash_threaded.delay(parent_job.id)
    elif parent_job.operation == 'split_threaded': 
        split_threaded.delay(parent_job.id)

@shared_task
def copy_movie(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling copy_movie on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetCopyMovie()
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

@shared_task
def change_movie_resolution(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling change_movie_resolution on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetChangeMovieResolution()
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

@shared_task
def rebase_movies(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling rebase_movies on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetRebaseMovies()
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

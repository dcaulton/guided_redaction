from celery import shared_task                                                  
from urllib.parse import urlsplit
import pprint
import math
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.utils.task_shared import (
    evaluate_children,
    get_job_anticipated_operation_count,
    make_anticipated_operation_count_attribute_for_job,
    build_file_directory_user_attributes_from_movies,
    get_pipeline_for_job
)
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.api import PipelinesViewSetDispatch
from guided_redaction.parse.api import (
        ParseViewSetZipMovie,
        ParseViewSetSplitMovie,
        ParseViewSetCopyMovie,
        ParseViewSetChangeMovieResolution,
        ParseViewSetRebaseMovies,
        ParseViewSetRenderSubsequence,
        ParseViewSetHashFrames
)


hash_frames_batch_size = 50
split_frames_multithreaded_threshold = 200
split_frames_chunk_size = 100
max_retry_count = 10

def dispatch_parent_job(job):
    if job.parent_id:
        parent_job = Job.objects.get(pk=job.parent_id)
        if parent_job.app == 'parse' and parent_job.operation == 'split_and_hash_threaded':
            split_and_hash_threaded.delay(parent_job.id)
        if parent_job.app == 'parse' and parent_job.operation == 'zip_movie_threaded':
            zip_movie_threaded.delay(parent_job.id)
        if parent_job.app == 'parse' and parent_job.operation == 'split_threaded':
            split_threaded.delay(parent_job.id)

@shared_task
def zip_movie_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        next_step = evaluate_children('ZIP MOVIE THREADED', 'zip_movie', children)
        print('next step is {}'.format(next_step))
        request_data = json.loads(job.request_data)
        if next_step == 'build_child_tasks':
            build_and_dispatch_zip_movie_tasks(job)
        elif next_step == 'noop':
            pass
        elif next_step == 'wrap_up':
            movies_obj = wrap_up_zip_movie_threaded(children, job)
            pipeline = get_pipeline_for_job(job.parent)
            if pipeline:
                worker = PipelinesViewSetDispatch()
                worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
            job.status = 'failed'
            job.harvest_failed_child_job_errors(children)
            job.save()

def get_frameset_hash_for_image_url(framesets, image_url):
    for frameset_hash in framesets:
        if image_url in framesets[frameset_hash]['images']:
            return frameset_hash
    print('WARNING couldnt find a match for image url {}'.format(image_url))
    return list(framesets.keys())[0]

def get_final_image_for_frameset_hash(framesets, frameset_hash):
    frameset = framesets[frameset_hash]
    if 'illustrated_image' in frameset:
        return frameset['illustrated_image']
    if 'redacted_image' in frameset:
        return frameset['redacted_image']
    return frameset['images'][0]

def build_and_dispatch_zip_movie_tasks(parent_job):
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    movies = request_data['movies']
    for index, movie_url in enumerate(movies.keys()):
        movie = movies[movie_url]
        build_image_urls = []
        for source_image_url in movie['frames']:
            frameset_hash = get_frameset_hash_for_image_url(movie['framesets'], source_image_url)
            final_image_url = get_final_image_for_frameset_hash(movie['framesets'], frameset_hash)
            build_image_urls.append(final_image_url)
        inbound_filename = (urlsplit(movie_url)[2]).split("/")[-1]
        (file_basename, file_extension) = os.path.splitext(inbound_filename)
        new_filename = file_basename + "_redacted" + file_extension
        payload_obj = {
            'image_urls': build_image_urls,
            'new_movie_name': new_filename,
            'movie_url': movie_url,
        }
        if movie.get('audio_url'):
            payload_obj['audio_url'] = movie.get('audio_url')

        build_request_data = json.dumps(payload_obj)

        job = Job(
            request_data=build_request_data,
            status='created',
            description='zip movie for movie {}'.format(movie_url),
            app='parse',
            operation='zip_movie',
            sequence=0,
            parent=parent_job,
        )
        job.save()
        print('build_and_dispatch_zip_movie_tasks: dispatching job for movie {}'.format(movie_url))
        zip_movie.delay(job.id)

def wrap_up_zip_movie_threaded(zip_tasks, parent_job):
    print('wrapping up zip_movie_threaded')
    movies = {}
    for i, zip_task in enumerate(zip_tasks):
        resp_data = json.loads(zip_task.response_data)
        req_data = json.loads(zip_task.request_data)
        movies[req_data['movie_url']] = {
            'redacted_movie_url': resp_data['movie_url']
        }
    parent_job.response_data = json.dumps(movies)
    parent_job.status = 'success'
    parent_job.save()

    return movies

@shared_task
def zip_movie(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling zip_movie on nonexistent job: {}'.format(job_uuid))
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetZipMovie()
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

        dispatch_parent_job(job)

@shared_task
def split_threaded(job_uuid):
    if Job.objects.filter(pk=job_uuid).exists():
        job = Job.objects.get(pk=job_uuid)
        if job.status in ['success', 'failed']:
            return
        children = Job.objects.filter(parent=job)
        next_step = evaluate_children('SPLIT THREADED', 'split_movie', children)
        print('next step is {}'.format(next_step))
        request_data = json.loads(job.request_data)
        movie_url = request_data['movie_url']
        if next_step == 'build_child_tasks':
            movie_length_seconds = get_movie_length_in_seconds(movie_url)
            build_and_dispatch_split_tasks_multithreaded(job, movie_url, movie_length_seconds)
        elif next_step == 'noop':
            pass
        elif next_step == 'wrap_up':
            movies_obj = gather_split_threaded_data(children)
            movies_obj['movies'][movie_url]['framesets'] = {}
            frames = movies_obj['movies'][movie_url]
            job.response_data = json.dumps(movies_obj)
            job.status = 'success'
            job.save()
        elif next_step == 'abort':
            job.status = 'failed'
            job.harvest_failed_child_job_errors(children)
            job.save()

@shared_task
def split_movie(job_uuid):
    print('split movie, job id is {}'.format(job_uuid))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling split_movie on nonexistent job: {}'.format(job_uuid))
        return

    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetSplitMovie()

        for i in range(max_retry_count):
            response = worker.process_create_request(request_data)
            if not Job.objects.filter(pk=job_uuid).exists():
                return
            job = Job.objects.get(pk=job_uuid)
            job.response_data = json.dumps(response.data)
            if 'errors' in job.response_data:
                if i < max_retry_count - 1:
                    print('split movie failed, retrying number {}'.format(i))
                    continue
                job.status = 'failed'
                job.save()
            else:
                job.status = 'success'
                job.save()
                break

        build_file_directory_user_attributes_from_movies(job, response.data) 

        dispatch_parent_job(job)

@shared_task
def hash_frames(job_uuid):
    print('hash frames, job id is {}'.format(job_uuid))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling hash_frames on nonexistent job: {}'.format(job_uuid))
        return
    job = Job.objects.get(pk=job_uuid)
    job.status = 'running'
    job.save()

    request_data = json.loads(job.request_data)
    worker = ParseViewSetHashFrames()


    for i in range(max_retry_count):
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)

        if 'errors' in response.data:
            if i < max_retry_count - 1:
                print('hash movie failed, retrying number {}'.format(i))
                continue
            job.response_data = json.dumps(response.data)
            job.status = 'failed'
            job.save()
        else:
            movie_url = list(request_data['movies'].keys())[0]
            movie_obj = request_data
            movie_obj['movies'][movie_url]['framesets'] = response.data['framesets']
            job.response_data = json.dumps(movie_obj)
            job.status = 'success'
            job.save()
            break

    dispatch_parent_job(job)

@shared_task
def split_and_hash_threaded(job_uuid):
    print('split and hash threaded, job id is {}'.format(job_uuid))
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling split_and_hash_threaded on nonexistent job: {}'.format(job_uuid))
        return
    job = Job.objects.get(pk=job_uuid)

    if job.status in ['success', 'failed']:
        return
    children = Job.objects.filter(parent=job)

    if children.filter(operation='hash_movie').exists():
        next_step = evaluate_children(
            'SPLIT HASH THREADED - HASH', 
            'hash_movie', 
            children
        )
        print('next post split step is {}'.format(next_step))
        if next_step == 'wrap_up':
            wrap_up_split_and_hash_threaded(job, children)
            pipeline = get_pipeline_for_job(job.parent)
            if pipeline:
                worker = PipelinesViewSetDispatch()
                worker.handle_job_finished(job, pipeline)
        elif next_step == 'abort':
            job.status = 'failed'
            job.harvest_failed_child_job_errors(children)
            job.save()
        return
    else:
        next_step = evaluate_children(
            'SPLIT HASH THREADED - SPLIT', 
            'split_movie', 
            children
        )
        print('next step is {}'.format(next_step))
        if next_step == 'build_child_tasks':
            num_tasks = make_and_dispatch_split_tasks(job)
            # assume twice as many hash tasks as split tasks
            make_anticipated_operation_count_attribute_for_job(job, num_tasks * 3)
        elif next_step == 'wrap_up':
            make_and_dispatch_hash_tasks(job, children)
        elif next_step == 'abort':
            job.status = 'failed'
            job.harvest_failed_child_job_errors(children)
            job.save()
        return

def wrap_up_split_and_hash_threaded(parent_job, children):
    framesets = {}
    hash_children = [x for x in children if x.operation == 'hash_movie']
    frameset_discriminators = {}
    for hash_child in hash_children:
        child_response_data = json.loads(hash_child.response_data)
        movie_url = list(child_response_data['movies'].keys())[0]
        if movie_url not in framesets:
            framesets[movie_url] = {}
        if movie_url not in frameset_discriminators:
            frameset_discriminators[movie_url] = ''
        child_response_framesets = child_response_data['movies'][movie_url]['framesets']
        resp_disc = child_response_data['movies'][movie_url]['frameset_discriminator']
        frameset_discriminators[movie_url] = resp_disc
        frameset_hashes = child_response_framesets.keys()
        for frameset_hash in frameset_hashes:
            child_response_images = child_response_framesets[frameset_hash]['images']
            if frameset_hash in framesets[movie_url]:
               framesets[movie_url][frameset_hash]['images'] += child_response_images
            else:
               framesets[movie_url][frameset_hash] = {}
               framesets[movie_url][frameset_hash]['images'] = child_response_images
            framesets[movie_url][frameset_hash]['images'].sort()
        
    resp_data = {}
    if parent_job.response_data:
        resp_data = json.loads(parent_job.response_data)
    req_data = {}
    if parent_job.request_data:
        req_data = json.loads(parent_job.request_data)

    for movie_url in framesets:
        if 'movies' not in resp_data:
            continue
        resp_data['movies'][movie_url]['framesets'] = framesets[movie_url]
        resp_data['movies'][movie_url]['frameset_discriminator'] = frameset_discriminators[movie_url]
    parent_job.response_data = json.dumps(resp_data)
    parent_job.status = 'success'
    parent_job.save()
    print('wrapping up split and hash threaded')

def gather_split_threaded_data(split_tasks):
    frames = {}
    audio_urls = {}
    frame_dimensions = {}
    for i, split_task in enumerate(split_tasks):
        resp_data = json.loads(split_task.response_data)
        req_data = json.loads(split_task.request_data)
        movie_url = req_data['movie_url']
        if movie_url not in frames:
            frames[movie_url] = []
        frames[movie_url] += resp_data['movies'][movie_url]['frames']
        if 'frame_dimensions' in resp_data['movies'][movie_url]:
            frame_dimensions[movie_url] = resp_data['movies'][movie_url]['frame_dimensions']
        if 'audio_url' in resp_data['movies'][movie_url]:
            audio_urls[movie_url] = resp_data['movies'][movie_url]['audio_url']
    for movie_url in frames:
        frames[movie_url].sort()
    movies_obj = {}
    movies_obj['movies'] = {}
    for movie_url in frames:
        movies_obj['movies'][movie_url] = {
            'frames': frames[movie_url],
            'frame_dimensions': frame_dimensions[movie_url],
        }
        if movie_url in audio_urls:
            movies_obj['movies'][movie_url]['audio_url'] = audio_urls[movie_url]

    return movies_obj

def add_hash_counts_to_parent_job_operation_count(parent_job, movies_obj):
    num_jobs = 0
    earlier_job_count = get_job_anticipated_operation_count(parent_job)
    for movie_url in movies_obj['movies']:
        frames = movies_obj['movies'][movie_url]['frames']
        num_jobs += math.ceil(len(frames) / hash_frames_batch_size)
    make_anticipated_operation_count_attribute_for_job(parent_job, earlier_job_count + num_jobs)

def make_and_dispatch_hash_tasks(parent_job, split_tasks):
    movies_obj = gather_split_threaded_data(split_tasks)
    add_hash_counts_to_parent_job_operation_count(parent_job, movies_obj)
    request_data = json.loads(parent_job.request_data)
    job_ids_to_dispatch = []
    for movie_url in movies_obj['movies']:
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
            build_request_data = json.dumps(build_movie_obj)
            job = Job(
                request_data=build_request_data,
                status='created',
                description='hash_movie',
                app='parse',
                operation='hash_movie',
                sequence=i,
                parent=parent_job,
            )
            job.save()
            job_ids_to_dispatch.append(job.id)

    for job_id in job_ids_to_dispatch:
        print('make and dispatch hash tasks, dispatching job {}'.format(job_id))
        hash_frames.delay(job_id)

def get_movie_length_in_seconds(movie_url):
    worker = ParseViewSetSplitMovie()
    duration = worker.get_movie_length_in_seconds(movie_url)
    return duration
    
def make_and_dispatch_split_tasks(parent_job):
    request_data = json.loads(parent_job.request_data)
    num_tasks = 0
    job_ids_to_dispatch = []
    for movie_url in request_data['movie_urls']:
        movie_length_seconds = get_movie_length_in_seconds(movie_url)
        build_request_data = {'movie_url': movie_url}
        if movie_length_seconds < split_frames_multithreaded_threshold:
            Job.objects.filter(pk=parent_job.id).update(status='running')
            job = Job(
                request_data=json.dumps(build_request_data),
                status='created',
                description='split_movie',
                app='parse',
                operation='split_movie',
                sequence=0,
                parent=parent_job,
            )
            job.save()
            job_ids_to_dispatch.append(job.id)
            num_tasks += 1
        else: 
            num_tasks = build_and_dispatch_split_tasks_multithreaded(
                parent_job, 
                movie_url, 
                movie_length_seconds
            )

    for job_id in job_ids_to_dispatch:
        print('make and dispatch split tasks, dispatching job {} for {}'.format(job_id, movie_url))
        split_movie.delay(job_id)

    return num_tasks

def build_and_dispatch_split_tasks_multithreaded(
        parent_job, 
        movie_url, 
        movie_length_seconds
    ):
    number_of_tasks_created = 0
    parent_job.status = 'running'
    parent_job.save()
    request_data = json.loads(parent_job.request_data)
    preserve_movie_audio = False
    num_jobs = math.ceil(movie_length_seconds/split_frames_chunk_size)
    for i in range(num_jobs):
        build_request_data = {'movie_url': movie_url}
        start_offset = i * split_frames_chunk_size
        build_request_data['start_seconds_offset'] = start_offset
        if i < num_jobs - 1:
            build_request_data['num_frames'] = split_frames_chunk_size
        else:
            build_request_data['num_frames'] = \
                movie_length_seconds % split_frames_chunk_size
        job = Job(
            request_data=json.dumps(build_request_data),
            status='created',
            description='split_movie threaded',
            app='parse',
            operation='split_movie',
            sequence=0,
            parent=parent_job,
        )
        job.save()
        number_of_tasks_created += 1
        print('build and dispatch split tasks multithreaded, dispatching job {} for {}'.format(job.id, movie_url))
        split_movie.delay(job.id)
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
            parent=parent_job,
        )
        job.save()
        print('build and dispatch split tasks multithreaded, dispatching job {} for audio'.format(job.id))
        split_movie.delay(job.id)
    dispatch_parent_job(job)
    return number_of_tasks_created

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

@shared_task
def render_subsequence(job_uuid):
    if not Job.objects.filter(pk=job_uuid).exists():
        print('calling render_subsequence on nonexistent job: '+ job_uuid) 
        return
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        worker = ParseViewSetRenderSubsequence()
        response = worker.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        job.response_data = json.dumps(response.data)
        job.status = 'success'
        job.save()

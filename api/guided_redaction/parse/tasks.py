from celery import shared_task                                                  
import pprint
import math
import os
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.parse.api import (
        ParseViewSetSplitAndHashMovie, 
        ParseViewSetZipMovie,
        ParseViewSetSplitMovie,
        ParseViewSetHashFrames
)


hash_frames_batch_size = 50

@shared_task
def split_and_hash_movie(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        print('scanning template for job ', job_uuid)
        pvssahm = ParseViewSetSplitAndHashMovie()
        response_data = pvssahm.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        if response_data['errors_400']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_400'])
        elif response_data['errors_422']:
            job.status = 'failed'
            job.response_data = json.dumps(response_data['errors_422'])
        else:
            job.response_data = json.dumps(response_data['response_data'])
            new_uuid = get_file_uuid_from_response(response_data['response_data'])
            # TODO add to file uuids used for the job
            job.status = 'success'
        job.save()
    else:
        print('calling split_and_hash_movie on nonexistent job: '+ job_uuid) 

def get_file_uuid_from_response(response_dict):
    if 'frames' in response_dict and response_dict['frames']:
        (x_part, file_part) = os.path.split(response_dict['frames'][0])
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part and len(uuid_part) == 36:
            return uuid_part
@shared_task
def zip_movie(job_uuid):
    job = Job.objects.get(pk=job_uuid)
    if job:
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
    else:
        print('calling zip_movie on nonexistent job: '+ job_uuid) 

@shared_task
def split_movie(job_uuid):
    # TODO make this threading aware
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        pvssahm = ParseViewSetSplitMovie()
        response_data = pvssahm.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
        if response_data['errors_400']:
            job.status = 'failed'
            print('split movie: failed')
            job.response_data = json.dumps(response_data['errors_400'])
        elif response_data['errors_422']:
            job.status = 'failed'
            print('split movie: failed')
            job.response_data = json.dumps(response_data['errors_422'])
        else:
            job.response_data = json.dumps(response_data['response_data'])
            print('split movie: finished job')
            job.status = 'success'
        job.save()

        if job.parent_id:
            parent_job = Job.objects.get(pk=job.parent_id)
            if parent_job.app == 'parse' and parent_job.operation == 'split_and_hash_threaded':
                split_and_hash_threaded.delay(parent_job.id)
    else:
        print('calling split_movie on nonexistent job: '+ job_uuid) 

@shared_task
def hash_frames(job_uuid):
    # TODO make this threading aware
    job = Job.objects.get(pk=job_uuid)
    if job:
        job.status = 'running'
        job.save()
        request_data = json.loads(job.request_data)
        pvssahm = ParseViewSetHashFrames()
        response_data = pvssahm.process_create_request(request_data)
        if not Job.objects.filter(pk=job_uuid).exists():
            return
        job = Job.objects.get(pk=job_uuid)
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
    unique_frames = {}
    hash_children = [x for x in children if x.operation == 'hash_frames']
    for hash_child in hash_children:
        child_response_data = json.loads(hash_child.response_data)
        frameset_hashes = child_response_data['unique_frames'].keys()
        for frameset_hash in frameset_hashes:
            if frameset_hash in unique_frames:
               unique_frames[frameset_hash]['images'] += child_response_data['unique_frames'][frameset_hash]['images']
            else:
               unique_frames[frameset_hash] = {}
               unique_frames[frameset_hash]['images'] = child_response_data['unique_frames'][frameset_hash]['images']
            unique_frames[frameset_hash]['images'] = sorted(unique_frames[frameset_hash]['images'])
        
    resp_data = json.loads(parent_job.response_data)
    resp_data['unique_frames'] = unique_frames
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
        elif child.operation == 'hash_frames':
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
    elif split_movie_children == split_movie_completed_children and hash_frames_children == 0:
        return ('make_and_dispatch_hash_tasks', .5)
    elif split_movie_failed_children > 0:
        return ('abort', 0)

def make_and_dispatch_hash_tasks(parent_job, split_tasks):
    frames = []
    for i, split_task in enumerate(split_tasks):
        resp_data = json.loads(split_task.response_data)
        frames += resp_data['frames']
        frame_dimensions = resp_data['frame_dimensions']
    parent_job.response_data = json.dumps({
        'frames': frames,
        'frame_dimensions': frame_dimensions,
    })
    parent_job.save()

    frameset_discriminator = json.loads(parent_job.request_data)['frameset_discriminator']
    num_jobs = math.ceil(len(frames) / hash_frames_batch_size)
    for i in range(num_jobs):
        start_point = i * hash_frames_batch_size
        end_point = ((i+1) * hash_frames_batch_size)
        if i == (num_jobs-1):
            end_point = len(frames)
        request_data = json.dumps({
            'frames': frames[start_point:end_point],
            'frameset_discriminator': frameset_discriminator,
        })
        job = Job(
            request_data=request_data,
            status='created',
            description='hash_frames',
            app='parse',
            operation='hash_frames',
            sequence=i,
            elapsed_time=0.0,
            parent=parent_job,
        )
        job.save()
        print('make and dispatch hash tasks, dispatching job '+str(job.id))
        hash_frames.delay(job.id)
        if i % 3 == 0:
            split_and_hash_threaded.delay(parent_job.id)
    return

def make_and_dispatch_split_tasks(parent_job):
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
    print('make and dispatch split tasks, dispatching job '+str(job.id))
    split_movie.delay(job.id)



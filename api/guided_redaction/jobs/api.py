import uuid
import json
import os
from django.conf import settings
import requests
import shutil
from rest_framework.response import Response
from base import viewsets
from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.analyze import tasks as analyze_tasks
from guided_redaction.parse import tasks as parse_tasks
from guided_redaction.redact import tasks as redact_tasks
from guided_redaction.files import tasks as files_tasks
from guided_redaction.pipelines import tasks as pipelines_tasks
import json
import pytz
import math


def get_job_file_dirs_recursive(job):
    file_dirs = job.get_file_dirs()
    if Job.objects.filter(parent=job).exists():
        children = Job.objects.filter(parent=job)
        for child in children:
            job_file_dirs = get_job_file_dirs_recursive(child)
            for fd in job_file_dirs:
                if fd not in file_dirs:
                    file_dirs.append(fd)
    return file_dirs

def dispatch_job_wrapper(job, restart_unfinished_children=True):
    if restart_unfinished_children:
        children = Job.objects.filter(parent=job)
        for child_to_restart in children:
            if Job.objects.filter(parent=child_to_restart).exists():
                grandchildren = Job.objects.filter(parent=child_to_restart)
                for grandchild in grandchildren:
                    if grandchild.status not in ['success', 'failed']:
                        print('re-displatching grandchild job {}'.format(grandchild))
                        dispatch_job(grandchild)
            else:
                if child_to_restart.status not in ['success', 'failed']:
                    print('re-displatching child job {}'.format(child_to_restart))
                    dispatch_job(child_to_restart)
    dispatch_job(job)

def dispatch_job(job):
    job_uuid = job.id
    if job.app == 'analyze' and job.operation == 'scan_template_threaded':
        analyze_tasks.scan_template_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'scan_template_multi':
        analyze_tasks.scan_template_multi.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'filter':
        analyze_tasks.filter.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'scan_ocr_movie':
        analyze_tasks.scan_ocr_movie.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'scan_ocr':
        analyze_tasks.scan_ocr_movie.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'telemetry_find_matching_frames':
        analyze_tasks.telemetry_find_matching_frames.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'get_timestamp':
        analyze_tasks.get_timestamp.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'get_timestamp_threaded':
        analyze_tasks.get_timestamp_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'selected_area_threaded':
        analyze_tasks.selected_area_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'template_match_chart':
        analyze_tasks.template_match_chart.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'ocr_match_chart':
        analyze_tasks.ocr_match_chart.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'ocr_scene_analysis_chart':
        analyze_tasks.ocr_scene_analysis_chart.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'selected_area_chart':
        analyze_tasks.selected_area_chart.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'ocr_scene_analysis_threaded':
        analyze_tasks.ocr_scene_analysis_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'oma_first_scan_threaded':
        analyze_tasks.oma_first_scan_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'entity_finder_threaded':
        analyze_tasks.entity_finder_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'hog_train_threaded':
        analyze_tasks.train_hog_threaded.delay(job_uuid)
    if job.app == 'analyze' and job.operation == 'hog_test':
        analyze_tasks.test_hog.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'split_and_hash_threaded':
        parse_tasks.split_and_hash_threaded.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'split_threaded':
        parse_tasks.split_threaded.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'hash_movie':
        parse_tasks.hash_frames.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'copy_movie':
        parse_tasks.copy_movie.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'change_movie_resolution':
        parse_tasks.change_movie_resolution.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'rebase_movies':
        parse_tasks.rebase_movies.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'render_subsequence':
        parse_tasks.render_subsequence.delay(job_uuid)
    if job.app == 'redact' and job.operation == 'redact':
        redact_tasks.redact_threaded.delay(job_uuid)
    if job.app == 'redact' and job.operation == 'redact_single':
        redact_tasks.redact_single.delay(job_uuid)
    if job.app == 'redact' and job.operation == 'illustrate':
        redact_tasks.illustrate.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'zip_movie':
        parse_tasks.zip_movie.delay(job_uuid)
    if job.app == 'parse' and job.operation == 'zip_movie_threaded':
        parse_tasks.zip_movie_threaded.delay(job_uuid)
    if job.app == 'files' and job.operation == 'get_secure_file':
        files_tasks.get_secure_file.delay(job_uuid)
    if job.app == 'files' and job.operation == 'save_movie_metadata':
        files_tasks.save_movie_metadata.delay(job_uuid)
    if job.app == 'files' and job.operation == 'load_movie_metadata':
        files_tasks.load_movie_metadata.delay(job_uuid)
    if job.app == 'pipelines' and job.operation == 't1_sum':
        pipelines_tasks.t1_sum.delay(job_uuid)


class JobsViewSet(viewsets.ViewSet):
    def pretty_date(self, time=False):
        """
        Get a datetime object or a int() Epoch timestamp and return a
        pretty string like 'an hour ago', 'Yesterday', '3 months ago',
        'just now', etc
        """
        from datetime import datetime
        now = datetime.utcnow()
        now = now.replace(tzinfo=pytz.utc)
        if type(time) is int:
            diff = now - datetime.fromtimestamp(time)
        elif isinstance(time,datetime):
            diff = now - time
        elif not time:
            diff = now - now
        second_diff = diff.seconds
        day_diff = diff.days

        if day_diff < 0:
            return ''

        if day_diff == 0:
            if second_diff < 10:
                return "just now"
            if second_diff < 60:
                return str(second_diff) + " seconds ago"
            if second_diff < 120:
                return "a minute ago"
            if second_diff < 3600:
                return str(second_diff // 60) + " minutes ago"
            if second_diff < 7200:
                return "an hour ago"
            if second_diff < 86400:
                return str(second_diff // 3600) + " hours ago"
        if day_diff == 1:
            return "yesterday"
        if day_diff < 7:
            return str(day_diff) + " days ago"
        if day_diff < 31:
            return str(day_diff // 7) + " weeks ago"
        if day_diff < 365:
            return str(day_diff // 30) + " months ago"
        return str(day_diff // 365) + " years ago"

    def partial_update(self, request, pk=None):
        job = Job.objects.get(pk=pk)
        job_updated = False
        if request.data.get('status'):
            job.status = request.data.get('status')
            job_updated = True
        if request.data.get('response_data'):
            job.response_data = request.data.get('response_data')
            job_updated = True
        if request.data.get('percent_complete'):
            pct_complete = float(request.data.get('percent_complete'))
            job.update_percent_complete(pct_complete)
            job_updated = True
        if job_updated:
            job.save()
        return Response({"job_updated": job_updated})


    def list(self, request):
        jobs_list = []
        if 'workbook_id' in request.GET.keys():
            jobs = Job.objects.filter(workbook_id=request.GET['workbook_id'])
        else:
            jobs = Job.objects.filter(parent_id__isnull=True)
 
        desired_cv_worker_id = ''
        if 'pick-up-for' in request.GET.keys():
            desired_cv_worker_id = request.GET['pick-up-for']

        user_id = ''
        if 'user_id' in request.GET.keys():
            if request.GET['user_id'] and \
                request.GET['user_id'] != 'undefined' and \
                request.GET['user_id'] != 'all':
                user_id = request.GET['user_id']

        for job in jobs:
            children = Job.objects.filter(parent_id=job.id).order_by('sequence')
            child_ids = [child.id for child in children]
            pretty_time = self.pretty_date(job.created_on)
            wall_clock_run_time = str(job.updated - job.created_on)

            owner = job.get_owner()
            if user_id and owner != user_id:
                continue
            if desired_cv_worker_id:
                if job.get_cv_worker_id() != desired_cv_worker_id:
                    continue

            attrs = {}
            if Attribute.objects.filter(job=job).exists():
                attributes = Attribute.objects.filter(job=job)
                for attribute in attributes:
                    if attribute.name not in ['user_id', 'file_dir_user']:
                        attrs[attribute.name] = attribute.value

            job_obj = {
                'id': job.id,
                'status': job.status,
                'description': job.description,
                'created_on': job.created_on,
                'updated': job.updated,
                'pretty_created_on': pretty_time,
                'percent_complete': job.percent_complete,
                'wall_clock_run_time': wall_clock_run_time,
                'app': job.app,
                'operation': job.operation,
                'workbook_id': job.workbook_id,
                'owner': owner,
                'children': child_ids,
            }
            file_dirs = get_job_file_dirs_recursive(job)
            if file_dirs:
                job_obj['file_dirs'] = file_dirs
            if owner:
                job_obj['owner'] = owner
            if attrs:
                job_obj['attributes'] = attrs

            jobs_list.append(job_obj)

        return Response({"jobs": jobs_list})

    def retrieve(self, request, pk):
        job = Job.objects.get(pk=pk)
        children = Job.objects.filter(parent_id=job.id).order_by('sequence')
        child_ids = [child.id for child in children]
        pretty_time = self.pretty_date(job.created_on)
        wall_clock_run_time = str(job.updated - job.created_on)

        job_data = {
            'id': job.id,
            'status': job.status,
            'description': job.description,
            'created_on': job.created_on,
            'updated': job.updated,
            'pretty_created_on': pretty_time,
            'percent_complete': job.percent_complete,
            'wall_clock_run_time': wall_clock_run_time,
            'app': job.app,
            'operation': job.operation,
            'workbook_id': job.workbook_id,
            'parent_id': job.parent_id,
            'request_data': job.request_data,
            'response_data': job.response_data,
            'children': child_ids,
        }

        owner = job.get_owner()
        attrs = {}
        if Attribute.objects.filter(job=job).exists():
            attributes = Attribute.objects.filter(job=job)
            for attribute in attributes:
                if attribute.name not in ['user_id', 'file_dir_user']:
                    attrs[attribute.name] = attribute.value
        if owner:
            job_data['owner'] = owner
        if attrs:
            job_data['attributes'] = attrs
        file_dirs = get_job_file_dirs_recursive(job)
        if file_dirs:
            job_data['file_dirs'] = file_dirs

        return Response({"job": job_data})

    def build_job(self, request):
        job = Job(
            request_data=json.dumps(request.data.get('request_data')),
            status='created',
            description=request.data.get('description', 'something weird'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
            workbook_id=request.data.get('workbook_id'),
        )
        job.save()

        owner_id = request.data.get('owner')
        if owner_id:
            job.add_owner(owner_id)
        if request.data.get('routing_data'):
            routing_data = request.data.get('routing_data')
            if (
                'cv_worker_id' in routing_data and 
                routing_data['cv_worker_id'] and
                'cv_worker_type' in routing_data and 
                routing_data['cv_worker_type']
            ):
                attribute = Attribute(
                    name='cv_worker_id',
                    value=routing_data['cv_worker_id'],
                    job=job,
                )
                attribute.save()
                attribute = Attribute(
                    name='cv_worker_type',
                    value=routing_data['cv_worker_type'],
                    job=job,
                )
                attribute.save()
        if request.data.get('lifecycle_data'):
            lifecycle_data = request.data.get('lifecycle_data')
            if 'delete_files_with_job' in lifecycle_data and lifecycle_data['delete_files_with_job']:
                attribute = Attribute(
                    name='delete_files_with_job',
                    value=lifecycle_data['delete_files_with_job'],
                    job=job,
                )
                attribute.save()
            if 'auto_delete_age' in lifecycle_data and lifecycle_data['auto_delete_age']:
                attribute = Attribute(
                    name='auto_delete_age',
                    value=lifecycle_data['auto_delete_age'],
                    job=job,
                )
                attribute.save()
        return job

    def dispatch_cv_worker_job(self, job):
        build_payload = {
          'operation': job.operation,
          'request_data': job.request_data,
          'job_update_url': 'http://localhost:8000/api/v1/jobs/' + str(job.id),
        }
        worker_url = job.get_cv_worker_id()
        worker_url = worker_url.replace('operations', 'tasks')

        response = requests.post(
            worker_url,
            data=build_payload,
        )
        resp_data = json.loads(response.content)
        if response.status_code == 200 and 'task_id' in resp_data:
            task_id = resp_data['task_id']
            attribute = Attribute(
                name='cv_task_id',
                value=task_id,
                job=job,
            )
            attribute.save()
        else:
            job.status = 'failed'
            job.response_data = json.dumps(['unhappy response from cv worker job dispatch'])
            job.save()

    def create(self, request):
        job = self.build_job(request)

        if job.is_cv_worker_task():
            if job.get_cv_worker_type() == 'accepts_calls':
                self.dispatch_cv_worker_job(job)
        else:
            self.schedule_job(job)

        return Response({"job_id": job.id})

    def delete(self, request, pk, format=None):
        job = Job.objects.get(pk=pk)

        if Attribute.objects.filter(job=job).filter(name='delete_files_with_job').exists():
            attributes = Attribute.objects.filter(job=job).filter(name='file_dir_user')
            for attribute in attributes:
                print('deleting the files in directory {}'.format(attribute.value))
                dirpath = os.path.join(settings.REDACT_FILE_STORAGE_DIR, attribute.value)
                try:
                    shutil.rmtree(dirpath)
                except Exception as err:
                    print('error deleting directory {} with job'.format(attribute.value))
        job.delete()
        return Response('', status=204)

    def replace_movie_uuids(self, movies_obj, movie_mappings):
        new_movies = {}
        for movie_url in movies_obj:
            movie_filename = movie_url.split('/')[-1]
            movie_uuid = movie_url.split('/')[-2]
            if movie_filename in movie_mappings:
                new_movie = movies_obj[movie_url]
                new_uuid = movie_mappings[movie_filename]
                new_movie_url = movie_url.replace(movie_uuid, new_uuid)
                if 'frames' in movies_obj[movie_url]:
                    new_frames = []
                    for frame in movies_obj[movie_url]['frames']:
                        new_frames.append(frame.replace(movie_uuid, new_uuid))
                    new_movie['frames'] = new_frames
                if 'framesets' in movies_obj[movie_url]:
                    new_framesets = {}
                    for frameset_hash in movies_obj[movie_url]['framesets']:
                        frameset = movies_obj[movie_url]['framesets'][frameset_hash]
                        new_frameset_images = []
                        if 'images' in frameset:
                            for fs_image in frameset['images']:
                                new_frameset_images.append(fs_image.replace(movie_uuid, new_uuid))
                            frameset['images'] = new_frameset_images
                        if 'redacted_image' in frameset:
                            del frameset['redacted_image']
                        if 'illustrated_image' in frameset:
                            del frameset['illustrated_image']
                        new_framesets[frameset_hash] = frameset
                    new_movie['framesets'] = new_framesets
                new_movies[new_movie_url] = new_movie
        return new_movies
        
    def rebase_jobs(self, pk):
        main_job = Job.objects.get(pk=pk)
        request_data = json.loads(main_job.request_data)
        movie_mappings = {}
        for movie_url in request_data['movie_urls']:
            movie_filename = movie_url.split('/')[-1]
            new_uuid = movie_url.split('/')[-2]
            movie_mappings[movie_filename] = new_uuid
        for job_id in request_data['job_ids']:
            job = Job.objects.get(pk=job_id)
            if job.id == pk:
                continue
            job_request_data = json.loads(job.request_data)
            job_response_data = json.loads(job.response_data)
            something_changed = False
            if 'movies' in job_request_data:
                something_changed = True
                job_request_data['movies'] = self.replace_movie_uuids(job_request_data['movies'], movie_mappings)
            if 'movies' in job_response_data:
                something_changed = True
                job_response_data['movies'] = self.replace_movie_uuids(job_response_data['movies'], movie_mappings)
            if something_changed:
                print('rebasing job {}'.format(job.id))
                job.request_data = json.dumps(job_request_data)
                job.response_data = json.dumps(job_response_data)
                job.save()
        main_job.status = 'success'
        main_job.save()

    def schedule_job(self, job):
        dispatch_job(job)
        if job.app == 'jobs' and job.operation == 'rebase_jobs':
            self.rebase_jobs(job.id)


class JobsViewSetWrapUp(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("job_id"):
            return self.error("job_id is required")
        job = Job.objects.get(pk=request.data.get('job_id'))
        children = Job.objects.filter(parent=job)
        unfinished_children_exist = False
        for child in children:
            if child.status not in ['success', 'failed']:
                unfinished_children_exist = True
        if unfinished_children_exist:
            dispatch_job_wrapper(job, restart_unfinished_children=True)
        else:
            dispatch_job(job)
            
        return Response({'job_id': job.id})

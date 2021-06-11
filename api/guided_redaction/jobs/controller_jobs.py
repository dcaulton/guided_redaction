import json
import os
import uuid
from datetime import datetime, timedelta

from itertools import chain
from django.conf import settings

from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.utils.task_shared import get_job_owner, query_profiler
from guided_redaction.utils.classes.FileWriter import FileWriter


def get_top_parent(job_id, parent_data):
    while True:
        if job_id in parent_data and parent_data[job_id]:
            job_id = parent_data[job_id]
        else:
            break
    return job_id

def get_jobs_info():
    # dict of child_id:parent_id for all child jobs
    jobs_list = list(Job.objects.select_related("parent").values("id", "parent_id"))
    parent_data = { str(j["id"]):str(j["parent_id"] or "") for j in jobs_list }
    file_dir_attrs = (Attribute.objects
            .filter(name="file_dir_user")
            .exclude(job=None)
            .select_related("job")
    )
    owner_attrs = (Attribute.objects
            .filter(name="user_id")
            .exclude(job=None)
            .select_related("job")
    )
    info_data = {"file_dirs": {}, "owners": {}}
    file_dir_data = info_data["file_dirs"]
    owner_data = info_data["owners"]
    info = {}
    for key, attr_var in (("file_dirs", file_dir_attrs), ("owners", owner_attrs)):
        sub_data = info_data[key]
        for attr in attr_var:
            if attr.job and attr.job.id in sub_data:
                if key == "file_dirs":
                    sub_data[str(attr.job.id)].add(attr.value.split(":")[-2])
                else:
                    sub_data[str(attr.job.id)].add(attr.value)
            elif attr.job:
                if key == "file_dirs":
                    sub_data[str(attr.job.id)] = set([attr.value.split(":")[-2]])
                else:
                    sub_data[str(attr.job.id)] = set([attr.value])
        info[key] = {}
        for job_id in parent_data.keys():
            top_parent_id = get_top_parent(job_id, parent_data)
            if job_id in sub_data:
                if top_parent_id in info[key]:
                    info[key][top_parent_id] = \
                        info[key][top_parent_id].union(sub_data[job_id])
                else:
                    info[key][top_parent_id] = sub_data[job_id]
    return info

def get_job_file_dirs(job):
    return get_job_file_dirs_recursive(job)

def get_job_file_dirs_recursive(job):
    file_dirs = job.get_file_dirs()
    for child in job.children.all():
        job_file_dirs = get_job_file_dirs_recursive(child)
        for fd in job_file_dirs:
            if fd not in file_dirs:
                file_dirs.append(fd)
    return file_dirs

def handle_delete_job(pk):
    job = Job.objects.get(pk=pk)
    file_dirs = get_job_file_dirs(job)
    job_attrs = Attribute.objects.filter(job=job)

    if (job_attrs.filter(name='delete_files_with_job').exists() and
            job_attrs.filter(name='delete_files_with_job').first().value == 'True'):
        try:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            for file_dir_uuid in file_dirs:
                print('deleting the files in directory {}'.format(file_dir_uuid))
                fw.delete_directory(file_dir_uuid)
        except Exception as err:
            print('error deleting directory {} with job'.format(job.id))
    job.delete()


class JobCrudController:

    def list(self):
        jobs_list = []
        noparent_jobs = Job.objects.filter(parent_id=None)
        noparent_jobs = noparent_jobs.prefetch_related("children", "attributes")
        pipeline_jobs = Job.objects.filter(app='pipeline').filter(operation='pipeline').exclude(parent_id=None)
        pipeline_jobs = pipeline_jobs.prefetch_related("children", "attributes")
        jobs = chain(noparent_jobs, pipeline_jobs)
        info = get_jobs_info()
        file_dirs = info["file_dirs"]
        owners = info["owners"]

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        for job in jobs:
            job_id = str(job.id)
            child_ids = [child.id for child in job.children.order_by('created_on').all()]
            pretty_time = job.pretty_date(job.created_on)
            wall_clock_run_time = job.get_wall_clock_run_time_string()
            owner = owners[job_id] if job_id in owners else ""

            attrs = self.get_attributes_as_dict(job)

            response_data_size = 0
            response_data_url = request_data_url = ''
            if job.response_data:
                response_data_size = len(job.response_data)
            if job.response_data_path:
                response_data_size = 'very large'
                response_data_url = fw.get_url_for_file_path(job.response_data_path)
            request_data_size = 0
            if job.request_data:
                request_data_size = len(job.request_data)
            if job.request_data_path:
                request_data_size = 'very large'
                request_data_url = fw.get_url_for_file_path(job.request_data_path)
            job_obj = {
                'id': job_id,
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
                'response_size': response_data_size,
                'request_size': request_data_size,
            }
            if job_id in file_dirs:
                job_obj['file_dirs'] = file_dirs[job_id]
            if attrs:
                job_obj['attributes'] = attrs
            if response_data_url:
                job_obj['response_data_url'] = response_data_url
            if request_data_url:
                job_obj['request_data_url'] = request_data_url
            jobs_list.append(job_obj)
        return jobs_list

    def retrieve(self, pk):
        job = Job.objects.get(pk=pk)
        job_data = job.as_dict()
        owner = get_job_owner(job)
        if owner:
            job_data['owner'] = owner
        file_dirs = get_job_file_dirs(job)
        if file_dirs:
            job_data['file_dirs'] = file_dirs
        attrs = self.get_attributes_as_dict(job)
        if attrs:
            job_data['attributes'] = attrs
        return job_data

    def get_attributes_as_dict(self, job):
        attrs = {}
        if Attribute.objects.filter(job=job).exists():
            attributes = Attribute.objects.filter(job=job)
            for attribute in attributes:
                if attribute.name not in ['user_id', 'file_dir_user']:
                    attrs[attribute.name] = attribute.value
                if attribute.name == 'pipeline_job_link':
                    attrs[attribute.name] = attribute.pipeline_id
        return attrs

    def build_job(self, request_data):
        job = Job(
            request_data=json.dumps(request_data.get('request_data')),
            status='created',
            description=request_data.get('description', 'something weird'),
            app=request_data.get('app', 'bridezilla'),
            operation=request_data.get('operation', 'chucky'),
            sequence=0,
            workbook_id=request_data.get('workbook_id'),
        )
        job.save()

        owner_id = request_data.get('owner')
        if owner_id:
            job.add_owner(owner_id)
        if request_data.get('routing_data'):
            routing_data = request_data.get('routing_data')
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
        if request_data.get('lifecycle_data'):
            lifecycle_data = request_data.get('lifecycle_data')
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

    def delete(self, pk):
        handle_delete_job(pk)

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


class JobDeleteOldController:
    def delete_old_jobs(self):
        job_ids_to_delete = []
        for job in Job.objects.all().filter(parent=None):
            if Attribute.objects.filter(job=job).exists():
                attributes = Attribute.objects.filter(job=job)
                for attribute in attributes:
                    if attribute.name == 'auto_delete_age':
                        job_age = datetime.now() - job.created_on.replace(tzinfo=None)
                        print('job age is {}'.format(job_age))
                        if attribute.value == '20minutes' and job_age > timedelta(minutes=20):
                            job_ids_to_delete.append(job.id)
                        if attribute.value == '1hours' and job_age > timedelta(hours=1):
                            job_ids_to_delete.append(job.id)
                        if attribute.value == '8hours' and job_age > timedelta(hours=8):
                            job_ids_to_delete.append(job.id)
                        if attribute.value == '1days' and job_age > timedelta(days=1):
                            job_ids_to_delete.append(job.id)
                        if attribute.value == '7days' and job_age > timedelta(days=7):
                            job_ids_to_delete.append(job.id)
                        if attribute.value == '31days' and job_age > timedelta(days=31):
                            job_ids_to_delete.append(job.id)
        for job_id in job_ids_to_delete:
            handle_delete_job(job_id)

        resp_msg = '{} jobs deleted'.format(len(job_ids_to_delete))
        return resp_msg

import json
import logging
import math
import os
import shutil
import uuid
from collections import defaultdict
from traceback import format_exc
from datetime import datetime, timedelta
from itertools import chain

import pytz
import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework.response import Response

from base import viewsets, utils
from guided_redaction.analyze import tasks as analyze_tasks
from guided_redaction.attributes.models import Attribute
from guided_redaction.files import tasks as files_tasks
from guided_redaction.job_run_summaries import tasks as jrs_tasks
from guided_redaction.jobs.models import Job
from guided_redaction.parse import tasks as parse_tasks
from guided_redaction.pipelines import tasks as pipelines_tasks
from guided_redaction.redact import tasks as redact_tasks
from guided_redaction.task_queues import get_task_queue
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.utils.task_shared import (
    get_job_owner, query_profiler, get_pipeline_for_job, get_job_for_node, 
    get_job_file_dirs, build_lifecycle_attribute
)

from .controller_pipeline_job_status import PipelineJobStatusController
from .controller_preserve_job import PreserveJobController

hostname = os.environ.get("HOSTNAME")

log = logging.getLogger(__name__)

def get_top_parent(job_id, parent_data):
    while True:
        if job_id in parent_data and parent_data[job_id]:
            job_id = parent_data[job_id]
        else:
            break
    return job_id

def get_jobs_info():
    # dict of child_id:parent_id for all child jobs
    parent_data = {
        str(j["id"]):str(j["parent_id"] or "") 
        for j in Job.objects.values("id", "parent_id")
    }
    file_dir_attrs = (Attribute.objects
            .filter(name="file_dir_user")
            .exclude(job=None)
    )
    owner_attrs = (Attribute.objects
            .filter(name="user_id")
            .exclude(job=None)
    )
    info_data = {"file_dirs": {}, "owners": {}}
    file_dir_data = info_data["file_dirs"]
    owner_data = info_data["owners"]
    info = {}
    for key, attr_records in (("file_dirs", file_dir_attrs), ("owners", owner_attrs)):
        sub_data = info_data[key]
        for attr in attr_records:
            if attr.job_id in sub_data:
                if key == "file_dirs":
                    sub_data[str(attr.job_id)].add(attr.value.split(":")[-2])
                else:
                    sub_data[str(attr.job_id)].add(attr.value)
            else:
                if key == "file_dirs":
                    sub_data[str(attr.job_id)] = set([attr.value.split(":")[-2]])
                else:
                    sub_data[str(attr.job_id)] = set([attr.value])
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


def handle_delete_job(pk):
    try:
        job = Job.objects.get(pk=pk)
    except Job.DoesNotExist:
        return None
    job_attrs = Attribute.objects.filter(job=job)

    if (job_attrs.filter(name='delete_files_with_job').exists() and
            job_attrs.filter(name='delete_files_with_job').first().value):
        try:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            file_dirs = get_job_file_dirs(job)
            for file_dir_uuid in file_dirs:
                log.info('deleting the files in directory {}'.format(file_dir_uuid))
                fw.delete_directory(file_dir_uuid)
        except Exception as err:
            log.error(format_exc())
            log.info('error deleting directory {} with job'.format(job.id))
    job.delete()
    return pk

def dispatch_job_wrapper(job, restart_unfinished_children=True):
    if job.app == 'pipeline' and job.operation == 'pipeline':
        for child in job.children.all():
            if child.status != 'success':
                dispatch_job_wrapper(child, restart_unfinished_children)
                break
    if restart_unfinished_children:
        children = Job.objects.filter(parent=job)
        for child_to_restart in children:
            if Job.objects.filter(parent=child_to_restart).exists():
                grandchildren = Job.objects.filter(parent=child_to_restart)
                for grandchild in grandchildren:
                    if grandchild.status != 'success':
                        grandchild.re_initialize_as_running()
                        grandchild.save()
                        log.info(
                            're-displatching grandchild job {}'.format(grandchild)
                        )
                        dispatch_job(grandchild)
            else:
                if child_to_restart.status != 'success':
                    log.info('re-displatching child job {}'.format(child_to_restart))
                    child_to_restart.re_initialize_as_running()
                    child_to_restart.save()
                    dispatch_job(child_to_restart)
    dispatch_job(job)

def dispatch_job(job):
    job_uuid = job.id
    print(f"dispatching job {hostname} {job.app} {job.operation} {job.pk}")
    if job.app == 'analyze' and job.operation == 'template_threaded':
        analyze_tasks.template_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'scan_template_multi':
        analyze_tasks.scan_template_multi.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'filter':
        analyze_tasks.filter.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'ocr_threaded':
        analyze_tasks.ocr_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'scan_ocr':
        analyze_tasks.scan_ocr.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'get_timestamp':
        analyze_tasks.get_timestamp.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'get_timestamp_threaded':
        analyze_tasks.get_timestamp_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'template_match_chart':
        analyze_tasks.template_match_chart.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'ocr_match_chart':
        analyze_tasks.ocr_match_chart.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'selection_grower_chart':
        analyze_tasks.selection_grower_chart.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'selected_area_threaded':
        analyze_tasks.selected_area_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'mesh_match_threaded':
        analyze_tasks.mesh_match_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'focus_finder_threaded':
        analyze_tasks.focus_finder_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 't1_filter_threaded':
        analyze_tasks.t1_filter_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'diff_threaded':
        analyze_tasks.diff_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'feature_threaded':
        analyze_tasks.feature_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'selection_grower_threaded':
        analyze_tasks.selection_grower_threaded.apply_async(
            args=(job_uuid,)
        )
    if job.app == 'analyze' and job.operation == 'manual_compile_data_sifter':
        analyze_tasks.manual_compile_data_sifter.apply_async(
            args=(job_uuid,)
        )
    if job.app == 'analyze' and job.operation == 'data_sifter_threaded':
        analyze_tasks.data_sifter_threaded.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'intersect':
        analyze_tasks.intersect.apply_async(args=(job_uuid,))
    if job.app == 'analyze' and job.operation == 'train_feature_anchor':
        analyze_tasks.train_feature_anchor.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'split_and_hash_threaded':
        parse_tasks.split_and_hash_threaded.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'split_threaded':
        parse_tasks.split_threaded.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'hash_movie':
        parse_tasks.hash_frames.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'copy_movie':
        parse_tasks.copy_movie.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'change_movie_resolution':
        parse_tasks.change_movie_resolution.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'rebase_movies':
        parse_tasks.rebase_movies.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'render_subsequence':
        parse_tasks.render_subsequence.apply_async(args=(job_uuid,))
    if job.app == 'redact' and job.operation == 'redact':
        redact_tasks.redact_threaded.apply_async(args=(job_uuid,))
    if job.app == 'redact' and job.operation == 'redact_t1':
        redact_tasks.redact_t1_threaded.apply_async(args=(job_uuid,))
    if job.app == 'redact' and job.operation == 'redact_single':
        redact_tasks.redact_single.apply_async(args=(job_uuid,))
    if job.app == 'redact' and job.operation == 'illustrate':
        redact_tasks.illustrate.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'zip_movie':
        parse_tasks.zip_movie.apply_async(args=(job_uuid,))
    if job.app == 'parse' and job.operation == 'zip_movie_threaded':
        parse_tasks.zip_movie_threaded.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'get_secure_file':
        files_tasks.get_secure_file.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'put_secure_file':
        files_tasks.put_secure_file.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'save_gt_attribute':
        files_tasks.save_gt_attribute.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'save_movie_metadata':
        files_tasks.save_movie_metadata.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'load_movie_metadata':
        files_tasks.load_movie_metadata.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'unzip_archive':
        files_tasks.unzip_archive.apply_async(args=(job_uuid,))
    if job.app == 'files' and job.operation == 'remove_directories':
        files_tasks.purge_job.apply_async(args=(job_uuid,))
    if job.app == 'pipeline' and job.operation == 't1_sum':
        pipelines_tasks.t1_sum.apply_async(args=(job_uuid,))
    if job.app == 'pipeline' and job.operation == 't1_diff':
        pipelines_tasks.t1_diff.apply_async(args=(job_uuid,))
    if job.app == 'pipeline' and job.operation == 'noop':
        pipelines_tasks.noop.apply_async(args=(job_uuid,))
    if job.app == 'job_run_summaries' and job.operation == 'create_manual_jrs':
        jrs_tasks.create_manual_jrs.apply_async(args=(job_uuid,))
    if job.app == 'job_run_summaries' and job.operation == 'create_automatic_jrs':
        jrs_tasks.create_automatic_jrs.apply_async(args=(job_uuid,))


class JobsViewSet(viewsets.ViewSet):

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
            job.percent_complete = float(request.data.get('percent_complete'))
            job_updated = True
        if job_updated:
            job.save()
            if job.parent:
                job.parent.percent_complete = job.parent.get_percent_complete()
                job.parent.save()

        return Response({"job_updated": job_updated})

    def list(self, request):
        jobs_list = []
        if 'all_pipeline_jobs' in request.GET.keys():
            noparent_jobs = Job.objects.filter(parent_id=None)
            pipeline_jobs = (Job.objects
                .filter(app='pipeline', operation='pipeline')
                .exclude(parent_id=None)
            )
            jobs = list(chain(noparent_jobs, pipeline_jobs))
        else:
            jobs = Job.objects.filter(parent_id=None)
        user_id = ''
        if 'user_id' in request.GET.keys():
            if request.GET['user_id'] and \
                request.GET['user_id'] != 'undefined' and \
                request.GET['user_id'] != 'all':
                user_id = request.GET['user_id']
        info = get_jobs_info()
        file_dirs = info["file_dirs"]
        owners = info["owners"]
        all_attrs = self.get_attributes_as_dict(jobs)
        pretty_child_ids = self.get_pretty_child_ids(jobs)

        for job in jobs:
            job_id = str(job.id)
            child_ids = pretty_child_ids[str(job.id)]
            pretty_time = job.pretty_date(job.created_on)
            wall_clock_run_time = job.get_wall_clock_run_time_string()
            owner = owners[job_id] if job_id in owners else ""
            if owner and user_id and owner != user_id:
                continue

            attrs = all_attrs[str(job.pk)]

            response_data_size = 0
            if job.response_data:
                response_data_size = len(job.response_data)
            if job.response_data_path:
                response_data_size = 'external file'
            request_data_size = 0
            if job.request_data:
                request_data_size = len(job.request_data)
            if job.request_data_path:
                request_data_size = 'external file'
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
                'owner': owner,
                'children': child_ids,
                'response_size': response_data_size,
                'response_data_path': job.response_data_path,
                'request_size': request_data_size,
                'request_data_path': job.request_data_path,
                'hostname': job.hostname,
            }
            if job_id in file_dirs:
                job_obj['file_dirs'] = file_dirs[job_id]
            if attrs:
                job_obj['attributes'] = attrs
            jobs_list.append(job_obj)
        return Response({
          "jobs": jobs_list,
        })

    def retrieve(self, request, pk):
        try:
            job = Job.objects.get(pk=pk)
        except (ValidationError, Job.DoesNotExist):
            return self.error("Not Found", 404)

        job_data = job.as_dict()
        owner = get_job_owner(job)
        if owner:
            job_data['owner'] = owner
        file_dirs = get_job_file_dirs(job)
        if file_dirs:
            job_data['file_dirs'] = file_dirs
        attrs = self.get_attributes_as_dict([job])[str(job.pk)]
        if attrs:
            job_data['attributes'] = attrs

        return Response({"job": job_data})

    def get_attributes_as_dict(self, jobs):
        all_attrs = defaultdict(dict)
        attributes = Attribute.objects.filter(job__in=jobs)
        for attribute in attributes:
            if attribute.name not in ['user_id', 'file_dir_user']:
                all_attrs[str(attribute.job_id)][attribute.name] = attribute.value
            if attribute.name == 'pipeline_job_link':
                all_attrs[str(attribute.job_id)][attribute.name] = attribute.pipeline_id
        return all_attrs

    def get_pretty_child_ids(self, jobs):
        pretty_child_ids = defaultdict(list)
        children = Job.objects.filter(parent__in=jobs)
        for child in children:
            pretty_child_ids[str(child.parent_id)].append(
                f"{str(child.pk)} : {child.operation}"
            )
        return pretty_child_ids

    def build_job(self, request):
        job = Job(
            request_data=json.dumps(request.data.get('request_data')),
            status='created',
            description=request.data.get('description', 'something weird'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
        )
        job.save()

        try:
            owner = request.user.username
            job.add_owner(owner)
        except:
            pass
        if request.data.get('lifecycle_data'):
            lifecycle_data = request.data.get('lifecycle_data')
            build_lifecycle_attribute('delete_files_with_job', lifecycle_data, job)
            build_lifecycle_attribute('auto_delete_age', lifecycle_data, job)
        return job

    def create(self, request):
        job = self.build_job(request)
        self.schedule_job(job)
        return Response({"job_id": job.id})

    def delete(self, request, pk, format=None):
        deleted_pk = handle_delete_job(pk)
        if deleted_pk:
            return Response({"deleted": deleted_pk})
        return self.error("Not Found", 404)

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
                log.info('rebasing job {}'.format(job.id))
                job.request_data = json.dumps(job_request_data)
                job.response_data = json.dumps(job_response_data)
                job.save()
        main_job.status = 'success'
        main_job.save()

    def schedule_job(self, job):
        dispatch_job(job)
        if job.app == 'jobs' and job.operation == 'rebase_jobs':
            self.rebase_jobs(job.id)


class JobsViewSetFailedTasks(viewsets.ViewSet):
    def retrieve(self, request, pk):
        build_data = {}
        job = Job.objects.get(pk=pk)
        self.add_errors_for_job(job, build_data)
        return Response(build_data)

    def add_errors_for_job(self, job, build_data):
        if job.status == 'failed':
            build_obj = {
                'operation': job.operation,
            }
            if job.response_data:
                resp_data = json.loads(job.response_data)
                if 'errors' in resp_data:
                    build_obj['errors'] = resp_data['errors']
            build_data[str(job.id)] = build_obj,
            children = Job.objects.filter(parent=job)
            for child in children:
                self.add_errors_for_job(child, build_data)


class JobsViewSetWrapUp(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("job_id"):
            return self.error("job_id is required")
        try:
            job = Job.objects.get(pk=request.data.get('job_id'))
        except Job.DoesNotExist:
            return self.error("Not Found", 404) 
        self.clear_out_job_recursive(job)
        children = Job.objects.filter(parent=job)
        unfinished_children_exist = False
        for child in children:
            if child.status != 'success':
                unfinished_children_exist = True
        if unfinished_children_exist:
            dispatch_job_wrapper(job, restart_unfinished_children=True)
        else:
            dispatch_job(job)
            
        return Response({'job_id': job.id})

    def clear_out_job_recursive(self, job):
        if job.status != 'success':
            job.status = 'running'
            job.percent_complete = 0
            job.response_data = '{}'
            job.response_data_path = ''
            job.save()
            children = Job.objects.filter(parent=job)
            for child in children:
                if child.status != 'success':
                    self.clear_out_job_recursive(child)

class JobsViewSetRestartPipelineJob(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("job_id"):
            return self.error("job_id is required")
        job = Job.objects.get(pk=request.data.get('job_id'))
        Job.objects.filter(parent=job).delete()
        job.status = 'created'
        job.response_data = ''
        job.percent_complete = 0
        job.save()

        pipeline = get_pipeline_for_job(job.parent)
        if pipeline:
            # delete all descendant jobs based on the node edges
            pc = json.loads(pipeline.content)
            cur_node_id = Attribute.objects.filter(job=job, name='node_id').first().value

            if cur_node_id in pc['edges']:
                for target_node_id in pc['edges'][cur_node_id]:
                    self.delete_all_child_jobs(job.parent, target_node_id, pc['edges'])
        dispatch_job(job)

        return Response({'job_id': job.id})

    def delete_all_child_jobs(self, parent_job, node_id, edges):
        print('deleting child jobs for {}'.format(node_id))
        job = get_job_for_node(node_id, parent_job)
        if job:
            job.delete()
        if node_id not in edges:
            return
        outbound_node_ids = edges[node_id]
        for outbound_node_id in outbound_node_ids:
            self.delete_all_child_jobs(parent_job, outbound_node_id, edges)

class JobsViewSetDeleteOld(viewsets.ViewSet):
    def list(self, request):
        job_ids_to_delete = []
        for job in Job.objects.all().filter(parent=None):
            if Attribute.objects.filter(job=job).exists():
                attributes = Attribute.objects.filter(job=job)
                for attribute in attributes:
                    if attribute.name == 'auto_delete_age':
                        job_age = datetime.now() - job.created_on.replace(tzinfo=None)
                        log.info('job age is {}'.format(job_age))
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
        return Response({'message': resp_msg})

class JobsViewSetPipelineJobStatus(viewsets.ViewSet):
    def retrieve(self, request, pk):
        job = Job.objects.get(pk=pk)
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        worker = PipelineJobStatusController(fw)

        worker_response = worker.build_status(job)
        return Response(worker_response)

class JobsViewSetPreserve(viewsets.ViewSet):
    def retrieve(self, request, pk):
        print('diggy 01')
        try:
            job = Job.objects.get(pk=pk)
        except (ValidationError, Job.DoesNotExist):
            return self.error("Not Found", 404)
        print('diggy 02')
        worker = PreserveJobController()
        print('diggy 03')

        worker_response = worker.preserve_job(job)
        print('diggy 04')
        return Response(worker_response)

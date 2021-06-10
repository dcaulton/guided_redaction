import json
import math
import os
import shutil
import uuid
from datetime import datetime, timedelta

from itertools import chain
import pytz
import requests
from django.conf import settings
from rest_framework.response import Response

from base import viewsets, utils
from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.utils.task_shared import get_job_owner, query_profiler
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_pipeline_job_status import PipelineJobStatusController
from .controller_jobs import JobCrudController, JobDeleteOldController
from .controller_dispatch import JobDispatchController
from guided_redaction.utils.task_shared import get_pipeline_for_job, get_job_for_node



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
        worker = JobCrudController()
        jobs_list = worker.list()
        return Response({"jobs": jobs_list})

    def retrieve(self, request, pk):
        worker = JobCrudController()
        job_data = worker.retrieve(pk)
        return Response({"job": job_data})

    def create(self, request):
        worker = JobCrudController()
        job = worker.build_job(request.data)

        if job.is_cv_worker_task():
            if job.get_cv_worker_type() == 'accepts_calls':
                self.dispatch_cv_worker_job(job)
        else:
            self.schedule_job(job)

        return Response({"job_id": job.id})

    def delete(self, request, pk, format=None):
        worker = JobCrudController()
        job = worker.delete(pk)
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
        worker = JobDispatchController()
        worker.dispatch_job(job)
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
        job = Job.objects.get(pk=request.data.get('job_id'))
        self.clear_out_job_recursive(job)
        children = Job.objects.filter(parent=job)
        unfinished_children_exist = False
        for child in children:
            if child.status != 'success':
                unfinished_children_exist = True
        worker = JobDispatchController()
        if unfinished_children_exist:
            worker.dispatch_job_and_unfinished_children(job)
        else:
            worker.dispatch_job(job)
            
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
        worker = JobDispatchController()
        worker.dispatch_job(job)

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
        worker = JobDeleteOldController()
        resp_msg = worker.delete_old_jobs()
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

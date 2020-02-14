import uuid
import json
import os
from django.conf import settings
import requests
from rest_framework.response import Response
from base import viewsets
from guided_redaction.jobs.models import Job
from guided_redaction.analyze import tasks as analyze_tasks
from guided_redaction.parse import tasks as parse_tasks
from guided_redaction.redact import tasks as redact_tasks
import json
import pytz
import math


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
        make_failed = request.data.get('make_failed')
        if make_failed:
            job.status = 'failed'
            job.save()
            return Response({"job_updated": True})
        return Response({"job_updated": False})

    def list(self, request):
        jobs_list = []
        if 'workbook_id' in request.GET.keys():
            jobs = Job.objects.filter(workbook_id=request.GET['workbook_id'])
        else:
            jobs = Job.objects.filter(parent_id__isnull=True)
        for job in jobs:
            children = Job.objects.filter(parent_id=job.id).order_by('sequence')
            child_ids = [child.id for child in children]
            pretty_time = self.pretty_date(job.created_on)
            jobs_list.append(
                {
                    'id': job.id,
                    'file_uuids_used': job.file_uuids_used,
                    'status': job.status,
                    'workbook_id': job.workbook_id,
                    'description': job.description,
                    'created_on': job.created_on,
                    'updated': job.updated,
                    'pretty_created_on': pretty_time,
                    'elapsed_time': job.elapsed_time,
                    'app': job.app,
                    'operation': job.operation,
                    'workbook_id': job.workbook_id,
                    'owner': job.owner,
                    'children': child_ids,
                }
            )

        return Response({"jobs": jobs_list})

    def retrieve(self, request, pk):
        job = Job.objects.get(pk=pk)
        children = Job.objects.filter(parent_id=job.id).order_by('sequence')
        child_ids = [child.id for child in children]
        pretty_time = self.pretty_date(job.created_on)
        job_data = {
            'id': job.id,
            'file_uuids_used': job.file_uuids_used,
            'status': job.status,
            'workbook_id': job.workbook_id,
            'description': job.description,
            'created_on': job.created_on,
            'updated': job.updated,
            'pretty_created_on': pretty_time,
            'elapsed_time': job.elapsed_time,
            'app': job.app,
            'operation': job.operation,
            'workbook_id': job.workbook_id,
            'owner': job.owner,
            'parent_id': job.parent_id,
            'request_data': job.request_data,
            'response_data': job.response_data,
            'children': child_ids,
        }
        return Response({"job": job_data})

    def get_file_uuids_from_request(self, request_dict):
        uuids = []
        app = request_dict.get('app')
        operation = request_dict.get('operation')
        if (app == 'parse' and operation == 'split_and_hash_movie'):
            movie = request_dict['request_data'].get('movie_url')
            if movie:
                (x_part, file_part) = os.path.split(movie)
                (y_part, uuid_part) = os.path.split(x_part)
                if uuid_part and len(uuid_part) == 36:
                    uuids.append(uuid_part)
        return uuids

    def build_single_job(self, request):
        job = Job(
            request_data=json.dumps(request.data.get('request_data')),
            file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data)),
            owner=request.data.get('owner', 'unknown'),
            status='created',
            description=request.data.get('description', 'something weird'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
            elapsed_time=0.0,
            workbook_id=request.data.get('workbook_id'),
        )
        job.save()
        return job

    def build_composite_redact_job(self, request):
        parent_job = Job(
            request_data=json.dumps(request.data.get('request_data')),
            file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data)),
            owner=request.data.get('owner', 'unknown'),
            status='created',
            description=request.data.get('description'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
            elapsed_time=0.0,
            workbook_id=request.data.get('workbook_id'),
        )
        parent_job.save()
        all_subtask_data = request.data.get('request_data')
        for index, one_subtasks_data in enumerate(all_subtask_data):
            desc = ('redact '+ str(len(one_subtasks_data['areas_to_redact']))
                + ' areas on ' + one_subtasks_data['image_url'])
            job = Job(
                request_data=json.dumps(request.data.get('request_data')[index]),
                file_uuids_used=[], # TODO, figure this out
                status='created',
                description=desc,
                app=request.data.get('app'),
                operation=request.data.get('operation'),
                sequence=index,
                elapsed_time=0.0,
                parent=parent_job,
            )
            job.save()
        return parent_job

    def build_composite_job(self, request):
        if request.data.get('operation') == 'redact':
            parent_job = self.build_composite_redact_job(request)
        return parent_job

    def test_if_composite_job(self, request):
        operation = request.data.get('operation')
        if operation == 'redact':
            return True
        return False

    def create(self, request):
        is_composite = self.test_if_composite_job(request)
        if is_composite:
            job = self.build_composite_job(request)
        else:
            job = self.build_single_job(request)
        self.schedule_job(job)
        return Response({"job_id": job.id})

    def delete(self, request, pk, format=None):
        job = Job.objects.get(pk=pk)
        job.delete()
        return Response('', status=204)

    def schedule_job(self, job):
        job_uuid = job.id
        if job.app == 'analyze' and job.operation == 'scan_template':
            analyze_tasks.scan_template.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'scan_template_threaded':
            analyze_tasks.scan_template_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'filter':
            analyze_tasks.filter.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'scan_ocr_image':
            analyze_tasks.scan_ocr_image.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'scan_ocr_movie':
            analyze_tasks.scan_ocr_movie.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'telemetry_find_matching_frames':
            analyze_tasks.telemetry_find_matching_frames.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_and_hash_movie':
            parse_tasks.split_and_hash_movie.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_and_hash_threaded':
            parse_tasks.split_and_hash_threaded.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_movie':
            parse_tasks.split_movie_threaded.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'hash_frames':
            parse_tasks.hash_frames.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'redact':
            redact_tasks.redact.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'redact_single':
            redact_tasks.redact_single.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'illustrate':
            redact_tasks.illustrate.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'zip_movie':
            parse_tasks.zip_movie.delay(job_uuid)


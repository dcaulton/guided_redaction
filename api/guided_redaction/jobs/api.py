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
import json


class JobsViewSet(viewsets.ViewSet):
    def list(self, request):
        jobs_list = []
        if 'workbook_id' in request.GET.keys():
            jobs = Job.objects.filter(workbook_id=request.GET['workbook_id'])
        else:
            jobs = Job.objects.all()
        for job in jobs:
            jobs_list.append(
                {
                    'id': job.id,
                    'file_uuids_used': job.file_uuids_used,
                    'status': job.status,
                    'workbook_id': job.workbook_id,
                    'description': job.description,
                    'created_on': job.created_on,
                    'app': job.app,
                    'operation': job.operation,
                    'request_data': job.request_data,
                    'response_data': job.response_data,
                    'workbook_id': job.workbook_id,
                }
            )

        return Response({"jobs": jobs_list})

    def retrieve(self, request, the_uuid):
        job = Job.objects.get(pk=the_uuid)
        return Response({"job": job})

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

    def create(self, request):
        job = Job(
            request_data=json.dumps(request.data.get('request_data')),
            file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data)),
            owner=request.data.get('owner'),
            status='created',
            description=request.data.get('description'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
            elapsed_time=0.0,
            workbook_id=request.data.get('workbook_id'),
        )
        job.save()
        job_uuid = job.id

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
        if job.app == 'parse' and job.operation == 'split_and_hash_movie':
            parse_tasks.split_and_hash_movie.delay(job_uuid)

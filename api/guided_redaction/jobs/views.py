import uuid
from guided_redaction.parse.models import ImageBlob
from django.http import HttpResponse, JsonResponse
import json
import os
import pika
from guided_redaction.parse.classes.MovieParser import MovieParser
from guided_redaction.utils.classes.FileWriter import FileWriter
from django.shortcuts import render
from django.conf import settings
import requests
from rest_framework import viewsets
from guided_redaction.jobs.models import Job
from guided_redaction.analyze import tasks as analyze_tasks
from guided_redaction.parse import tasks as parse_tasks
import json


class JobsViewSet(viewsets.ViewSet):
    def list(self, request):
        jobs_list = []
        for job in Job.objects.all():
            jobs_list.append(
                {
                    'uuid': job.uuid,
                    'file_uuids_used': job.file_uuids_used,
                    'status': job.status,
                    'description': job.description,
                    'created_on': job.created_on,
                    'app': job.app,
                    'operation': job.operation,
                    'request_data': job.request_data,
                    'response_data': job.response_data,
                }
            )

        return JsonResponse({"jobs": jobs_list})

    def retrieve(self, request, the_uuid):
        job = Job.objects.filter(uuid=the_uuid).first()
        return JsonResponse({"job": job})

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
        job_uuid = str(uuid.uuid4())
        job = Job(
            uuid=job_uuid,
            request_data=json.dumps(request.data.get('request_data')),
            file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data)),
            owner=request.data.get('owner'),
            status='created',
            description=request.data.get('description'),
            app=request.data.get('app', 'bridezilla'),
            operation=request.data.get('operation', 'chucky'),
            sequence=0,
            elapsed_time=0.0,
        )
        job.save()

        self.schedule_job(job)

        return JsonResponse({"job_id": job.uuid})

    def delete(self, request, pk):
        job = Job.objects.filter(uuid=pk).first()
        job.delete()
        return HttpResponse('', status=204)

    def schedule_job(self, job):
        job_uuid = job.uuid
        if job.app == 'analyze' and job.operation == 'scan_template':
            analyze_tasks.scan_template.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_and_hash_movie':
            parse_tasks.split_and_hash_movie.delay(job_uuid)

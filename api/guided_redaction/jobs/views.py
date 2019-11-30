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
import json


class JobsViewSet(viewsets.ViewSet):
    def list(self, request):
        jobs_list = []
        for job in Job.objects.all():
            jobs_list.append(
                {
                    'uuid': job.uuid,
                    'status': job.status,
                    'description': job.description,
                    'created_on': job.created_on,
                    'app': job.app,
                    'operation': job.operation,
                    'request_data': job.request_data,
                    'response_data': job.response_data,
                }
            )
            if (job.parent_id == None):
                print('job ',job.uuid, ' has no parent')

        return JsonResponse({"jobs": jobs_list})

    def retrieve(self, request, the_uuid):
        job = Job.objects.filter(uuid=the_uuid).first()
        return JsonResponse({"job": job})

    def get_file_uuids_from_request(self, request_dict):
        return []

    def create(self, request):
        job_uuid = str(uuid.uuid4())
        job = Job(
            uuid=job_uuid,
            request_data=json.dumps(request.data.get('request_data')),
            file_uuids_used=self.get_file_uuids_from_request(request.data),
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
            from guided_redaction.analyze import tasks
            tasks.scan_template.delay(job_uuid)

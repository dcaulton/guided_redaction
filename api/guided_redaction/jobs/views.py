import uuid
from guided_redaction.parse.models import ImageBlob
from django.http import HttpResponse, JsonResponse
import json
import os
from guided_redaction.parse.classes.MovieParser import MovieParser
from guided_redaction.utils.classes.FileWriter import FileWriter
from django.shortcuts import render
from django.conf import settings
import requests
from rest_framework import viewsets
from guided_redaction.jobs.models import JobData


class JobsViewSet(viewsets.ViewSet):
    def list(self, request):
        jobs_list = []
        for job in JobData.objects.all():
            jobs_list.append(
                {
                    'uuid': job.uuid,
                    'status': job.status,
                    'description': job.description,
                    'created_on': job.created_on,
                }
            )

        return JsonResponse({"jobs": jobs_list})

    def retrieve(self, request, the_uuid):
        jd_record = JobData.objects.filter(uuid=the_uuid).first()
        return JsonResponse({"job": jd_record})

    def create(self, request):
        job = JobData.objects.create()
        job.uuid = uuid.uuid4()
        job.job_data = request.data['job_data']
        job.owner = request.data['owner']
        job.status = 'created'
        job.description = request.data['description']
        job.save()
        papa = {
            'uuid': job.uuid,
            'status': job.status,
            'owner': job.owner,
            'created_on': job.created_on,
            'description': job.description,
            'job_data': job.job_data,
       }

        return JsonResponse({"job": papa})

    def delete(self, request, pk):
        jd_record = JobData.objects.filter(uuid=pk).first()
        jd_record.delete()
        return HttpResponse('', status=204)


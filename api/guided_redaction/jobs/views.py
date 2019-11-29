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
            request_data=request.data.get('request_data'),
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

        self.enqueue_job(job_uuid)

        return JsonResponse({"job_id": job.uuid})

    def delete(self, request, pk):
        job = Job.objects.filter(uuid=pk).first()
        job.delete()
        return HttpResponse('', status=204)

    def enqueue_job(self, job_uuid):
        connection = pika.BlockingConnection(pika.ConnectionParameters(settings.GR_QUEUE_CONNECTION_STRING))
        channel = connection.channel()
        channel.queue_declare(queue=settings.GR_STANDARD_QUEUE_NAME, durable=True)
        channel.basic_publish(exchange='', routing_key=settings.GR_STANDARD_QUEUE_NAME, body=job_uuid)
        connection.close()


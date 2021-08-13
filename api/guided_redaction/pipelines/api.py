import json
from traceback import format_exc
from uuid import uuid4

from rest_framework.response import Response

from base import viewsets
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
from guided_redaction.task_queues import get_task_queue
from .controller_t1_sum import T1SumController
from .controller_t1_diff import T1DiffController
from .controller_dispatch import DispatchController


class PipelinesViewSet(viewsets.ViewSet):
    def list(self, request):
        pipelines_list = []
        for pipeline in Pipeline.objects.all():
            build_attributes = {}
            if Attribute.objects.filter(pipeline=pipeline).exists():
                attributes = Attribute.objects.filter(pipeline=pipeline)
                for attribute in attributes:
                    build_attributes[attribute.name] = attribute.value
            job_ids = []
            if Attribute.objects.filter(
                pipeline=pipeline, name='pipeline_job_link'
            ).exists():
                attributes = Attribute.objects.filter(
                    pipeline=pipeline, 
                    name='pipeline_job_link'
                )
                for attribute in attributes:
                    if attribute.job:
                        job_ids.append(attribute.job.id)
            pipelines_list.append(
                {
                    'id': pipeline.id,
                    'name': pipeline.name,
                    'description': pipeline.description,
                    'created_on': pipeline.created_on,
                    'updated_on': pipeline.updated_on,
                    'attributes': build_attributes,
                    'content': pipeline.content,
                    'job_ids': job_ids,
                }
            )
        pipelines_list = sorted(pipelines_list, key=lambda x: x.get("name"))
        return Response({"pipelines": pipelines_list})

    def retrieve(self, request, pk):
        pipeline = Pipeline.objects.get(pk=pk)
        return Response({"pipeline": pipeline.as_dict()})

    def create(self, request):
        request_content = request.data.get('content')
        pipeline_id = request_content.get('id')
        request_name = request_content.get('name')
        if pipeline_id and Pipeline.objects.filter(pk=pipeline_id).exists():
            pipeline = Pipeline.objects.get(pk=pipeline_id)
            if pipeline.name != request_name:
                pipeline.name = request_name
                pipeline.save()
        else:
            pipeline = Pipeline(
                name=request_name,
                description=request.data.get('description'),
            )
            pipeline.save()
        for attribute in Attribute.objects.filter(pipeline=pipeline):
            if attribute.name not in request_content.get('attributes', {}):
                attribute.delete()
        if 'attributes' in request_content:
            attributes = [ a.name for a in Attribute.objects.filter(pipeline=pipeline) ]
            for attribute_name in request_content['attributes']:
                attribute_value = request_content['attributes'][attribute_name]
                if attribute_name not in attributes:
                    attribute = Attribute(
                        name=attribute_name,
                        value=attribute_value,
                        pipeline=pipeline,
                    )
                    attribute.save()
            del request_content['attributes']
        pipeline.content=json.dumps(request_content)
        pipeline.save()
        return Response({"pipeline_id": pipeline.id})

    def delete(self, request, pk, format=None):
        Pipeline.objects.get(pk=pk).delete()
        return Response()


class PipelinesViewSetDispatch(viewsets.ViewSet):
    # this is the entry point for starting a pipeline from the web
    def create(self, request):
        request_data = request.data
        is_batch = "batch" in request.query_params
        owner = ''
        try:
            owner = request.user.username
        except:
            pass
        return self.process_create_request(request_data, is_batch, owner)

    def process_create_request(self, request_data=None, is_batch=None, owner=None):
        if not request_data.get("pipeline_id"):
            return self.error("pipeline_id is required", status_code=400)
        if not request_data.get("input"):
            return self.error("input is required", status_code=400)
        queue = get_task_queue(is_batch)
        new_job_id = str(uuid4())
        from . import tasks
        tasks.dispatch_pipeline.apply_async(
            args=(request_data, owner, new_job_id), queue=queue
        )
        return Response({"job_id": new_job_id, "is_batch": is_batch})


class PipelineT1SumViewSet(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_ids"):
            return self.error("job_ids is required", status_code=400)
        job_ids = request_data.get('job_ids')
        mandatory_job_ids = request_data.get('mandatory_job_ids', [])

        worker = T1SumController()
        build_movies = worker.build_t1_sum(job_ids, mandatory_job_ids)

        return Response({'movies': build_movies})


class PipelineT1DiffViewSet(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("minuend_jobs"):
            return self.error("minuend_jobs is required", status_code=400)
        if not request_data.get("subtrahend_job_ids"):
            return self.error("subtrahend_job_ids is required", status_code=400)
        minuend_jobs = request_data.get('minuend_jobs')
        subtrahend_job_ids = request_data.get('subtrahend_job_ids')

        worker = T1DiffController()
        build_movies = worker.build_t1_diff(minuend_jobs, subtrahend_job_ids)

        return Response({'movies': build_movies})

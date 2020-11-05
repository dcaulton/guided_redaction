import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job

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

        return Response({"pipelines": pipelines_list})

    def retrieve(self, request, pk):
        pipeline = Pipeline.objects.get(pk=pk)
        build_attributes = {}
        if Attribute.objects.filter(pipeline=pipeline).exists():
            attributes = Attribute.objects.filter(pipeline=pipeline)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value
        p_data = {
            'id': pipeline.id,
            'name': pipeline.name,
            'description': pipeline.description,
            'created_on': pipeline.created_on,
            'updated_on': pipeline.updated_on,
            'attributes': build_attributes,
            'content': pipeline.content,
        }
        return Response({"pipeline": p_data})

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
        if 'attributes' in request_content:
            for attribute_name in request_content['attributes']:
                attribute_value = request_content['attributes'][attribute_name]
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
        return Response('', status=204)


class PipelinesViewSetDispatch(viewsets.ViewSet):
    # this is the entry point for starting a pipeline from the web
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("pipeline_id"):
            return self.error("pipeline_id is required", status_code=400)
        if not request_data.get("input"):
            return self.error("input is required", status_code=400)
        pipeline_id = request_data['pipeline_id']
        if not Pipeline.objects.filter(id=pipeline_id).exists():
            return self.error("invalid pipeline id specified", status_code=400)
        input_data = request_data['input']
        workbook_id = request_data.get("workbook_id")
        owner = request_data.get("owner")

        worker = DispatchController()
        parent_job_id = worker.dispatch_pipeline(pipeline_id, input_data, workbook_id, owner)

        return Response({'job_id': parent_job_id})

    def handle_job_finished(self, job, pipeline):
        worker = DispatchController()
        worker.handle_job_finished(job, pipeline)
        return Response()


class PipelineT1SumViewSet(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_ids"):
            return self.error("job_ids is required", status_code=400)
        job_ids = request_data.get('job_ids')

        worker = T1SumController()
        build_movies = worker.build_t1_sum(job_ids)

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

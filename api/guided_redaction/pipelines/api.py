import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
import guided_redaction.jobs.api as jobs_api


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
            if Attribute.objects.filter(pipeline=pipeline, name='pipeline_job_link').exists():
                attributes = Attribute.objects.filter(pipeline=pipeline, name='pipeline_job_link')
                for attribute in attributes:
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
        pipeline = Pipeline(
            name=request.data.get('name'),
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
        if not Pipeline.objects.filter(id=request_data['pipeline_id']).exists():
            return self.error("invalid pipeline id specified", status_code=400)
        pipeline = Pipeline.objects.get(pk=request_data['pipeline_id'])
        content = json.loads(pipeline.content)
        parent_job = self.build_parent_job(pipeline, content)
        child_job = self.build_job(content, 0, parent_job)
        jobs_api.dispatch_job(child_job)
        parent_job.status = 'running'
        parent_job.save()
        return Response({'job_id': parent_job.id})

    def build_parent_job(self, pipeline, content):
        job = Job(
            status='created',
            description='top level job for pipeline '+pipeline.name,
            app='pipeline',
            operation='pipeline',
            sequence=0,
            elapsed_time=0.0,
        )
        job.save()
        attribute = Attribute(
            name='pipeline_job_link',
            value='pipeline_job_link',
            job=job,
            pipeline=pipeline
        )
        attribute.save()
        return job

    def build_job(self, content, steps_index, parent_job):
        step = content['steps'][steps_index]
        if step['type'] == 'template':
            return self.build_tier_1_scanner_job('template', content, step, parent_job, None)
        if step['type'] == 'selected_area':
            return self.build_tier_1_scanner_job('selected_area', content, step, parent_job, None)
        if step['type'] == 'ocr':
            return self.build_tier_1_scanner_job('ocr', content, step, parent_job, None)
        return ''

    def build_tier_1_scanner_job(self, scanner_type, content, step, parent_job, previous_job):
        desc_string = 'scan ' + scanner_type + ' threaded '
        build_scanners = {}
        scanner = content['step_metadata'][scanner_type][step['entity_id']]
        build_scanners[step['entity_id']] = scanner
        build_movies = {}
        if previous_job:
            previous_result = json.loads(previous_job['result_data'])
            print('lester holt baby')
            print(previous_result)
            build_movies['source'] = content['movies']
        else:
            build_movies = content['movies']
        request_data = json.dumps({
            'templates': build_scanners,
            'movies': build_movies,
            'scan_level': scanner['scan_level'],
            'id': scanner['id'],
        })
        if scanner_type == 'template':
            operation = 'scan_template_threaded'
        elif scanner_type == 'selected_area':
            operation = 'selected_area_threaded'
        elif scanner_type == 'ocr':
            operation = 'scan_ocr'
        elif scanner_type == 'telemetry':
            operation = 'telemetry_find_matching_frames'

        job = Job(
            status='created',
            description=desc_string,
            app='analyze',
            operation=operation,
            sequence=0,
            elapsed_time=0.0,
            request_data=request_data,
            parent=parent_job,
        )
        job.save()
        return job

    def handle_job_finished(self, pipeline):
        print('pipeline dispatcher, handling job finished')
        pass

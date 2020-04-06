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
        first_node_id = self.get_first_node_id(content)
        if first_node_id:
            child_job = self.build_job(content, first_node_id, parent_job)
            jobs_api.dispatch_job(child_job)
            parent_job.status = 'running'
            parent_job.save()
        return Response({'job_id': parent_job.id})

    def get_first_node_id(self, content):
        inbound_counts = {}
        for node_id in content['node_metadata']['node']:
            inbound_counts[node_id] = 0
        for source_node_id in content['edges']:
            for target_node_id in content['edges'][source_node_id]:
                inbound_counts[target_node_id] += 1
        nodes_without_inbound = [x for x in inbound_counts.keys() if inbound+counts[x] == 0]
        if nodes_without_inbound:
            return nodes_without_inbound[0]

        
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

    def build_job(self, content, node_id, parent_job, previous_job=None):
        node = content['node_metadata']['node'][node_id]
        if node['type'] == 'template':
            return self.build_tier_1_scanner_job('template', content, node, parent_job, previous_job)
        elif node['type'] == 'selected_area':
            return self.build_tier_1_scanner_job('selected_area', content, node, parent_job, previous_job)
        elif node['type'] == 'ocr':
            return self.build_tier_1_scanner_job('ocr', content, node, parent_job, previous_job)
        elif node['type'] == 'split_and_hash':
            return self.build_split_and_hash_job(content, node, parent_job)
        elif node['type'] == 'redact':
            return self.build_redact_job(content, node, parent_job, previous_job)
        elif node['type'] == 'zip':
            return self.build_zip_job(content, node, parent_job)
        else:
            print('=============== UNRECOGNIZED JOB TYPE: {} ========'.format(step['type']))
            return ''

    def build_zip_job(self, content, node, parent_job):
        parent_request_data = json.loads(parent_job.request_data)
        build_request_data = {
          'movies': parent_request_data['movies'],
        }
        job = Job(
            status='created',
            description='zip movie for pipeline',
            app='parse',
            operation='zip_movie_threaded',
            sequence=0,
            elapsed_time=0.0,
            request_data=json.dumps(build_request_data),
            parent=parent_job,
        )
        job.save()
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()
        return job

    def build_split_and_hash_job(self, content, node, parent_job):
        request_data = {
          'movie_urls': list(content['movies'].keys()),
          'frameset_discriminator': 'gray8',
          'preserve_movie_audio': False,
        }
        job = Job(
            status='created',
            description='split and hash threaded for pipeline',
            app='parse',
            operation='split_and_hash_threaded',
            sequence=0,
            elapsed_time=0.0,
            request_data=json.dumps(request_data),
            parent=parent_job,
        )
        job.save()
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()
        return job

    def add_t1_output_to_areas_to_redact(self, source_movie, framesets_to_redact):
        for frameset_hash in framesets_to_redact:
            areas_to_redact = framesets_to_redact[frameset_hash]
            build_areas = []
            for area_id in areas_to_redact:
                area = areas_to_redact[area_id]
                build_area = {
                    'id': area_id,
                }
                if 'location' in area and 'size' in area:
                    end = [
                        area['location'][0] + area['size'][0],
                        area['location'][1] + area['size'][1]
                    ]
                    build_area['start'] = area['location']
                    build_area['end'] = end
                    build_areas.append(build_area)
                elif 'start' in area and 'end' in area:
                    build_area['start'] = area['start']
                    build_area['end'] = area['end']
                    build_areas.append(build_area)
            if build_areas:
                source_movie['framesets'][frameset_hash]['areas_to_redact'] = build_areas
        return source_movie
                
    def build_redact_job(self, content, node, parent_job, previous_job):
        movie_url = list(content['movies'].keys())[0]
        build_movies = {}
        parent_request_data = json.loads(parent_job.request_data)
        t1_output = json.loads(previous_job.response_data)

        # TODO loop on movie urls here
        source_movie = parent_request_data['movies'][movie_url]
        t1_framesets = {}
        if movie_url in t1_output['movies']:
            t1_framesets = t1_output['movies'][movie_url]['framesets']
        merged_movie = self.add_t1_output_to_areas_to_redact(source_movie, t1_framesets)
        build_movies[movie_url] = merged_movie
        build_request_data = {
            "movies": build_movies,
            'mask_method': 'black_rectangle',
            'meta': {
                'return_type': 'url',
                'preserve_working_dir_across_batch': True,
            },
        }
        job = Job(
            status='created',
            description='redact for pipeline',
            app='redact',
            operation='redact',
            sequence=0,
            elapsed_time=0.0,
            request_data=json.dumps(build_request_data),
            parent=parent_job,
        )
        job.save()
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()
        return job

    def build_tier_1_scanner_job(self, scanner_type, content, node, parent_job, previous_job):
        desc_string = 'scan ' + scanner_type + ' threaded '
        build_scanners = {}
        scanner = content['node_metadata'][scanner_type][node['id']]['entity_id']]
        build_scanners[node['entity_id']] = scanner
        build_movies = {}

        source_movies = {}
        if parent_job.request_data:
            parent_job_request_data = json.loads(parent_job.request_data)
            if 'movies' in parent_job_request_data:
                source_movies = parent_job_request_data['movies']
        if 'movies' in content and not source_movies:
            source_movies = content['movies']

        if previous_job:
            previous_result = json.loads(previous_job.response_data)
            build_movies = previous_result['movies']
            if source_movies:
                build_movies['source'] = source_movies
        else:
            build_movies = source_movies

        build_request_data = {
            'movies': build_movies,
            'scan_level': scanner['scan_level'],
            'id': scanner['id'],
        }
        if scanner_type == 'template':
            operation = 'scan_template_threaded'
            build_request_data['templates'] = build_scanners
        elif scanner_type == 'selected_area':
            operation = 'selected_area_threaded'
            build_request_data['selected_area_metas'] = build_scanners
        elif scanner_type == 'ocr':
            operation = 'scan_ocr'
            build_request_data['ocr_rules'] = build_scanners
        elif scanner_type == 'telemetry':
            operation = 'telemetry_find_matching_frames'
            build_request_data['telemetry_rules'] = build_scanners
        request_data = json.dumps(build_request_data)

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
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()
        return job

    def get_job_for_node(self, node_id, parent_job):
        if Attribute.objects.filter(name='node_id', value=next_node_id).exists():
            attrs = Attribute.objects.filter(name='node_id', value=next_node_id)
            for attr in attrs:
                if attr.job and attr.job.parent = parent_job:
                    return attr.job

    def node_has_no_job_yet(self, next_node_id, parent_job):
        job_for_node = self.get_job_for_node(node_id, parent_job)
        if job_for_node:
            return False
        return True

    def all_other_inbound_edges_are_complete(self, next_node_id, content, parent_job):
        inbound_edges = []
        for node_id in content['edges']:
            if next_node_id in content['edges'][node_id]:
                inbound_edges.append(next_node_id)
        for inbound_node_id in inbound_edges:
            job = self.get_job_for_node(inbound_node_id, parent_job)
            if job.status !== 'success':
                return False
        return True

    def handle_job_finished(self, job, pipeline):
        response_data = json.loads(job.response_data)
        content = json.loads(pipeline.content)
        parent_job = job.parent
        nodes_to_build = []
        node_id = Attribute.objects.filter(job=job, name='node_id').first().value
        for next_node_id in content['edges'][node_id]:
            if self.node_has_no_job_yet(next_node_id, parent_job):
                if self.all_other_inbound_edges_are_complete(next_node_id, content, parent_job):
                    # TODO WRITE STUFF HERE



        if parent_job.request_data:
            parent_job_request_data = json.loads(parent_job.request_data)
        else:
            parent_job_request_data = {'movies': {}}
        if job.operation == 'split_and_hash_threaded':
            for movie_url in response_data['movies']:
                parent_job_request_data['movies'][movie_url] = response_data['movies'][movie_url]
            parent_job.request_data = json.dumps(parent_job_request_data)
        elif job.operation == 'redact':
            source_movies = json.loads(parent_job.request_data)['movies']
            for movie_url in response_data['movies']:
                for frameset_hash in response_data['movies'][movie_url]['framesets']:
                    frameset = response_data['movies'][movie_url]['framesets'][frameset_hash]
                    if 'redacted_image' in frameset:
                        source_frameset = source_movies[movie_url]['framesets'][frameset_hash]
                        source_frameset['redacted_image'] = frameset['redacted_image']
            parent_job.request_data = json.dumps({'movies': source_movies})
        child_job_count = Job.objects.filter(parent=job.parent).count()
        num_steps = len(content['steps'])
        if num_steps > child_job_count:
            parent_job.elapsed_time = child_job_count / num_steps
            child_job = self.build_job(content, child_job_count, parent_job, job)
            jobs_api.dispatch_job(child_job)
        else:
            parent_job.response_data = job.response_data
            parent_job.elapsed_time = 1
            parent_job.status = 'success'
        parent_job.save()

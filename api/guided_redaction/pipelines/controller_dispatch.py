import json
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.utils.task_shared import (
    make_child_time_fractions_attribute_for_job,
    make_anticipated_operation_count_attribute_for_job,
    get_job_for_node
)
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
import guided_redaction.jobs.api as jobs_api



class DispatchController:

    def __init__(self):
        pass

    def dispatch_pipeline(self, pipeline_id, input_data, workbook_id, owner, parent_job=None):
        pipeline = Pipeline.objects.get(pk=pipeline_id)
        content = json.loads(pipeline.content)
        child_job_count = self.get_number_of_child_jobs(content) 
        if not parent_job:
            parent_job = self.build_parent_job(
              pipeline, 
              input_data,
              content, 
              workbook_id, 
              owner
            )
        make_anticipated_operation_count_attribute_for_job(parent_job, child_job_count)
        self.try_to_make_child_time_fractions_attribute(parent_job, pipeline)

        first_node_id = self.get_first_node_id(content)
        if first_node_id:
            child_job = self.build_job(content, first_node_id, parent_job)
            if child_job:
                if child_job.operation == 'pipeline' and child_job.app == 'pipeline':
                    child_pipeline_id = \
                        Attribute.objects.filter(job=child_job, name='pipeline_job_link').first().pipeline.id
                    child_job.status = 'running'
                    child_job.save()
                    if parent_job.status != 'running':
                        parent_job.status = 'running'
                        parent_job.save()
                    self.dispatch_pipeline(child_pipeline_id, input_data, workbook_id, owner, child_job)
                else:
                    jobs_api.dispatch_job(child_job)
                    parent_job.status = 'running'
                    parent_job.save()
        return parent_job.id

    def handle_job_finished(self, job, pipeline):
        parent_job = job.parent
        if job.status == 'failed':
            parent_job.response_data = job.response_data
            parent_job.status = 'failed'
            parent_job.save()
            return
        response_data = json.loads(job.response_data)
        if 'errors' in response_data:
            parent_job.response_data = job.response_data
            parent_job.status = 'failed'
            parent_job.save()
            return
        content = json.loads(pipeline.content)
        something_changed = self.load_split_and_redact_results(
            job, 
            response_data, 
            parent_job
        )
        if something_changed:
            parent_job.save()
        node_id = Attribute.objects.filter(job=job, name='node_id').first().value
        if node_id not in content['edges']: # no nodes left to dispatch, wrap up
            parent_job.response_data = job.response_data
            parent_job.status = 'success'
            parent_job.save()
            if parent_job.parent and \
                parent_job.parent.app == 'pipeline' and \
                parent_job.parent.operation == 'pipeline':
                pj_pipeline_id = \
                    Attribute.objects.filter(job=parent_job.parent, name='pipeline_job_link').first().pipeline.id
                pj_pipeline = Pipeline.objects.get(pk=pj_pipeline_id)
                self.handle_job_finished(parent_job, pj_pipeline)
            return
        for next_node_id in content['edges'][node_id]:
            if self.node_has_no_job_yet(next_node_id, parent_job):
                if self.all_other_inbound_edges_are_complete(
                    next_node_id, 
                    content, 
                    parent_job
                ):
                    preexisting_child_job = get_job_for_node(next_node_id, parent_job)
                    if preexisting_child_job:
                        return
                    child_job = self.build_job(content, next_node_id, parent_job, job)
                    if child_job:
                        jobs_api.dispatch_job(child_job)

    def try_to_make_child_time_fractions_attribute(self, parent_job, pipeline):
        if pipeline.name == 'fetch_split_hash_secure_file':
            fractions_obj = {
                'get_secure_file': .4,
                'split_and_hash_threaded': 1.6,
            }
            make_child_time_fractions_attribute_for_job(parent_job, fractions_obj)

    def get_number_of_child_jobs(self, content): 
        simplified_answer = len(content['node_metadata']['node'])
        return simplified_answer

    def get_first_node_id(self, content):
        inbound_counts = {}
        for node_id in content['node_metadata']['node']:
            inbound_counts[node_id] = 0
        for source_node_id in content['edges']:
            for target_node_id in content['edges'][source_node_id]:
                inbound_counts[target_node_id] += 1
        nodes_without_inbound = \
          [x for x in inbound_counts.keys() if inbound_counts[x] == 0]
        if nodes_without_inbound:
            return nodes_without_inbound[0]

        
    def build_parent_job(
        self, 
        pipeline, 
        build_request_data, 
        content, 
        workbook_id, 
        owner_id
    ):
        job = Job(
            status='created',
            description='top level job for pipeline '+pipeline.name,
            app='pipeline',
            operation='pipeline',
            sequence=0,
            workbook_id=workbook_id,
            request_data=json.dumps(build_request_data),
        )
        job.save()

        attribute = Attribute(
            name='pipeline_job_link',
            value='pipeline_job_link',
            job=job,
            pipeline=pipeline
        )
        attribute.save()

        if owner_id:
            job.add_owner(owner_id)

        if 'lifecycle_data' in build_request_data:
            if (
                'delete_files_with_job' in build_request_data['lifecycle_data'] and 
                build_request_data['lifecycle_data']['delete_files_with_job']
            ):
                Attribute(
                    name='delete_files_with_job',
                    value=build_request_data['lifecycle_data']['delete_files_with_job'],
                    job=job,
                ).save()
            if (
                'auto_delete_age' in build_request_data['lifecycle_data'] and 
                build_request_data['lifecycle_data']['auto_delete_age']
            ):
                Attribute(
                    name='auto_delete_age',
                    value=build_request_data['lifecycle_data']['auto_delete_age'],
                    job=job,
                ).save()

        return job

    def build_job(self, content, node_id, parent_job, previous_job=None):
        node = content['node_metadata']['node'][node_id]

        if node['type'] == 'split_and_hash' and self.parent_job_has_hashed_movies(parent_job):
            self.build_completed_split_and_hash_job(content, node, parent_job)
            if node_id in content['edges']:
                next_node_id = content['edges'][node_id][0]
                node = content['node_metadata']['node'][next_node_id]
        t1_scanner_types = ['template', 'selected_area', 'ocr', 'ocr_scene_analysis', 'mesh_match'] 
        if node['type'] in t1_scanner_types:
            return self.build_tier_1_scanner_job(
                node['type'], 
                content, 
                node, 
                parent_job, 
                previous_job
            )
        elif node['type'] == 'split_and_hash':
            return self.build_split_and_hash_job(content, node, parent_job)
        elif node['type'] == 'secure_files_import':
            return self.build_secure_files_import_job(content, node, parent_job)
        elif node['type'] == 'redact':
            return self.build_redact_job(content, node, parent_job, previous_job)
        elif node['type'] == 'zip':
            return self.build_zip_job(content, node, parent_job)
        elif node['type'] == 't1_sum':
            return self.build_t1_sum_job(content, node, parent_job)
        elif node['type'] == 't1_diff':
            return self.build_t1_diff_job(content, node, parent_job)
        elif node['type'] == 'noop':
            return self.build_noop_job(content, node, parent_job, previous_job)
        elif node['type'] == 'pipeline':
            return self.build_pipeline_job(content, node, parent_job, previous_job)
        else:
            raise Exception('UNRECOGNIZED PIPELINE JOB TYPE: {}'.format(node['type']))

    def build_t1_diff_job(self, content, node, parent_job):
        minuend_node_ids = []
        if 'minuends' in content and node['id'] in content['minuends']:
            minuend_node_ids = content['minuends'][node['id']]
        minuend_jobs = []
        if minuend_node_ids:
            for node_id in minuend_node_ids:
                job = get_job_for_node(node_id, parent_job)
                minuend_jobs.append({
                    'id': str(job.id),
                    'request_or_response_data': 'response_data',
                })
        else:
            minuend_jobs = [{
                'id': str(parent_job.id),
                'request_or_response_data': 'request_data',
            }]

        subtrahend_node_ids = []
        if 'subtrahends' in content and node['id'] in content['subtrahends']:
            subtrahend_node_ids = content['subtrahends'][node['id']]
        subtrahend_jobs = []
        for node_id in subtrahend_node_ids:
            job = get_job_for_node(node_id, parent_job)
            subtrahend_jobs.append(str(job.id))

        build_request_data = {
            'minuend_jobs': minuend_jobs,
            'subtrahend_job_ids': subtrahend_jobs,
        }
        job = Job(
            status='created',
            description='t1 diff for pipeline',
            app='pipeline',
            operation='t1_diff',
            sequence=0,
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

    def build_t1_sum_job(self, content, node, parent_job):
        addend_node_ids = []
        if 'addends' in content and node['id'] in content['addends']:
            addend_node_ids = content['addends'][node['id']]
        addend_jobs = []
        for node_id in addend_node_ids:
            job = get_job_for_node(node_id, parent_job)
            addend_jobs.append(str(job.id))

        build_request_data = {
            'job_ids': addend_jobs,
        }
        job = Job(
            status='created',
            description='t1 sum for pipeline',
            app='pipeline',
            operation='t1_sum',
            sequence=0,
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

    def build_pipeline_job(self, content, node, parent_job, previous_job):
        data_in = parent_job.request_data
        if previous_job and previous_job.response_data:
            data_in = previous_job.response_data
        job = Job(
            status='created',
            description='job for pipeline',
            app='pipeline',
            operation='pipeline',
            sequence=0,
            request_data=data_in,
            parent=parent_job,
        )
        job.save()

        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()

        pipeline = Pipeline.objects.get(pk=node['entity_id'])
        attribute = Attribute(
            name='pipeline_job_link',
            value='pipeline_job_link',
            job=job,
            pipeline=pipeline
        )
        attribute.save()

        return job

    def build_noop_job(self, content, node, parent_job, previous_job):
        data_in = parent_job.request_data
        if previous_job and previous_job.response_data:
            data_in = previous_job.response_data
        job = Job(
            status='created',
            description='noop for pipeline',
            app='pipeline',
            operation='noop',
            sequence=0,
            request_data=data_in,
            parent=parent_job,
        )
        job.save()
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()
        return job

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

    def parent_job_has_hashed_movies(self, parent_job):
        prd = json.loads(parent_job.request_data)
        if 'movies' not in prd:
            return False
        for movie_url in prd['movies']:
            if 'frames' in prd['movies'][movie_url] and \
                len(prd['movies'][movie_url]['frames']) > 0 and\
                'framesets' in prd['movies'][movie_url] and \
                len(prd['movies'][movie_url]['framesets']) > 0:
                continue
            return False
        return True

    def build_completed_split_and_hash_job(self, content, node, parent_job):
        job = Job(
            status='success',
            description='split and hash threaded for pipeline',
            app='parse',
            operation='split_and_hash_threaded',
            sequence=0,
            request_data=parent_job.request_data,
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
        parent_request_data = json.loads(parent_job.request_data)
        make_anticipated_operation_count_attribute_for_job(parent_job, 2)
        request_data = {
          'movie_urls': list(parent_request_data['movies'].keys()),
          'frameset_discriminator': 'gray8',
          'preserve_movie_audio': False,
        }
        job = Job(
            status='created',
            description='split and hash threaded for pipeline',
            app='parse',
            operation='split_and_hash_threaded',
            sequence=0,
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

    def build_secure_files_import_job(self, content, node, parent_job):
        parent_request_data = json.loads(parent_job.request_data)
        request_data = {
          'recording_ids': parent_request_data['recording_ids'],
        }
        job = Job(
            status='created',
            description='secure files import for pipeline',
            app='files',
            operation='get_secure_file',
            sequence=0,
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
        parent_request_data = json.loads(parent_job.request_data)
        movie_url = list(parent_request_data['movies'].keys())[0]

        build_movies = {}
        parent_request_data = json.loads(parent_job.request_data)
        t1_output = json.loads(previous_job.response_data)

        for movie_url in parent_request_data['movies']:
            if movie_url == 'source':
                continue
            source_movie = parent_request_data['movies'][movie_url]
            t1_framesets = {}
            if movie_url in t1_output['movies']:
                t1_framesets = t1_output['movies'][movie_url]['framesets']
            merged_movie = self.add_t1_output_to_areas_to_redact(source_movie, t1_framesets)
            build_movies[movie_url] = merged_movie

        redact_rule = {
          'mask_method': 'black_rectangle',
        }
        if 'redact_rule' in parent_request_data:
            redact_rule = parent_request_data['redact_rule']

        build_request_data = {
            "movies": build_movies,
            'redact_rule': redact_rule,
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

    def build_tier_1_scanner_job(
        self, 
        scanner_type, 
        content, 
        node, 
        parent_job, 
        previous_job
    ):
        parent_request_data = json.loads(parent_job.request_data)
        desc_string = 'scan ' + scanner_type + ' threaded '
        build_scanners = {}
        scanner = content['node_metadata']['tier_1_scanners'][scanner_type][node['entity_id']]
        build_scanners[node['entity_id']] = scanner
        build_movies = {}

        source_movies = {}
        if parent_job.request_data:
            parent_job_request_data = json.loads(parent_job.request_data)
            if 'movies' in parent_job_request_data:
                source_movies = parent_job_request_data['movies']
        if 'movies' in content and not source_movies:
            source_movies = parent_request_data['movies']

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
            'tier_1_scanners': {},
        }
        build_request_data['tier_1_scanners'][scanner_type] = build_scanners
        if scanner_type == 'template':
            operation = 'scan_template_threaded'
        elif scanner_type == 'selected_area':
            operation = 'selected_area_threaded'
        elif scanner_type == 'ocr':
            operation = 'scan_ocr'
        elif scanner_type == 'ocr_scene_analysis':
            operation = 'ocr_scene_analysis_threaded'
        elif scanner_type == 'mesh_match':
            operation = 'mesh_match_threaded'
        request_data = json.dumps(build_request_data)

        job = Job(
            status='created',
            description=desc_string,
            app='analyze',
            operation=operation,
            sequence=0,
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

    def node_has_no_job_yet(self, next_node_id, parent_job):
        job_for_node = get_job_for_node(next_node_id, parent_job)
        if job_for_node:
            return False
        return True

    def get_node_ids_with_inbound_edges(self, target_node_id, content):
        inbound_nodes = []
        for node_id in content['edges']:
            if target_node_id in content['edges'][node_id]:
                inbound_nodes.append(node_id)
        return inbound_nodes

    def all_other_inbound_edges_are_complete(
        self, 
        next_node_id, 
        content, 
        parent_job
    ):
        inbound_node_ids = self.get_node_ids_with_inbound_edges(next_node_id, content)
        for inbound_node_id in inbound_node_ids:
            job = get_job_for_node(inbound_node_id, parent_job)
            if not job:
                return False
            if job and job.status != 'success':
                return False
        return True

    def load_split_and_redact_results(self, job, response_data, parent_job):
        if parent_job.request_data:
            parent_job_request_data = json.loads(parent_job.request_data)
        else:
            parent_job_request_data = {'movies': {}}
        if job.operation == 'split_and_hash_threaded':
            something_changed = self.get_child_request_movies(parent_job)
            return something_changed
        elif job.operation == 'get_secure_file':
            parent_job.request_data = job.response_data
            return True
        elif job.operation == 'redact':
            source_movies = json.loads(parent_job.request_data)['movies']
            for movie_url in response_data['movies']:
                for frameset_hash in response_data['movies'][movie_url]['framesets']:
                    frameset = response_data['movies'][movie_url]['framesets'][frameset_hash]
                    if 'redacted_image' in frameset:
                        source_frameset = source_movies[movie_url]['framesets'][frameset_hash]
                        source_frameset['redacted_image'] = frameset['redacted_image']
            parent_job.request_data = json.dumps({'movies': source_movies})
            return True

    def get_child_request_movies(self, parent_job):
        children = Job.objects.filter(parent_id=parent_job.id)
        parent_rd = json.loads(parent_job.request_data)
        parent_movies = parent_rd['movies']
        for child in children:
            if child.status != 'success':
                return False
            child_response_data = json.loads(child.response_data)
            for movie_url in child_response_data['movies']:
                movie = child_response_data['movies'][movie_url]
                parent_movies[movie_url] = movie
        parent_rd['movies'] = parent_movies
        parent_job.request_data = json.dumps(parent_rd)
        return True

import json
from celery import current_app
from django.db import transaction

import guided_redaction.jobs.api as jobs_api
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.utils.task_shared import (
    make_child_time_fractions_attribute_for_job,
    make_anticipated_operation_count_attribute_for_job,
    get_job_owner, get_job_for_node, get_job_file_dirs,
    build_lifecycle_attribute, get_pipeline_for_job,
    preserve_inbound_recording_ids_as_attributes,
    get_inbound_recording_id_attributes,
)

class DispatchController:

    def dispatch_pipeline(self, pipeline_id, input_data,
        workbook_id=None,
        owner=None,
        parent_job=None,
        lifecycle_data=None,
        new_job_id=None,
        attributes=None,
    ):
        pipeline = Pipeline.objects.get(pk=pipeline_id)
        content = json.loads(pipeline.content)
        child_job_count = self.get_number_of_child_jobs(content) 
        if not parent_job:
            parent_job = self.build_parent_job(
              pipeline=pipeline, 
              build_request_data=input_data,
              content=content, 
              workbook_id=workbook_id, 
              lifecycle_data=lifecycle_data,
              owner_id=owner,
              new_job_id=new_job_id,
              attributes=attributes,
            )
            preserve_inbound_recording_ids_as_attributes(parent_job)
        make_anticipated_operation_count_attribute_for_job(parent_job, child_job_count)
        self.try_to_make_child_time_fractions_attribute(parent_job, pipeline)

        first_node_id = self.get_first_node_id(content)
        if first_node_id:
            child_job = self.build_job(content, first_node_id, parent_job)
            if child_job:
                self.dispatch_child(
                    parent_job, child_job, input_data, workbook_id, owner
                )
        return parent_job.id

    def handle_job_finished(self, job, pipeline):
        print(f"HANDLE JOB FINISHED for {job.operation} job {job.id}")
        parent_job = job.parent
        if job.status == 'failed':
            print("JOB FAILED")
            with transaction.atomic():
                parent_job.response_data = job.response_data
                parent_job.status = 'failed'
                parent_job.save()
                return
        response_data = json.loads(job.response_data)
        if 'errors' in response_data:
            print(
                f'JOB HAS ERRORS {job.operation} job {job.id} errors: '
                f'{response_data["errors"]}'
            )
            with transaction.atomic():
                parent_job.response_data = job.response_data
                parent_job.status = 'failed'
                parent_job.save()
            return
        content = json.loads(pipeline.content)
        self.load_split_zip_and_redact_results(
            job, response_data, parent_job, pipeline
        )
        node_id = Attribute.objects.filter(job=job, name='node_id').first().value
        if node_id not in content['edges']: # no nodes left to dispatch, wrap up
            print(
                f'JOB NO NODES LEFT {job.operation} job {job.id} '
                f'{node_id} not in {content["edges"]}'
            )
            self.wrap_up_pipeline(job, parent_job, pipeline)
            return
        if self.node_is_quick_finish(node_id, content) and \
            self.node_response_is_empty(job, content, node_id):
            print(
                f'JOB QUICK FINISH {job.operation} job {job.id} '
                f'{node_id} is quick finish with empty response'
            )
            self.wrap_up_pipeline(job, parent_job, pipeline)
            return
        child_was_dispatched = False
        non_dispatch_reasons = []
        for next_node_id in content['edges'][node_id]:
            next_node_job = get_job_for_node(next_node_id, parent_job)
            if next_node_job:
                non_dispatch_reasons.append(
                    f"{next_node_id} after {job.operation} job {job.id} "
                    f"already has job {next_node_job.operation} {next_node_job.pk}"
                )
            else:
                if self.all_other_inbound_edges_are_complete(
                    next_node_id, content, parent_job
                ):
                    # Ask DAVE C about this why just return and why not just
                    # return above?
                    #preexisting_child_job = get_job_for_node(next_node_id, parent_job)
                    #if preexisting_child_job:
                    #    return
                    child_job = self.build_job(content, next_node_id, parent_job, job)
                    if child_job:
                        workbook_id = ''
                        if job.workbook:
                            workbook_id = job.workbook.id
                        owner = get_job_owner(job)
                        self.dispatch_child(
                            parent_job,
                            child_job,
                            json.loads(job.response_data),
                            workbook_id,
                            owner,
                        )
                        child_was_dispatched = True
                    else:
                        non_dispatch_reasons.append(
                            f"{next_node_id} after {job.operation} job {job.id} "
                            "no child job returned from build_job()"
                        )
                else:
                    non_dispatch_reasons.append(
                        f"{next_node_id} after {job.operation} job {job.id} "
                        "not all inbound edges are complete"
                    )
        if not child_was_dispatched:
            print(
                f"wrapping up pipeline for {job.operation} job {job.id} and parent "
                f"{parent_job.operation} job {parent_job.id}: {non_dispatch_reasons}"
            )
            self.wrap_up_pipeline(job, parent_job, pipeline)

    def wrap_up_pipeline(self, job, parent_job, pipeline):
        job.get_data_from_cache()
        with transaction.atomic():
            parent_job.response_data = job.response_data
            if job.status == 'purged':
                parent_job.status = 'purged'
            else:
                parent_job.status = 'success'
            parent_job.save()
        if parent_job.parent and \
            parent_job.parent.app == 'pipeline' and \
            parent_job.parent.operation == 'pipeline':
            pj_pipeline_id = \
                Attribute.objects.filter(job=parent_job.parent, name='pipeline_job_link').first().pipeline.id
            pj_pipeline = Pipeline.objects.get(pk=pj_pipeline_id)
            self.handle_job_finished(parent_job, pj_pipeline)

    def dispatch_child(self, parent_job, child_job, input_data, workbook_id, owner):
        if child_job.operation == 'pipeline' and child_job.app == 'pipeline':
            with transaction.atomic():
                child_pipeline_id = \
                    Attribute.objects.filter(
                        job=child_job, name='pipeline_job_link'
                    ).first().pipeline.id
                if child_job.status != 'bypassed':
                    child_job.status = 'running'
                child_job.save()
                if parent_job.status != 'running':
                    parent_job.status = 'running'
                    parent_job.save()
            self.dispatch_pipeline(
                child_pipeline_id, input_data, workbook_id, owner, child_job
            )
        else:
            with transaction.atomic():
                parent_job.status = 'running'
                parent_job.save()
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

        
    def build_parent_job(self, 
        pipeline, 
        build_request_data, 
        content, 
        workbook_id, 
        lifecycle_data,
        owner_id,
        new_job_id=None,
        attributes=None,
    ):
        job = Job(
            pk=new_job_id,
            status='created',
            description='top level job for pipeline '+pipeline.name,
            app='pipeline',
            operation='pipeline',
            sequence=0,
            workbook_id=workbook_id,
            request_data=json.dumps(build_request_data),
        )
        with transaction.atomic():
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

            if not lifecycle_data:
                lifecycle_data = {}
            if not lifecycle_data.get('delete_files_with_job'):
                lifecycle_data['delete_files_with_job'] = True
            if not lifecycle_data.get('auto_delete_age'):
                lifecycle_data['auto_delete_age'] = '1day'
            if lifecycle_data:
                build_lifecycle_attribute('delete_files_with_job', lifecycle_data, job)
                build_lifecycle_attribute('auto_delete_age', lifecycle_data, job)
                build_lifecycle_attribute('bypass_purge_job_resources', lifecycle_data, job)
            for name, value in (attributes or {}).items():
                attribute = Attribute(name=name, value=value, job=job)
                attribute.save()
        return job

    def build_job(self, content, node_id, parent_job, previous_job=None):
        # TODO, have a separate method that looks at parent_job, previous_job and the node data.
        #   use it to build the 'request_data' for the new job.  This is the best way to centralize the 
        #   'use something other than the prev node for input' logic.  
        node = content['node_metadata']['node'][node_id]

        if node['type'] == 'split_and_hash' and self.parent_job_has_hashed_movies(parent_job):
            self.build_completed_split_and_hash_job(content, node, parent_job)
            if node_id in content['edges']:
                next_node_id = content['edges'][node_id][0]
                node = content['node_metadata']['node'][next_node_id]
        t1_scanner_types = [
            'template', 'selected_area', 'ocr', 'data_sifter', 'mesh_match', 'selection_grower', 
            'focus_finder', 't1_filter'
        ] 
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
        elif node['type'] == 'intersect':
            return self.build_intersect_job(content, node, parent_job)
        elif node['type'] == 'secure_files_export':
            return self.build_secure_files_export_job(content, node, parent_job, previous_job)
        elif node['type'] == 'remove_job_resources':
            return self.build_remove_job_resources_job(content, node, parent_job)
        elif node['type'] == 'save_gt_attribute':
            return self.build_save_gt_attribute_job(content, node, parent_job, previous_job)
        else:
            error_string = 'UNRECOGNIZED PIPELINE JOB TYPE: {}'.format(node['type'])
            self.fail_job_with_message(parent_job, error_string)
            # returning nothing means the pipeline will halt now

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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_intersect_job(self, content, node, parent_job):
        input_node_ids = []
        if 'intersect_feeds' in content and node['id'] in content['intersect_feeds']:
            input_node_ids = content['intersect_feeds'][node['id']]
        jobs = []
        for node_id in input_node_ids:
            job = get_job_for_node(node_id, parent_job)
            jobs.append(str(job.id))

        build_request_data = {
            'job_ids': jobs,
        }
        job = Job(
            status='created',
            description='intersect for pipeline',
            app='analyze',
            operation='intersect',
            sequence=0,
            request_data=json.dumps(build_request_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_pipeline_job(self, content, node, parent_job, previous_job):
        data_in = parent_job.request_data
        if previous_job and previous_job.response_data:
            data_in = previous_job.response_data
        if not node['entity_id']:
            print('error, cannot dispatch pipeline task, entity id is empty')
            return
        pipeline = Pipeline.objects.get(pk=node['entity_id'])

        source_movies = self.get_source_movies_from_parent_job(parent_job)

        build_data = json.loads(data_in)
        if source_movies and 'source' not in build_data['movies']:
            build_data['movies']['source'] = source_movies

        job = Job(
            status='created',
            description='job for pipeline ' + pipeline.name,
            app='pipeline',
            operation='pipeline',
            sequence=0,
            request_data=json.dumps(build_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)

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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_split_and_hash_job(self, content, node, parent_job):
        parent_request_data = json.loads(parent_job.request_data)
        make_anticipated_operation_count_attribute_for_job(parent_job, 2)
        request_data = {
          'movie_urls': list(parent_request_data['movies'].keys()),
          'frameset_discriminator': 'gray8',
          'preserve_movie_audio': True,
        }
        time_ranges_inclusive = parent_request_data.get('time_ranges_inclusive')
        if time_ranges_inclusive:
            request_data['time_ranges_inclusive'] = time_ranges_inclusive
        job = Job(
            status='created',
            description='split and hash threaded for pipeline',
            app='parse',
            operation='split_and_hash_threaded',
            sequence=0,
            request_data=json.dumps(request_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def fail_job_with_message(self, job, message):
        response_obj = {
            'errors': [message],
        }
        with transaction.atomic():
            job.response_data = json.dumps(response_obj)
            job.status = 'failed'
            job.save()

    def build_save_gt_attribute_job(self, content, node, parent_job, previous_job):
        previous_response_data = json.loads(previous_job.response_data)
        parent_request_data = json.loads(parent_job.request_data)

        account_id = parent_request_data.get('original_account_id')
        transaction_id = parent_request_data.get('original_transaction_id')
        timestamp = parent_request_data.get('original_timestamp')

        if previous_response_data and account_id and transaction_id and timestamp:
            previous_response_data['original_account_id'] = account_id
            previous_response_data['original_transaction_id'] = transaction_id
            previous_response_data['original_timestamp'] = timestamp
            job = Job(
                status='created',
                description='save gt attribute',
                app='files',
                operation='save_gt_attribute',
                sequence=0,
                request_data=json.dumps(previous_response_data),
                parent=parent_job,
            )
        else:
            errs = {
                'errors': 'unable to build record, missing some attributes'
            }
            job = Job(
                status='failed',
                description='save gt attribute',
                app='files',
                operation='save_gt_attribute',
                sequence=0,
                request_data=json.dumps(errs),
                parent=parent_job,
            )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_remove_job_resources_job(self, content, node, parent_job):
        for attr in Attribute.objects.filter(job=parent_job).filter(name='bypass_purge_job_resources'):
            if attr.value == 'True':
                print('BYPASSING PURGING JOB RESOURCES DUE TO LIFECYCLE DATA')
                build_data = {'directories': []}
                job = Job(
                    status='bypassed',
                    description='remove job resources',
                    app='files',
                    operation='remove_directories',
                    sequence=0,
                    request_data=json.dumps(build_data),
                    response_data=json.dumps({'status': 'bypassed'}),
                    parent=parent_job,
                )
                with transaction.atomic():
                    job.save()
                    self.add_job_node_attribute(job, node)
                return job

        child_dirs = get_job_file_dirs(parent_job)
        build_data = {
            'directories': child_dirs,
            'primary_job_id': str(parent_job.id),
        }
        job = Job(
            status='created',
            description='remove job resources',
            app='files',
            operation='remove_directories',
            sequence=0,
            request_data=json.dumps(build_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_secure_files_export_job(self, content, node, parent_job, previous_job):
        prev_response_data = json.loads(previous_job.response_data)
        if previous_job.operation != 'zip_movie_threaded':
            self.fail_job_with_message(parent_job, 
                'cannot build pipeline export job: input was not a zip movie jobs output')
            return

        job = Job(
            status='created',
            description='secure files export for pipeline',
            app='files',
            operation='put_secure_file',
            sequence=0,
            request_data=json.dumps(prev_response_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def add_job_node_attribute(self, job, node):
        Attribute(
            name='node_id',
            value=node['id'],
            job=job,
        ).save()

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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def build_redact_job(self, content, node, parent_job, previous_job):
        parent_request_data = json.loads(parent_job.request_data)
        movie_url = list(parent_request_data['movies'].keys())[0]

        parent_request_data = json.loads(parent_job.request_data)
        t1_output = json.loads(previous_job.response_data)
        build_movies = {}
        if 'movies' in t1_output and t1_output['movies']:
            build_movies = t1_output['movies']
            if 'source' not in build_movies:
                source_movies = self.get_source_movies_from_parent_job(parent_job)
                build_movies['source'] = source_movies

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
            operation='redact_t1',
            sequence=0,
            request_data=json.dumps(build_request_data),
            parent=parent_job,
        )
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def get_source_movies_from_parent_job(self, parent_job):
        source_movies = {}
        if parent_job.request_data:
            parent_job_request_data = json.loads(parent_job.request_data)
            if 'movies' in parent_job_request_data:
                request_movies = parent_job_request_data['movies']
                if not request_movies:
                    return {}
                if 'source' in request_movies:
                    # this is true where we are passing in t1 results to a pipeline, along
                    #   with source movies (the use parsed movies checkbox on the pipeline controls)
                    source_movies = request_movies['source']
                else:
                    first_movie_url = list(request_movies.keys())[0]
                    movie = request_movies[first_movie_url]
                    if 'frames' in movie and movie['frames']:
                        source_movies = request_movies
        return source_movies

    def build_tier_1_scanner_job(
        self, 
        scanner_type, 
        content, 
        node, 
        parent_job, 
        previous_job
    ):
        if parent_job.request_data_path and len(parent_job.request_data) < 3:
            parent_job.get_data_from_cache()

        parent_job_request_data = json.loads(parent_job.request_data)
        desc_string = 'scan ' + scanner_type + ' threaded '
        build_scanners = {}
        scanner = content['node_metadata']['tier_1_scanners'][scanner_type][node['entity_id']]
        build_scanners[node['entity_id']] = scanner
        build_movies = {}

        source_movies = self.get_source_movies_from_parent_job(parent_job)

        if previous_job:
            if node.get('input'):
                input_job = get_job_for_node(node['input'], parent_job)
                if input_job:
                    input_response = json.loads(input_job.response_data)
                    # this is a hack, not sure why it doesn't get picked up with the normal job fetch
                    if not input_response and input_job.response_data_path:
                        input_job.get_data_from_cache()
                        input_response = json.loads(input_job.response_data)
                    build_movies = input_response['movies']
            else:
                previous_result = json.loads(previous_job.response_data)
                if not previous_result and previous_job.response_data_path:
                    # this is a hack, not sure why it doesn't get picked up with the normal job fetch
                    previous_job.get_data_from_cache()
                    previous_result = json.loads(previous_job.response_data)
                if previous_result.get('movies'):
                    build_movies = previous_result['movies']
            if source_movies and 'source' not in build_movies:
                build_movies['source'] = source_movies
        else:
            if parent_job_request_data and 'movies' in parent_job_request_data:
                build_movies = parent_job_request_data['movies']

        build_request_data = {
            'movies': build_movies,
            'scan_level': scanner['scan_level'],
            'id': scanner['id'],
            'tier_1_scanners': {},
        }
        build_request_data['tier_1_scanners'][scanner_type] = build_scanners

        if node['type'] == 'data_sifter':
            self.try_to_add_ocr_subjob(build_request_data, node, content, parent_job, 'data_sifter')
        elif node['type'] == 'focus_finder':
            self.try_to_add_ocr_subjob(build_request_data, node, content, parent_job, 'focus_finder')
        elif node['type'] == 'ocr':
            self.try_to_add_ocr_subjob(build_request_data, node, content, parent_job, 'ocr')
            self.try_to_add_data_sifter_subjob(build_request_data, node, content, parent_job)

        operation = scanner_type + '_threaded'
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
        with transaction.atomic():
            job.save()
            self.add_job_node_attribute(job, node)
        return job

    def try_to_add_ocr_subjob(self, build_request_data, node, content, parent_job, scanner_type):
        scanner_id = list(build_request_data['tier_1_scanners'][scanner_type].keys())[0]
        scanner = build_request_data['tier_1_scanners'][scanner_type][scanner_id]

        if 'ocr_jobs' in content and node['id'] in content['ocr_jobs']:
            ocr_node_ids = content['ocr_jobs'][node['id']]
            for node_id in ocr_node_ids:
                ocr_job = get_job_for_node(node_id, parent_job)
                scanner['ocr_job_id'] = str(ocr_job.id)

    def try_to_add_data_sifter_subjob(self, build_request_data, node, content, parent_job):
        scanner_id = list(build_request_data['tier_1_scanners']['ocr'].keys())[0]
        scanner = build_request_data['tier_1_scanners']['ocr'][scanner_id]

        if 'data_sifter_jobs' in content and node['id'] in content['data_sifter_jobs']:
            ds_node_ids = content['data_sifter_jobs'][node['id']]
            for node_id in ds_node_ids:
                ds_job = get_job_for_node(node_id, parent_job)
                scanner['data_sifter_job_id'] = str(ds_job.id)

    def get_node_ids_with_inbound_edges(self, target_node_id, content):
        inbound_nodes = []
        for node_id in content['edges']:
            if target_node_id in content['edges'][node_id]:
                inbound_nodes.append(node_id)
        return inbound_nodes

    def all_other_inbound_edges_are_complete(self, next_node_id, content, parent_job):
        inbound_node_ids = self.get_node_ids_with_inbound_edges(next_node_id, content)
        for inbound_node_id in inbound_node_ids:
            job = get_job_for_node(inbound_node_id, parent_job)
            if not job or job.status != 'success':
                return False
        return True

    def load_split_zip_and_redact_results(self,
        job, response_data, parent_job, pipeline
    ):
        what_changed = []
        if parent_job.request_data:
            parent_data = json.loads(parent_job.request_data)
            if 'movies' not in parent_data:
                parent_data['movies'] = {}
                what_changed.append('added empty movies hash to parent_data')
        else:
            parent_data = {'movies': {}}
            what_changed.append('added parent_data from scratch')

        if job.operation == 'split_and_hash_threaded':
            self.load_child_movies(response_data, parent_data)
            cnt = len(parent_data['movies'])
            what_changed.append(
                f'loaded {cnt} child movies from split_and_hash_threaded'
            )
        elif job.operation == 'get_secure_file':
            self.load_child_movies(response_data, parent_data)
            cnt = len(parent_data['movies'])
            what_changed.append(
                f'loaded {cnt} child movies from get_secure_file'
            )
        elif job.operation == 'pipeline':
            if self.job_is_equivalent_to_split_hash(job):
                self.load_child_movies(response_data, parent_data)
                cnt = len(parent_data['movies'])
                what_changed.append(
                    f'loaded {cnt} child movies from get_secure_file'
                )
        elif job.operation == 'redact_t1':
            for movie_url in response_data['movies']:
                if movie_url not in parent_data['movies']:
                    print(f'redact t1: {movie_url} url not in parent_data - skipping')
                    print(f"PARENT DATA: {parent_data['movies']}")
                    continue
                for frameset_hash in response_data['movies'][movie_url]['framesets']:
                    if (frameset_hash not in
                        parent_data['movies'][movie_url]['framesets']
                    ):
                        print(
                            f'redact t1: {frameset_hash} hash not in response_data '
                            '- skipping'
                        )
                        print(f"RESPONSE DATA: {response_data}")
                        continue
                    parent_frameset = \
                        parent_data['movies'][movie_url]['framesets'][frameset_hash]
                    resp_frameset = \
                        response_data['movies'][movie_url]['framesets'][frameset_hash]
                    if 'redacted_image' not in resp_frameset:
                        print('redact t1: no redacted images in response frameset')
                        print(f'RESPONSE FRAMESET: {resp_frameset}')
                        continue
                    parent_frameset['redacted_image'] = resp_frameset['redacted_image']
                    what_changed.append(
                        'loaded frameset redacted image from redact_t1'
                    )
        elif job.operation == 'zip_movie_threaded':
            for movie_url in response_data:
                if movie_url not in parent_data['movies']:
                    continue
                parent_data['movies'][movie_url]['redacted_movie_url'] = \
                    response_data[movie_url]['redacted_movie_url']
                what_changed.append(
                    f"loaded {response_data[movie_url]['redacted_movie_url']} "
                    "from zip_movie_threaded"
                )
        memo = f'load_split_zip_and_redact_results() for {job.operation} job {job.id}'
        if what_changed:
            print(
                f'{memo} loading parent_job.request_data and saving parent_job '
                f'because of changes {what_changed}'
            )
            with transaction.atomic():
                parent_job.request_data = json.dumps(parent_data)
                parent_job.save()
        else:
            print(f'{memo} nothing changed')

    def job_is_equivalent_to_split_hash(self, job):
        pipeline = get_pipeline_for_job(job)
        content = json.loads(pipeline.content)
        # if its first node gets recording ids, and it returns source looking movies, yes
        first_node_id = self.get_first_node_id(content)
        first_child_job = get_job_for_node(first_node_id, job)
        if first_child_job.status != 'success':
            return False
        first_req = json.loads(first_child_job.request_data)
        if not first_req.get('recording_ids'):
            return False
        final_resp = json.loads(job.response_data)
        if not final_resp.get('movies'):
            return False
        movies = final_resp.get('movies')
        for movie_url in movies:
            if movie_url == 'source': 
                continue
            if not movies[movie_url].get('frames'):
                return False
        return True

    def load_child_movies(self, response_data, request_data):
        for movie_url in response_data.get('movies'):
            if not request_data['movies'].get('movie_url'):
                request_data['movies'][movie_url] = response_data.get('movies')[movie_url]

    def node_is_quick_finish(self, node_id, content):
        if node_id in content.get('quick_finish_nodes', {}):
            return True

    def node_response_is_empty(self, job, content, node_id):
        if not job.response_data:
            return True
        resp_data = json.loads(job.response_data)
        if not resp_data:
            return True
        node_type = content['node_metadata']['node'][node_id]['type']
        if node_type == 'noop': 
            return False

        for key in resp_data.keys():
            if key == 'movies':
                if len(resp_data.get('movies').keys()) == 0:
                    return True
                for movie_url in resp_data.get('movies'):
                    if node_type == 'secure_files_import': 
                        return False 
                    movie = resp_data.get('movies')[movie_url]
                    if not movie.get('framesets'):
                        continue
                    for frameset_hash in movie.get('framesets'):
                        for match_obj in movie.get('framesets')[frameset_hash]:
                            return False
        return True


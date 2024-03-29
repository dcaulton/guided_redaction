import json
import os
import requests
from traceback import format_exc
import uuid

from django.conf import settings
from zipfile import ZipFile

from guided_redaction.jobs.models import Job
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.utils.classes.FileWriter import FileWriter


class ExportController():

    def __init__(self):
        pass

    def do_export(self, request_data):
        download_url = ''

        try:
            filename = 'export_' + str(uuid.uuid4()) + '.zip'
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            workdir_uuid = str(uuid.uuid4())
            workdir = fw.create_unique_directory(workdir_uuid)
            file_fullpath = fw.build_file_fullpath_for_uuid_and_filename(workdir_uuid, filename)

            self.build_zip_file(
                fw, 
                file_fullpath, 
                request_data, 
                workdir_uuid 
            )

            download_url = fw.get_url_for_file_path(file_fullpath)

            return {"archive_url": download_url}
        except Exception as e:
            return {'errors' : 'export failed, sorry about that'}


    def build_zip_file(self, fw, output_file_fullpath, request_data, workdir_uuid):
        print('starting export')
        build_obj = {
            'jobs': {},
            'tier_1_scanners': {},
            'movies': {},
            'pipelines': {},
            'job_run_summaries': {},
            'job_eval_objectives': {},
            'meta': {},
        }
        zipObj = ZipFile(output_file_fullpath, 'w')

        build_obj['meta']['base_url'] = fw.base_url
        build_obj['meta']['working_dir'] = fw.working_dir

        if 'job_ids' in request_data and request_data['job_ids']:
            for job_id in request_data['job_ids']:
                job = Job.objects.get(pk=job_id)
                self.add_job_to_dict(job, build_obj, zipObj, request_data, fw)

        if 'pipeline_ids' in request_data and request_data['pipeline_ids']:
            for pipeline_id in request_data['pipeline_ids']:
                pipeline = Pipeline.objects.get(pk=pipeline_id)
                self.add_pipeline_to_dict(pipeline, build_obj)

        if 'movies' in request_data and request_data['movies']:
            for movie_url in request_data['movies']:
                self.add_movie_to_dict_and_zip(
                    movie_url, 
                    request_data['movies'][movie_url], 
                    build_obj, 
                    zipObj, 
                    request_data,
                    fw
                )

        if 'jrs_ids' in request_data and request_data['jrs_ids']:
            for jrs_id in request_data['jrs_ids']:
                jrs = JobRunSummary.objects.get(pk=jrs_id)
                self.add_jrs_to_dict(jrs, build_obj, zipObj, request_data, fw)

        json_filename = 'export_master.json'
        json_archive_path = os.path.join('guided_redaction', 'work', json_filename)
        json_file_fullpath = fw.build_file_fullpath_for_uuid_and_filename(workdir_uuid, json_filename)
        text_data = json.dumps(build_obj)
        x = fw.write_text_data_to_filepath(text_data, json_file_fullpath)
        zipObj.write(json_file_fullpath, json_filename)

        zipObj.close()
        print('zip written')

    def add_job_to_dict(self, job, build_dict, zipObj, request_data, fw):
        if job.id in build_dict['jobs']:
            return
        print('adding job {}'.format(job.id))
        build_dict['jobs'][str(job.id)] = job.as_dict()
        if job.request_data:
            reqd = json.loads(job.request_data)
            if 'tier_1_scanners' in reqd:
                for scanner_type in reqd['tier_1_scanners']:
                    for scanner_id in reqd['tier_1_scanners'][scanner_type]:
                        if scanner_type not in build_dict['tier_1_scanners']:
                            build_dict['tier_1_scanners'][scanner_type] = {}
                        if scanner_id in build_dict['tier_1_scanners'][scanner_type]:
                            continue
                        print('adding {} scanner {}'.format(scanner_type, scanner_id))
                        build_dict['tier_1_scanners'][scanner_type][scanner_id] = \
                            reqd['tier_1_scanners'][scanner_type][scanner_id]
            if 'movies' in reqd:
                for movie_url in reqd['movies']:
                    if movie_url == 'source':
                        for source_movie_url in reqd['movies']['source']:
                            self.add_movie_to_dict_and_zip(
                                source_movie_url, 
                                reqd['movies']['source'][source_movie_url],
                                build_dict, 
                                zipObj, 
                                request_data,
                                fw
                            )
                        continue
                    movie = reqd['movies'][movie_url]
                    if 'frames' in movie and movie['frames']:
                        self.add_movie_to_dict_and_zip(
                            movie_url, 
                            movie,
                            build_dict, 
                            zipObj, 
                            request_data,
                            fw
                        )
        if request_data.get('include_child_jobs'):
            children = Job.objects.filter(parent=job)
            for child in children:
                self.add_job_to_dict(child, build_dict, zipObj, request_data, fw)

    def add_movie_to_dict_and_zip(self, movie_url, movie, build_dict, zipObj, request_data, fw):
        if movie_url in build_dict['movies']:
            return
        build_dict['movies'][movie_url] = movie
        movie_url_fullpath = fw.get_file_path_for_url(movie_url)
        (x_part, file_part) = os.path.split(movie_url)
        (y_part, uuid_part) = os.path.split(x_part)
        new_path = os.path.join(uuid_part, file_part)
        print('adding movie file {}'.format(new_path))
        zipObj.write(movie_url_fullpath, new_path)

        # if the movie has refs to objects in other dirs (eg redacted files), add those dirs too
        uuid_dirs_to_add = [uuid_part]
        for frameset_hash in movie['framesets']:
            frameset = movie['framesets'][frameset_hash]
            if 'redacted_image' in frameset:
                image_url = frameset['redacted_image']
                (x_part, file_part) = os.path.split(image_url)
                (y_part, uuid_part) = os.path.split(x_part)
                if uuid_part not in uuid_dirs_to_add:
                    uuid_dirs_to_add.append(uuid_part)
            if 'illustrated_image' in frameset:
                image_url = frameset['illustrated_image']
                (x_part, file_part) = os.path.split(image_url)
                (y_part, uuid_part) = os.path.split(x_part)
                if uuid_part not in uuid_dirs_to_add:
                    uuid_dirs_to_add.append(uuid_part)
        if len(uuid_dirs_to_add) > 1:
            for uuid_dir in uuid_dirs_to_add[1:]:
                old_dir_filepath = fw.build_file_fullpath_for_uuid_and_filename(uuid_dir)
                zipObj.write(old_dir_filepath, uuid_dir)

    def add_pipeline_to_dict(self, pipeline, build_dict):
        print('adding pipeline {}'.format(pipeline.id))
        pipeline_id = str(pipeline.id)
        if pipeline_id in build_dict['pipelines']:
            return
        build_dict['pipelines'][pipeline_id] = pipeline.as_dict()
        child_pipeline_ids = []
        if pipeline.content:
            content = json.loads(pipeline.content)
            for scanner_type in content['node_metadata']['tier_1_scanners']:
                for scanner_id in content['node_metadata']['tier_1_scanners'][scanner_type]:
                    if scanner_type not in build_dict['tier_1_scanners']:
                        build_dict['tier_1_scanners'][scanner_type] = {}
                    scanner = content['node_metadata']['tier_1_scanners'][scanner_type][scanner_id]
                    print('adding {} {}'.format(scanner_type, scanner_id))
                    build_dict['tier_1_scanners'][scanner_type][scanner_id] = scanner
            for node_id in content['node_metadata']['node']:
                node = content['node_metadata']['node'][node_id]
                if node['type'] == 'pipeline' and node['entity_id'] not in build_dict['pipelines']:
                    child_pipeline_ids.append(node['entity_id'])

        for pipeline_id in child_pipeline_ids:
            print('child pipeline detected, adding {}'.format(pipeline_id))
            pipeline = Pipeline.objects.get(pk=pipeline_id)
            self.add_pipeline_to_dict(pipeline, build_dict)

    def get_child_pipeline_ids(self, pipeline_content, build_dict):
        child_ids = []
        for node_id, node in content['node_metadata']['node'].items():
            if node['type'] == 'pipeline':
                child_ids.append(node['entity_id'])
        return child_ids

    def add_jrs_to_dict(self, jrs, build_dict, zipObj, request_data, fw):
        print('adding jrs {}'.format(jrs.id))
        build_dict['job_run_summaries'][str(jrs.id)] = jrs.as_dict()
        jeo = jrs.job_eval_objective
        build_dict['job_eval_objectives'][str(jeo.id)] = jeo.as_dict()
        job = jrs.job
        self.add_job_to_dict(
            job, 
            build_dict,
            zipObj, 
            request_data,
            fw
        )


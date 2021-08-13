import json
import os
import shutil
import uuid

import requests
from django.conf import settings
from zipfile import ZipFile

from guided_redaction.files import tasks as files_tasks
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.jobs.models import Job
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.scanners.models import Scanner
from guided_redaction.task_queues import get_task_queue
from guided_redaction.utils.classes.FileWriter import FileWriter

class UnzipArchiveController():

    def __init__(self):
        pass

    def unzip_archive(self, request_data):
        archive_url = request_data['archive_url']
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        archive_filepath = fw.get_file_path_for_url(archive_url)
        (x_part, archive_file_part) = os.path.split(archive_filepath)
        if os.path.splitext(archive_file_part)[-1] != '.zip':
            return self.error(['non-zip file uploaded, cannot unzip'], status_code=400)
        (y_part, workdir_uuid) = os.path.split(x_part)
        unzip_dir = fw.build_file_fullpath_for_uuid_and_filename(workdir_uuid, '')

        zipObj = ZipFile(archive_filepath, 'r')
        zipObj.extractall(unzip_dir)
        master_json_path = os.path.join(unzip_dir, 'export_master.json')
        with open(master_json_path) as fh:
            master_json = json.load(fh)

        # TODO translate the urls and file paths for these objs to new urls/dirs before loading them.
#        old_base_url = master_json['meta']['base_url']
#        new_base_url = fw.base_url
#        old_working_dir = master_json['meta']['working_dir']
#        new_working_dir = fw.working_dir

        job_count = self.add_jobs(master_json)
        scanner_count = self.add_scanners(master_json)
        pipeline_count = self.add_pipelines(master_json)
        build_movies = self.add_movie_data(fw, unzip_dir, master_json)
        added_uuid_dirs = self.add_uuid_dirs(fw, unzip_dir)
        job_run_summaries, job_eval_objectives = self.add_jrs_records(master_json)

        movie_count = 0
        for movie_url in master_json.get('movies', {}):
            build_movies[movie_url] = master_json['movies'][movie_url]
            movie_count += 1

        build_obj = {
            'job_count': job_count,
            'scanner_count': scanner_count,
            'pipeline_count': pipeline_count,
            'movie_count': movie_count,
            'movies': build_movies,
            'added_uuid_dirs': added_uuid_dirs,
            'job_run_summaries': job_run_summaries,
            'job_eval_objectives': job_eval_objectives,
        }
        return build_obj

    def add_uuid_dirs(self, fw, unzip_dir):
        for item in os.listdir(unzip_dir):
            if item.endswith('.json'):
                continue
            if item.endswith('.zip'):
                continue

            item_fullpath = os.path.join(unzip_dir, item)
            target_dir = fw.build_file_fullpath_for_uuid_and_filename(item, '')
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
            print('copying dir {} to {}'.format(item_fullpath, target_dir))
            shutil.copytree(item_fullpath, target_dir)

    def old_url_to_new(self, fw, old_url):
        (x_part, file_part) = os.path.split(old_url)
        (y_part, uuid_part) = os.path.split(x_part)
        new_movie_filename = fw.build_file_fullpath_for_uuid_and_filename(uuid_part, file_part)
        new_movie_url = fw.get_url_for_file_path(new_movie_filename)

    def add_movie_data(self, fw, nest_dir, master_json):
        # if new base url is the same as the one for the movie url:
        if not master_json.get('movies'):
            return {}
        first_movie_url = list(master_json['movies'].keys())[0]
        new_movie_url = self.old_url_to_new(fw, first_movie_url)
        if new_movie_url == first_movie_url:
            # no url conversion needed, the files were exported from this server
            return master_json['movies']

        build_movies = {}
        movies_in = master_json.get('movie_urls', {})
        for movie_url in movies_in:
            new_movie_url = self.old_url_to_new(fw, movie_url)
            build_movie = movies_in[movie_url]

            build_frames = []
            for image_url in movies_in[movie_url].get('frames'):
                new_img_url = self.old_url_to_new(fw, image_url)
                build_frames.append(new_img_url)
            if build_frames:
                build_movie['frames'] = build_frames

            build_framesets = {}
            source_framesets = movies_in[movie_url].get('framesets')
            for frameset_hash in source_framesets:
                frameset_data = source_framesets[frameset_hash]
                build_fs_images = []
                for image_url in frameset_data['images']:
                    new_img_url = self.old_url_to_new(fw, image_url)
                    build_fs_images.append(new_img_url)
                if build_fs_images:
                    frameset_data = build_fs_images
#  todo add frameset data, as well as redacted, illustrated image urls
        return build_movies

    def add_jobs(self, master_json):
        job_count = 0
        self.old_to_new_job_mappings = {}
        for job_id in master_json.get('jobs', {}):
            print('adding job {}'.format(job_id))
            if Job.objects.filter(pk=job_id).exists():
                print('  job already exists, clearing it out')
                Job.objects.get(pk=job_id).delete()
            job = master_json['jobs'][job_id]
            job = Job(
                id=job_id,
                request_data=job['request_data'],
                response_data=job['response_data'],
                status=job['status'],
                percent_complete=job['percent_complete'],
                description=job['description'],
                app=job['app'],
                operation=job['operation'],
                sequence=job['sequence'],
            )
            job.save()
            self.old_to_new_job_mappings[job_id] = job.id
            job_count += 1
        # second, add relations between jobs
        for job_id in master_json.get('jobs', {}):
            job_imported = master_json['jobs'][job_id]
            if 'parent_id' in job_imported and \
                job_imported['parent_id'] and \
                job_imported['parent_id'] != 'None':
                print('adding links for job {} {}'.format(job_id, job_imported['parent_id']))
                job = Job.objects.get(pk=job_id)
                new_parent_id = job_imported['parent_id']
                if job_imported['parent_id'] in self.old_to_new_job_mappings:
                    new_parent_id = self.old_to_new_job_mappings[job_imported['parent_id']]
                else:
                    # we haven't built the parent yet, this job won't link correctly
                    pass
                job.parent_id = new_parent_id
                job.save()
                self.old_to_new_job_mappings[job_id] = job.id
        return job_count

    def add_scanners(self, master_json):
        scanner_count = 0
        for scanner_type in master_json.get('tier_1_scanners', {}):
            for scanner_id in master_json['tier_1_scanners'][scanner_type]:
                scanner = master_json['tier_1_scanners'][scanner_type][scanner_id]
                if Scanner.objects.filter(name=scanner['name']).exists():
                    Scanner.objects.filter(name=scanner['name']).delete()

                scanner = Scanner(
                    type=scanner_type,
                    name=scanner['name'],
                    content=json.dumps(scanner),
                )
                scanner.save()
                scanner_count += 1
        return scanner_count

    def add_pipelines(self, master_json):
        pipeline_count = 0
        for pipeline_id in master_json.get('pipelines', {}):
            input_pipeline = master_json['pipelines'][pipeline_id]
            pipeline = Pipeline(
                id=pipeline_id,
                name=input_pipeline['name'],
                description=input_pipeline['description'],
                content=input_pipeline['content'],
            )
            pipeline.save()
            pipeline_count += 1
        return pipeline_count

    def add_jrs_records(self, master_json):
        jeo_count = 0
        jrs_count = 0

        self.old_to_new_jeo_mappings = {}
        for jeo_id in master_json.get('job_eval_objectives', {}):
            if JobEvalObjective.objects.filter(jeo_id).exists():
                continue
            input_jeo = master_json['job_eval_objectives'][jeo_id]
            jeo = JobEvalObjective(
                description=input_jeo['description'],
                content=input_jeo['content'],
            )
            jeo.save()
            self.old_to_new_jeo_mappings[jeo_id] = jeo.id
            jeo_count += 1

        for jrs_id in master_json.get('job_run_summaries', {}):
            if JobRunSummary.objects.filter(jrs_id).exists():
                continue
            input_jrs = master_json['job_run_summaries'][jrs_id]

            old_jeo_id = input_jrs['job_eval_objective_id']
            new_jeo_id = self.old_to_new_jeo_mappings[old_jeo_id]
            jeo = JobEvalObjective.objects.get(pk=new_jeo_id)

            new_job_id = self.old_to_new_job_mappings[input_jrs['job_id']]
            job = Job.objects.get(pk=new_job_id)

            jrs = JobRunSummary(
                job_eval_objective=jeo,
                job=job,
                summary_type=input_jeo['summary_type'],
                score=input_jeo['score'],
                content=input_jeo['content'],
            )
            jrs.save()
            jrs_count += 1

        return jrs_count, jeo_count


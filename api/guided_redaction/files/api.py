import os
import json
import uuid
import base64
import shutil
from django.conf import settings
import time
import requests
from rest_framework.response import Response
from base import viewsets
from guided_redaction.utils.classes.FileWriter import FileWriter
from zipfile import ZipFile
from guided_redaction.jobs.models import Job
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.scanners.models import Scanner
from guided_redaction.files import tasks as files_tasks


class FilesViewSet(viewsets.ViewSet):
    def list(self, request):
        files_list = {}
        total_overall_space_used = 0
        for (dirpath, dirnames, filenames) in os.walk(settings.REDACT_FILE_STORAGE_DIR):
            if dirpath == settings.REDACT_FILE_STORAGE_DIR:
                continue
            files_list[dirpath] = {}
            files_list[dirpath]['files'] = []
            total_dir_space_used = 0
            for filename in filenames:
                file_fullpath = os.path.join(dirpath, filename)
                info = os.stat(file_fullpath)
                info_string = 'file: {}  size:{:,}, created: {}'.format(
                    filename,
                    info.st_size, 
                    time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(info.st_ctime))
                )
                total_dir_space_used += info.st_size
                files_list[dirpath]['files'].append(info_string)
            files_list[dirpath]['total_space_used'] = '{:,} bytes'.format(total_dir_space_used)
            total_overall_space_used += total_dir_space_used

        return Response({
            "files": files_list,
            "overall_space_used": '{:,} bytes'.format(total_overall_space_used),
        })

    def delete(self, request, pk, format=None):
        dirpath = os.path.join(settings.REDACT_FILE_STORAGE_DIR, pk)
        try:
            shutil.rmtree(dirpath)
            return Response('', status=204)
        except Exception as e:
            return self.error(e, status_code=400)

class FilesViewSetUnzipArchive(viewsets.ViewSet):
    def process_unzip_request(self, request_data):
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
        nest_dir = os.path.join(unzip_dir, 'guided_redaction', 'work')
        master_json_path = os.path.join(nest_dir, 'export_master.json')
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
        build_movies = self.add_movie_files(fw, nest_dir, master_json)
        job_run_summaries, job_eval_objectives = self.add_jrs_records(master_json)

        movie_count = 0
        for movie_url in master_json.get('movies', {}):
            build_movies[movie_url] = master_json['movies'][movie_url]
            movie_count += 1

        return Response({
            'job_count': job_count,
            'scanner_count': scanner_count,
            'pipeline_count': pipeline_count,
            'movie_count': movie_count,
            'movies': build_movies,
            'job_run_summaries': job_run_summaries,
            'job_eval_objectives': job_eval_objectives,
        })

    def add_movie_files(self, fw, nest_dir, master_json):
        build_movies = {}
        for item in os.listdir(nest_dir):
            if item != 'export_master.json': 
                item_fullpath = os.path.join(nest_dir, item)
                (y_part, workdir_uuid) = os.path.split(item_fullpath)
                target_dir = fw.build_file_fullpath_for_uuid_and_filename(workdir_uuid, '')
                if os.path.exists(target_dir):
                    shutil.rmtree(target_dir)
                print('copying dir {} to {}'.format(item_fullpath, target_dir))
                shutil.copytree(item_fullpath, target_dir)
                split_files_exist = False
                movie_name = ''
                for created_item_name in os.listdir(target_dir):
                    if created_item_name.endswith('.mp4'):
                        movie_name = created_item_name
                    elif created_item_name.endswith('.png'):
                        split_files_exist = True
                if not split_files_exist and movie_name:
                    the_filepath = os.path.join(target_dir, movie_name)
                    movie_url = fw.get_url_for_file_path(the_filepath)
                    if movie_url not in build_movies:
                        build_movies[movie_url] = {}
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

class FilesViewSetImportArchive(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if 'data_uri' not in request_data:
            return self.error("data_uri is required")
        if 'filename' not in request_data:
            return self.error("filename is required")
        try:
            filename = request_data.get("filename")
            data_uri = request_data.get('data_uri')
            header, image_data= data_uri.split(",", 1)
            image_binary = base64.b64decode(image_data)
            file_url = make_url_from_file(filename, image_binary)

            build_request_data = {
                "archive_url": file_url,
            }
            job = Job(
                request_data=json.dumps(build_request_data),
                response_data = '{}',
                status='created',
                description='unzip archive',
                app='files',
                operation='unzip_archive',
                sequence=0,
            )
            job.save()
            files_tasks.unzip_archive.delay(job.id)
            return Response({"job_id": job.id})
        except Exception as e:
            return self.error(e, status_code=400)


class FilesViewSetExport(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if 'jrs_ids' not in request_data:
            if 'job_ids' not in request_data:
                return self.error("job_ids is required")
            if 'pipeline_ids' not in request_data:
                return self.error("pipeline_ids is required")
            if 'movies' not in request_data:
                return self.error("movies is required")
            if 'include_child_jobs' not in request_data:
                return self.error("include_child_jobs is required")
            if 'include_child_movie_frames' not in request_data:
                return self.error("include_child_movie_frames is required")

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

            return Response({"archive_url": download_url})
        except Exception as e:
            return self.error(e, status_code=400)

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
        zipObj.write(json_file_fullpath, json_archive_path)

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
        print('adding movie file {}'.format(movie_url))
        zipObj.write(movie_url_fullpath)
        if 'frames' in movie and request_data.get('include_child_movie_frames'):
            for image_url in movie['frames']:
                image_fullpath = fw.get_file_path_for_url(image_url)
                print('adding image file {}'.format(image_url))
                zipObj.write(image_fullpath)

    def add_pipeline_to_dict(self, pipeline, build_dict):
        print('adding pipeline {}'.format(pipeline.id))
        build_dict['pipelines'][str(pipeline.id)] = pipeline.as_dict()
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
                if node['type'] == 'pipeline':
                    print('we have a pipeline to export')

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


class FilesViewSetDownloadSecureFile(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("recording_ids"):
            return self.error("recording_ids is required")

        try:
            from secure_files.controller import get_file
            build_urls = {}
            for recording_id in request_data.get('recording_ids'):
                data = get_file(recording_id)
                filename = recording_id + '.mp4'
                file_url = make_url_from_file(filename, data['content'])
                build_urls[file_url] = {}
            return Response({"movies": build_urls})
        except Exception as e:
            return self.error(e, status_code=400)


class FilesViewSetMakeUrl(viewsets.ViewSet):
    # TODO convert this over to use FileWriter
    def create(self, request):
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        file_base_url = settings.REDACT_FILE_BASE_URL
        if request.method == "POST" and "file" in request.FILES:
            try:
                file_obj = request.FILES["file"]
                file_basename = request.FILES.get("file").name
                if file_obj:
                    the_uuid = str(uuid.uuid4())
                    # TODO use FileWriter class for this
                    workdir = os.path.join(settings.REDACT_FILE_STORAGE_DIR, the_uuid)
                    os.mkdir(workdir)
                    outfilename = os.path.join(workdir, file_basename)
                    fh = open(outfilename, "wb")
                    for chunk in file_obj.chunks():
                        fh.write(chunk)
                    fh.close()
                    (x_part, file_part) = os.path.split(outfilename)
                    (y_part, uuid_part) = os.path.split(x_part)
                    file_url = "/".join([file_base_url, uuid_part, file_part])

                    return Response({"url": file_url})
            except Exception as e:
                return self.error([e], status_code=400)
        elif request.method == "POST" and request.data.get("data_uri") and request.data.get('filename'):
            filename = request.data.get("filename")
            data_uri = request.data.get('data_uri')
            directory = request.data.get('directory', '')
            header, image_data= data_uri.split(",", 1)
            image_binary = base64.b64decode(image_data)
            file_url = make_url_from_file(filename, image_binary, directory)
            return Response({"url": file_url})
        else:
            return self.error(
                ['no file (keyname file) supplied and no data_uri+filename parameters supplied'],
                status_code=400
            )


class FilesViewSetMovieMetadata(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        movies = request_data.get('movies')
        if not movies:
            return
        movie_url = list(movies.keys())[0]
        print(movie_url)
        (x_part, file_part) = os.path.split(movie_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        recording_id = file_part.split('.')[-2]
        new_filename = recording_id + '_movie_metadata.json'
        file_fullpath = file_writer.build_file_fullpath_for_uuid_and_filename(uuid_part, new_filename)
        file_writer.write_text_data_to_filepath(
            json.dumps(request_data),
            file_fullpath
        )
        new_url = file_writer.get_url_for_file_path(file_fullpath)
        return Response({'url': new_url})

    def process_retrieve_request(self, request_data):
        if not request_data.get("uuid_part"):
            return self.error("uuid_part is required")
        if not request_data.get("file_part"):
            return self.error("file_part is required")
        uuid_part = request_data.get("uuid_part")
        file_part = request_data.get("file_part")
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        file_fullpath = file_writer.build_file_fullpath_for_uuid_and_filename(uuid_part, file_part)
        metadata = file_writer.get_text_data_from_filepath(file_fullpath)
        return Response(json.loads(metadata))

def make_url_from_file(filename, file_binary_data, the_uuid=''):
    file_writer = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=settings.REDACT_FILE_BASE_URL,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    if not the_uuid:
        the_uuid = str(uuid.uuid4())
    file_writer.create_unique_directory(the_uuid)
    file_fullpath = file_writer.build_file_fullpath_for_uuid_and_filename(the_uuid, filename)
    file_url = file_writer.get_url_for_file_path(file_fullpath)
    file_writer.write_binary_data_to_filepath(file_binary_data, file_fullpath)
    return file_url

class FilesViewSetGetVersion(viewsets.ViewSet):
    def list(self, request):
        return Response({"version": '1.0.3'})

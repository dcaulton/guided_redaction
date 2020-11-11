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

    def retrieve(self, request, pk):
        return Response({"needed": 'so delete works'})

    def delete(self, request, pk, format=None):
        dirpath = os.path.join(settings.REDACT_FILE_STORAGE_DIR, pk)
        try:
            shutil.rmtree(dirpath)
            return Response('', status=204)
        except Exception as e:
            return self.error(e, status_code=400)


class FilesViewSetExport(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if 'job_ids' not in request_data:
            return self.error("job_ids is required")
        if 'pipeline_ids' not in request_data:
            return self.error("pipeline_ids is required")
        if 'movies' not in request_data:
            return self.error("movies is required")
        if 'include_child_jobs' not in request_data:
            return self.error("include_child_jobs is required")

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

            self.build_zip_file(fw, file_fullpath, request_data, workdir_uuid, request_data['include_child_jobs'])

            download_url = fw.get_url_for_file_path(file_fullpath)

            return Response({"archive_url": download_url})
        except Exception as e:
            return self.error(e, status_code=400)

    def add_job_to_dict(self, job, build_dict, include_child_jobs):
        if job.id not in build_dict:
            print('adding job {}'.format(job.id))
            build_dict[str(job.id)] = job.as_dict()
            if include_child_jobs:
                children = Job.objects.filter(parent=job)
                for child in children:
                    self.add_job_to_dict(child, build_dict, include_child_jobs)

    def build_zip_file(self, fw, output_file_fullpath, request_data, workdir_uuid, include_child_jobs):
        print('look at me steve, Im exporting!')
        build_obj = {}

        build_obj['jobs'] = {}
        if request_data['job_ids']:
            for job_id in request_data['job_ids']:
                job = Job.objects.get(pk=job_id)
                self.add_job_to_dict(job, build_obj['jobs'], include_child_jobs)

        build_obj['pipelines'] = {}
        if request_data['pipeline_ids']:
            for pipeline_id in request_data['pipeline_ids']:
                pipeline = Pipeline.objects.get(pk=pipeline_id)
                build_obj['pipelines'][pipeline_id] = pipeline.as_dict()

        build_obj['movies'] = {}
        if request_data['movies']:
            for movie_url in request_data['movies']:
                build_obj['movies'][movie_url] = request_data['movies'][movie_url]

        json_filename = 'export_' + str(uuid.uuid4()) + '.json'
        json_file_fullpath = fw.build_file_fullpath_for_uuid_and_filename(workdir_uuid, json_filename)
        text_data = json.dumps(build_obj)
        x = fw.write_text_data_to_filepath(text_data, json_file_fullpath)
        zipObj = ZipFile(output_file_fullpath, 'w')
        zipObj.write(json_file_fullpath)

        for movie_url in build_obj['movies']:
            movie = build_obj['movies'][movie_url]
            movie_url_fullpath = fw.get_file_path_for_url(movie_url)
            zipObj.write(movie_url_fullpath)
            if 'frames' in movie:
                for image_url in movie['frames']:
                    image_fullpath = fw.get_file_path_for_url(image_url)
                    zipObj.write(image_fullpath)

        zipObj.close()
        print('zip written')

        

# export obj:
#  a zip file with the following files:
#    scanners.json
#    movies_parsed.json
#    movies_raw.zip  # a directory structure with source images and movies
#    jobs.json
#    pipelines.json
#    attributes.json


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
            header, image_data= data_uri.split(",", 1)
            image_binary = base64.b64decode(image_data)
            file_url = make_url_from_file(filename, image_binary)
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

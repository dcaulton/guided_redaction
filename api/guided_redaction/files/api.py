import base64
import json
import os
import shutil
import time
from traceback import format_exc
import uuid

from django.conf import settings
from rest_framework.response import Response

from base import viewsets
from guided_redaction.files import tasks as files_tasks
from guided_redaction.jobs.models import Job
from guided_redaction.task_queues import get_task_queue
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_export import ExportController
from .controller_unzip_archive import UnzipArchiveController
from .controller_save_gt_attribute import SaveGTAttributeController
from .controller_upload_secure_file import UploadSecureFileController


def make_url_from_file(filename, file_binary_data, the_uuid=''):
    if not file_binary_data:
        return
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
            return Response()
        except Exception as e:
            print(format_exc())
            return self.error(f'file delete failed for {pk}', status_code=400)


class FilesViewSetSaveGTAttribute(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if 'status' not in request_data or request_data['status'] != 'success':
            return self.error("a successful secure files status is required")
        if not request_data.get('new_file_info'):
            return self.error("new_file_info is required")
        if not request_data.get('new_file_info')[0].get('recording_id'):
            return self.error("first new_file_info.recording_id is required")
        if not request_data.get('new_file_info')[0].get('source_movie_url'):
            return self.error("first new_file_info.source_movie_url is required")
        if not request_data.get('new_file_info')[0].get('source_movie_recording_id'):
            return self.error("first new_file_info.source_movie_recording_id is required")
        if 'original_transaction_id' not in request_data:
            return self.error("original_transaction_id is required")
        if 'original_timestamp' not in request_data:
            return self.error("original_timestamp is required")
        if 'original_account_id' not in request_data:
            return self.error("original_account_id is required")

        worker = SaveGTAttributeController()
        response_obj= worker.save_gt_attribute(request_data)

        if response_obj.get('errors'):
            return self.error(response_obj.get('errors'), status_code=400)
        else:
            return Response(response_obj)


class FilesViewSetUnzipArchive(viewsets.ViewSet):
    def process_unzip_request(self, request_data):
        if 'archive_url' not in request_data:
            return self.error("archive_url is required")

        worker = UnzipArchiveController()
        response_obj= worker.unzip_archive(request_data)

        if response_obj.get('errors'):
            return self.error(response_obj.get('errors'), status_code=400)
        else:
            return Response(response_obj)


class FilesViewSetPurgeJob(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data, purge_job_id):
        if 'directories' not in request_data:
            return self.error("directories is required")
        if 'primary_job_id' not in request_data:
            return self.error("primary_job_id is required")
        directories = request_data.get('directories')
        primary_job_id = request_data.get('primary_job_id')
        try:
            file_writer = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            for directory in directories:
                file_writer.delete_directory(directory)
            primary_job = Job.objects.get(pk=primary_job_id)
            for child in primary_job.children.all():
                if str(child.id) == purge_job_id:
                    continue # don't try to delete the job we're running as, silly!
                child.delete()
            return Response({'status': 'purged'})
        except Exception as e:
            print(format_exc())
            return self.error(f'directory delete failed for {directory}', status_code=400)


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
            files_tasks.unzip_archive.apply(args=(job.id,))
            return Response({"job_id": job.id})
        except Exception as e:
            print(format_exc())
            return self.error('import archive failed', status_code=400)


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

        worker = ExportController()
        response_obj= worker.do_export(request_data)

        if response_obj.get('errors'):
            return self.error(response_obj.get('errors'), status_code=400)
        else:
            return Response(response_obj)


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
                if file_url:
                    build_urls[file_url] = {'recording_id': recording_id}
                else:
                    return self.error(
                      f'download secure file failed for {recording_id}',
                      status_code=400
                    )
            return Response({"movies": build_urls})
        except Exception as e:
            print(format_exc())
            return self.error(
              'exception during download secure file', status_code=400
            )


class FilesViewSetUploadSecureFile(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        worker = UploadSecureFileController()
        response_obj= worker.upload_secure_file(request_data)

        if response_obj.get('errors'):
            return self.error(response_obj.get('errors'), status_code=400)
        else:
            return Response(response_obj)


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
                print(format_exc())
                return self.error('make url failed', status_code=400)
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

class FilesViewSetGetVersion(viewsets.ViewSet):
    def list(self, request):
        return Response({"version": '1.0.3'})

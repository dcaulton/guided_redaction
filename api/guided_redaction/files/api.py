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

            
class FilesViewSetDownloadSecureFile(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("recording_id"):
            return self.error("recording_id is required")

        try:
            from secure_files.controller import get_file
            data = get_file(request_data.get('recording_id'))
            filename = request_data.get('recording_id') + '.mp4'
            file_url = make_url_from_file(filename, data['content'])
            return Response({"url": file_url})
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

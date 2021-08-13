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


class UploadSecureFileController():

    def __init__(self):
        pass

    def upload_secure_file(self, request_data):
        status_obj = {
            'status': 'success', # values other than success will stop forward processing
            'new_file_info': [],
        }
        try:
            from secure_files.controller import put_file
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )

            for old_movie_url in request_data:
                new_movie_url = request_data[old_movie_url].get('redacted_movie_url')
                print(f"old movie url: {old_movie_url}")
                print(f"new movie url: {new_movie_url}")
                if not new_movie_url:
                    continue
                old_recording_id = fw.get_recording_id_from_url(old_movie_url)
                new_movie_path = fw.get_file_path_for_url(new_movie_url)
                upload_uuid = old_recording_id
                # for now we are replacing the existing recording id.  This should
                # be all we need to uncomment to make new recording ids each time
#                upload_uuid = str(uuid.uuid4())
                upload_filename = upload_uuid + '.mp4'
                print(f"new movie path: {new_movie_path}")
                response = put_file(upload_filename, new_movie_path)
                the_str = 'put secure files responded with status: {} text: {}' \
                    .format(response.status_code, response.text)
                print(the_str)
                if 200 <= response.status_code < 300:
                    movie_build_obj = {
                        'recording_id': upload_uuid,
                        'source_movie_url': old_movie_url,
                        'source_movie_recording_id': old_recording_id,
                        'status': 'success',
                    }
                else:
                    movie_build_obj = {
                        'recording_id': upload_uuid,
                        'source_movie_url': old_movie_url,
                        'source_movie_recording_id': old_movie_recording_id,
                        'status': 'failed',
                    }
                    status_obj['status'] = 'failed' 
                status_obj['new_file_info'].append(movie_build_obj)
        except Exception as e:
            print(format_exc())

        return status_obj

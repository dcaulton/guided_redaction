import os
import requests
import uuid
import hashlib

from django.conf import settings
from django.db import models

from guided_redaction.utils.classes.FileWriter import FileWriter


def save_external_payloads(model_instance):
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        old_path = ''
        field_data_name = field_name
        field_path_name = field_name + '_path'
        field_checksum_name = field_name + '_checksum'

        the_data = getattr(model_instance, field_data_name)
        if the_data and len(the_data) > model_instance.MAX_DB_PAYLOAD_SIZE:
            checksum = hashlib.md5(the_data.encode('utf-8')).hexdigest()
            if getattr(model_instance, field_checksum_name) != checksum:
                print('saving {} to disk, its {} bytes'.format(field_data_name, len(the_data)))
                setattr(model_instance, field_checksum_name, checksum)
                directory = get_current_directory(model_instance, field_path_name)
                if getattr(model_instance, field_path_name):
                    old_path = getattr(model_instance, field_path_name)
                new_path = save_data_to_disk(the_data, directory, field_name)

                setattr(model_instance, field_path_name, new_path)
                setattr(model_instance, field_data_name, '{}')
        if old_path:
            delete_data_from_disk(old_path)

def get_current_directory(model_instance, field_path_name):
    the_path = getattr(model_instance, field_path_name)
    if the_path:
        return the_path.split('/')[-2]

def get_data_from_disk_for_model_instance(model_instance):
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        field_data_name = field_name 
        field_path_name = field_name + '_path'

        the_url = getattr(model_instance, field_path_name)

        if the_url:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            the_path = fw.get_file_path_for_url(the_url)

            the_data = '{}'
            if os.path.exists(the_path):
                the_data = fw.get_text_data_from_filepath(the_path)
            else:
                print('fetching payload from remote location for {}'.format(field_name))
                the_data = requests.get(the_url).content

            setattr(model_instance, field_data_name, the_data)

def delete_data_from_disk(file_url):
    if file_url:
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        file_path = fw.get_file_path_for_url(file_url)
        fw.delete_item_at_filepath(file_path)

def save_data_to_disk(data, directory, field_name):
    fw = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=settings.REDACT_FILE_BASE_URL,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    if not directory:
        directory = str(uuid.uuid4())
        fw.create_unique_directory(directory)
    filename_uuid = str(uuid.uuid4())
    file_name = field_name + '_' + filename_uuid + '_data.json'
    outfilepath = fw.build_file_fullpath_for_uuid_and_filename(directory, file_name)
    fw.write_text_data_to_filepath(data, outfilepath)

    outfileurl = fw.get_url_for_file_path(outfilepath)

    return outfileurl

def delete_external_payloads(model_instance):
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        field_path_name = field_name + '_path'
        the_path = getattr(model_instance, field_path_name)
        delete_data_from_disk(the_path)



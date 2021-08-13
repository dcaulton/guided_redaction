import uuid
import hashlib

from django.conf import settings
from django.db import models

from guided_redaction.utils.classes.FileWriter import FileWriter


def delete_job_external_payloads(job):
    fw = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=settings.REDACT_FILE_BASE_URL,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    return delete_job_external_payloads_recursive(job, fw)

def delete_job_external_payloads_recursive(job, fw):
    file_dirs = []
    something_changed = False
    if job.request_data_path:
        req_url = fw.get_file_path_for_url(job.request_data_path)
        fw.delete_item_at_filepath(req_url)
        job_request_data = '{}'
        something_changed = True
    if job.response_data_path:
        resp_url = fw.get_file_path_for_url(job.response_data_path)
        fw.delete_item_at_filepath(resp_url)
        job_response_data = '{}'
        something_changed = True
    if something_changed:
        job.save()

    for child in job.children.all():
        delete_job_external_payloads_recursive(job, fw)

def save_external_payloads(model_instance):
    paths = {}
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        old_path = ''
        field_data_name = field_name
        field_path_name = field_name + '_path'
        field_checksum_name = field_name + '_checksum'
        paths[field_path_name] = getattr(model_instance, field_path_name)

        the_data = getattr(model_instance, field_data_name)
        if (the_data and (
            len(the_data) > model_instance.MAX_DB_PAYLOAD_SIZE or
            "ocr" in model_instance.operation
        )):
            checksum = hashlib.md5(the_data.encode('utf-8')).hexdigest()
            if getattr(model_instance, field_checksum_name) != checksum:
                print(
                    'saving {} to cache, its {} bytes'
                    .format(field_data_name, len(the_data))
                )
                setattr(model_instance, field_checksum_name, checksum)
                directory = get_current_directory(model_instance, field_path_name)
                old_path = getattr(model_instance, field_path_name, '')
                new_path = save_data_to_cache(the_data, directory, field_name)
                if old_path and old_path != new_path:
                    print(f"ERROR: {old_path} != {new_path}")
                setattr(model_instance, field_path_name, new_path)
                paths[field_path_name] = new_path
                setattr(model_instance, field_data_name, '{}')
        #if old_path:
        #    delete_data_from_cache(old_path)
    return paths

def get_current_directory(model_instance, field_path_name):
    the_path = getattr(model_instance, field_path_name)
    if the_path:
        return the_path.split('/')[-2]

def get_data_from_cache_for_model_instance(model_instance):
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        field_data_name = field_name 
        field_path_name = field_name + '_path'

        the_path = getattr(model_instance, field_path_name)

        if the_path:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            the_data = fw.get_text_data_from_filepath(the_path)
            setattr(model_instance, field_data_name, the_data)

def delete_data_from_cache(file_path):
    if file_path:
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        fw.delete_item_at_filepath(file_path)

def save_data_to_cache(data, directory, field_name):
    fw = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=settings.REDACT_FILE_BASE_URL,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    if not directory:
        directory = str(uuid.uuid4())
        fw.create_unique_directory(directory)
    #filename_uuid = str(uuid.uuid4())
    #file_name = field_name + '_' + filename_uuid + '_data.json'
    file_name = f"{field_name}_data.json"
    outfilepath = fw.build_file_fullpath_for_uuid_and_filename(directory, file_name)
    fw.write_text_data_to_filepath(data, outfilepath)

    return outfilepath

def delete_external_payloads(model_instance):
    for field_name in model_instance.EXTERNAL_PAYLOAD_FIELDS:
        field_path_name = field_name + '_path'
        the_path = getattr(model_instance, field_path_name)
        delete_data_from_cache(the_path)



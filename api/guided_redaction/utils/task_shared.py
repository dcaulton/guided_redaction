import functools
import json
import logging
import time
from traceback import format_exc

from django.db import connection, reset_queries, transaction

from base import cache
from guided_redaction.attributes.models import Attribute

log = logging.getLogger(__name__)

def job_is_wrapping_up(job, task_id='true'):
    try:
        key_name = 'redact_job_wrapped_' + str(job.pk)
        result = (cache.get_and_set(key_name, task_id or '') or b'').decode()
        print(f'{key_name} - prior: "{result}", current: "{task_id}"')
        return result
    except:
        print(format_exc())
        return False

def get_inbound_recording_id_attributes(job):
    recording_ids = []
    attrs = Attribute.objects.filter(job=job, name='inbound_recording_id')
    for attr in attrs:
        recording_ids.append(attr.value)
    return recording_ids

def preserve_inbound_recording_ids_as_attributes(job):
    job_of_interest = job
    with transaction.atomic():
        while job_of_interest:
            if not job_of_interest.request_data:
                return
            req_data = json.loads(job_of_interest.request_data)
            for recording_id in req_data.get('recording_ids', []):
                attribute = Attribute(
                    name='inbound_recording_id',
                    value=recording_id,
                    job=job_of_interest,
                )
                attribute.save()
            job_of_interest = job_of_interest.parent

def build_delete_files_with_job_attribute(job, the_value=True):
    with transaction.atomic():
        attribute = Attribute(
            name='delete_files_with_job',
            value=the_value,
            job=job,
        )
        attribute.save()

def build_lifecycle_attribute(attr_name, lifecycle_data, job):
    with transaction.atomic():
        if attr_name in lifecycle_data and lifecycle_data[attr_name]:
            attribute = Attribute(
                name=attr_name,
                value=lifecycle_data[attr_name],
                job=job,
            )
            attribute.save()

def get_job_file_dirs(job):
    return get_job_file_dirs_recursive(job)

def get_job_file_dirs_recursive(job):
    file_dirs = job.get_file_dirs()
    for child in job.children.all():
        job_file_dirs = get_job_file_dirs_recursive(child)
        for fd in job_file_dirs:
            if fd not in file_dirs:
                file_dirs.append(fd)
    return file_dirs

def get_job_for_node(node_id, parent_job):
    if ':' in node_id:
        node_id = node_id.split(':')[-1]
    if Attribute.objects.filter(name='node_id', value=node_id).exists():
        attrs = Attribute.objects.filter(name='node_id', value=node_id)
        for attr in attrs:
            ancestor_ids = get_job_ancestor_ids(attr.job.parent)
            if attr.job and str(parent_job.id) in ancestor_ids:
                return attr.job

def get_job_ancestor_ids(job):
    ancestor_ids = [str(job.id)]
    while job.parent:
        ancestor_ids.append(str(job.parent.id))
        job = job.parent
    return ancestor_ids

def get_job_owner(job):
    ancestor_ids = get_job_ancestor_ids(job)
    for a in Attribute.objects.filter(name='user_id'):
        if str(a.job_id) in ancestor_ids:
            return a.value
    return ''

def build_file_directory_user_attributes_from_urls(job, url_list):
    owner = get_job_owner(job)
    documented_directories = [
        a.value for a in Attribute.objects.filter(name='file_dir_user')
    ]
    with transaction.atomic():
        for movie_url in url_list:
            movie_uuid = movie_url.split('/')[-2]
            if movie_uuid in documented_directories:
                continue
            value_string = movie_uuid + ':' + owner
            Attribute(
                job=job,
                name='file_dir_user',
                value=value_string,
            ).save()

def build_file_directory_user_attributes_from_movies(job, response_data):
    owner = get_job_owner(job)
    documented_directories = [
        a.value for a in Attribute.objects.filter(name='file_dir_user')
    ]
    with transaction.atomic():
        if 'movies' in response_data:
            for movie_url in response_data['movies']:
                movie_uuid = movie_url.split('/')[-2]
                if movie_uuid in documented_directories:
                    continue
                value_string = movie_uuid + ':' + owner
                Attribute(
                    job=job,
                    name='file_dir_user',
                    value=value_string,
                ).save()

def get_account_lob_global_recording_gt_ids(job):
    account = None
    if Attribute.objects.filter(job=job, name='account').exists():
        try:
            account = int(
                Attribute.objects.filter(job=job, name='account').first().value
            )
        except ValueError:
            pass
    lob = None
    if Attribute.objects.filter(job=job, name='lob').exists():
        try:
            lob = int(Attribute.objects.filter(job=job, name='lob').first().value)
        except ValueError:
            pass
    global_id = None
    if Attribute.objects.filter(job=job, name='global_id').exists():
        try:
            global_id = int(
                Attribute.objects.filter(job=job, name='global_id').first().value
            )
        except ValueError:
            pass
    recording_id = None
    if Attribute.objects.filter(job=job, name='inbound_recording_id').exists():
        recording_id = Attribute.objects.filter(
            job=job, name='inbound_recording_id'
        ).first().value
    gtid = None
    if Attribute.objects.filter(job=job, name='transaction_id').exists():
        gtid = Attribute.objects.filter(
            job=job, name='transaction_id'
        ).first().value
    return account, lob, global_id, recording_id, gtid

def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects \
            .filter(job=job, name='pipeline_job_link') \
            .first() \
            .pipeline

def evaluate_children(operation, child_operation, children):
    all_children = 0
    completed_children = 0
    failed_children = 0
    for child in children:
        if child.operation == child_operation:
            all_children += 1
            if child.status == 'success':
                completed_children += 1
            elif child.status == 'failed':
                failed_children += 1
    print('CHILDREN FOR {}: {} COMPLETE: {} FAILED: {}'.format(
        operation, all_children, completed_children, failed_children
    ))
    if all_children == 0:
        return 'build_child_tasks'
    elif all_children == completed_children:
        return 'wrap_up'
    elif failed_children > 0:
        return 'abort'
    elif all_children > 0:
        return 'noop'

def job_has_anticipated_operation_count_attribute(job):
    if Attribute.objects \
        .filter(job=job) \
        .filter(name='anticipated_operation_count') \
        .exists():
        return True

def make_anticipated_operation_count_attribute_for_job(job, the_count):
    if job_has_anticipated_operation_count_attribute(job):
        return
    with transaction.atomic():
        attribute = Attribute(
            name='anticipated_operation_count',
            value=the_count,
            job=job,
        )
        attribute.save()

def job_has_child_time_fractions_attribute(job):
    if Attribute.objects \
        .filter(job=job) \
        .filter(name='child_time_fractions') \
        .exists():
        return True

def make_child_time_fractions_attribute_for_job(job, the_data):
    if job_has_child_time_fractions_attribute(job):
        return
    with transaction.atomic():
        attribute = Attribute(
            name='child_time_fractions',
            value=json.dumps(the_data),
            job=job,
        )
        attribute.save()

def query_profiler(fnc):
    @functools.wraps(fnc)
    def profile(*args, **kwargs):
        reset_queries()
        query_cnt_before = len(connection.queries)
        start = time.perf_counter()
        result = fnc(*args, **kwargs)
        end = time.perf_counter()
        query_cnt_after = len(connection.queries)
        log.info(f"Called: {fnc.__name__}")
        log.info(f"Queries: {query_cnt_after - query_cnt_before}")
        log.info(f"Time: {(end-start):.3f}s")
        return result
    return profile

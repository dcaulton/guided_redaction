import functools
import json
import logging
import time

from django.db import connection, reset_queries
from guided_redaction.attributes.models import Attribute

log = logging.getLogger(__name__)

def get_job_for_node(node_id, parent_job):
    if Attribute.objects.filter(name='node_id', value=node_id).exists():
        attrs = Attribute.objects.filter(name='node_id', value=node_id)
        for attr in attrs:
            if attr.job and attr.job.parent == parent_job:
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

def build_file_directory_user_attributes_from_movies(job, response_data):
    owner = get_job_owner(job)
    documented_directories = [
        a.value for a in Attribute.objects.filter(name='file_dir_user')
    ]
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

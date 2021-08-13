import logging
import os
import re
from random import shuffle

from celery import current_app
from django.conf import settings
from base.cache import get_redis_connection

logger = logging.getLogger(__name__)



def get_task_queue(is_batch=False):
    """Returns the host-name-based queue with the fewest tasks
    waiting in the queue."""

    host_name = os.environ.get('HOSTNAME')
    if is_batch:
        host_setting = "CELERY_REDACT_BATCH_HOSTS"
    else:
        host_setting = "CELERY_REDACT_INTERACTIVE_HOSTS"
    tgt_task_hosts = getattr(settings, host_setting, [])
    all_task_hosts = (
        getattr(settings, "CELERY_REDACT_BATCH_HOSTS", []) + 
        getattr(settings, "CELERY_REDACT_INTERACTIVE_HOSTS", [])
    )
    if not tgt_task_hosts:
        queue = current_app.conf.task_default_queue
        logger.info(f"No target hosts defined, using default queue: {queue}")
        return queue
    elif host_name in all_task_hosts:
        logger.info(f"Already on a target host, not specifying a queue")
        return None
    broker_conn = get_redis_connection()
    tasks_counts = {}
    shuffle(tgt_task_hosts)
    for host_name in tgt_task_hosts:
        queued_tasks = broker_conn.llen(host_name)
        if queued_tasks == 0:
            return host_name
        else:
            task_counts = {queued_tasks: host_name}
    queue = task_counts[min(task_counts.keys())]
    logger.info(f"On non-target hosts, using queue: {queue}")
    return queue

def get_path_routing_segment():
    host_name = os.environ.get('HOSTNAME')
    all_task_hosts = (
        getattr(settings, "CELERY_REDACT_INTERACTIVE_HOSTS", []) +
        getattr(settings, "CELERY_REDACT_BATCH_HOSTS", [])
    )
    if host_name in all_task_hosts:
        digits = re.findall("[0-9]+", host_name)
        if digits:
            return digits[-1]
    return ""


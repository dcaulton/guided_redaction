import logging
import os
import re

from celery import current_app
from django.conf import settings
from redis import Redis

logger = logging.getLogger(__name__)



def get_task_queue(is_batch=False):
    """Returns the host-name-based queue with the fewest tasks
    waiting in the queue."""
    
    host_name = os.environ.get('HOSTNAME')
    if is_batch:
        host_setting = "CELERY_REDACT_BATCH_HOSTS"
    else:
        host_setting = "CELERY_REDACT_INTERACTIVE_HOSTS"
    task_hosts = getattr(settings, host_setting, [])
    if not task_hosts:
        return current_app.conf.task_default_queue
    elif host_name in task_hosts:
        return None
    broker_conn = Redis(**settings.CELERY_BROKER_CONNECTION)
    tasks_counts = {}
    for host_name in task_hosts:
        queued_tasks = broker_conn.llen(host_name)
        if queued_tasks == 0:
            return host_name
        else:
            task_counts = {queued_tasks: host_name}
    queue = task_counts[min(task_counts.keys())]
    logger.info("Selecting queue:", queue)
    return queue

def get_path_routing_segment():
    host_name = os.environ.get('HOSTNAME')
    task_hosts = (
        getattr(settings, "CELERY_REDACT_INTERACTIVE_HOSTS", []) +
        getattr(settings, "CELERY_REDACT_BATCH_HOSTS", [])
    )
    if host_name in task_hosts:
        digits = re.findall("[0-9]+", host_name)
        if digits:
            return digits[-1]
    return ""


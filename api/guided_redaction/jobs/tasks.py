from celery import shared_task
from django.conf import settings

from guided_redaction.task_queues import get_task_queue
from .api import handle_delete_job
from .models import Attribute, Job


def sweep(keep=None):
    if keep is None:
        keep = getattr(settings, "REDACT_JOB_SWEEPER_KEEP", 50)
    all_jobs = Job.objects.filter(parent=None).order_by('-created_on')
    must_keep_jobs = [
        a[0] for a in Attribute.objects.filter(
            name="auto_delete_age", value="never", job__in=all_jobs
        ).values_list('job')
    ]
    sweep_jobs = all_jobs.exclude(pk__in=must_keep_jobs)
    for i, job in enumerate(sweep_jobs):
        if i < keep - len(must_keep_jobs):
            continue
        queue = job.hostname or get_task_queue()
        delete_job.apply_async((job.pk,), queue=queue)

@shared_task
def delete_job(pk):
    handle_delete_job(pk)

import json
import random
import math
from django.conf import settings
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.analyze.controller_t1 import T1Controller
from guided_redaction.utils.classes.FileWriter import FileWriter


class ScoreManualController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def score_job_run_summary(self, request_data):
        jrs = JobRunSummary()

        job_id = request_data.get('job_id')
        if not Job.objects.filter(id=job_id).exists():
            return {'errors': ['job not found for specified id']}
        jrs.job = Job.objects.get(pk=job_id)

        jeo_id = request_data.get('job_eval_objective_id')
        if not JobEvalObjective.objects.filter(id=jeo_id).exists():
            return {'errors': ['job eval objective not found for specified id']}
        jrs.job_eval_objective = JobEvalObjective.objects.get(pk=jeo_id)

        jrs.content = '{"flippy": "floppy"}'
        jrs.save()

        return jrs

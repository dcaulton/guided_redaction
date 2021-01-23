import json
import os
from django.conf import settings
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.job_run_summaries.models import JobRunSummary
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

        build_movies = {
            'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/b147d17b-8d9d-4f48-9464-7c85ffefddec.mp4': {
                'notes':  [
                    'looks like it is mising the end of the last name field for hyphenated names'
                ],
                'framesets':  {
                    '13857090227313213446': {
                        'counts': {
                            't_pos': 3986,
                            't_neg': 29700,
                            'f_pos': 495,
                            'f_neg': 1112,
                            'missed_items': 0,
                            'miscaptured_items': 0,
                        },
                        'maps': {
                            'f_pos': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075a.png',
                            'f_neg': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075b.png',
                            'f_all': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075c.png'
                        },
                    },
                },
            },
        }
        build_stats = {
            'max_score': 100,
            'min_score': 65,
            'pass_or_fail': 'pass',
        }
        content_object = {
            'movies': build_movies,
            'statistics': build_stats,
        }
        jrs.summary_type = 'manual'
        jrs.score = 95.2
        jrs.content = json.dumps(content_object)
        jrs.save()

        for movie_url in build_movies: 
            (_, movie_name) = os.path.split(movie_url)
            attribute = Attribute(
                name='jrs_movie_name',
                value=movie_name,
                job_run_summary=jrs,
            )
            attribute.save()

        return jrs

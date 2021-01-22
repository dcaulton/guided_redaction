import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from .controller_generate import GenerateController
from .controller_score_manual import ScoreManualController


class JobRunSummariesViewSet(viewsets.ViewSet):

    def retrieve(self, request, pk):
        jrs = JobRunSummary.objects.get(pk=pk)
        build_attributes = {}
        jrs_data = {
            'id': jrs.id,
            'job_id': jrs.job.id,
            'job_eval_objective_id': jrs.job_eval_objective.id,
            'created_on': jrs.created_on,
            'updated_on': jrs.updated_on,
            'content': jrs.content,
        }
        return Response(jrs_data)

    def list(self, request):
        jrss = {}
        for jrs in JobRunSummary.objects.all():
            content_length = len(jrs.content)
            if content_length < 1000000:
                content = json.loads(jrs.content)
            else:
                content = 'large content, truncated for list'
            jrss[str(jrs.id)] = {
                  'id': jrs.id,
                  'job_id': jrs.job.id,
                  'job_eval_objective_id': jrs.job_eval_objective.id,
                  'created_on': jrs.created_on,
                  'updated_on': jrs.updated_on,
                  'content_length': content_length,
                  'content': content,
            }
        return Response(jrss)

    def create(self, request):
        if not request.data.get("job_id"):
            return self.error("job_id is required")
        if not request.data.get("job_eval_objective_id"):
            return self.error("job_eval_objective_id is required")

        worker = ScoreManualController()
        jrs = worker.score_job_run_summary(request.data)

        return Response(jrs.as_hash())

    def delete(self, request, pk, format=None):
        if pk and JobRunSummary.objects.filter(pk=pk).exists():
            JobRunSummary.objects.get(pk=pk).delete()
            return Response({}, status=204)
        else:
            return Response({}, status=404)


class JobRunSummariesGenerateViewSet(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_id"):
            return self.error("job_id is required")
        if not request_data.get("job_eval_objective_id"):
            return self.error("job_eval_objective_id is required")

        worker = GenerateController()
        jrs = worker.generate_job_run_summary(request_data)

        return Response(jrs)

import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.jobs.models import Job
from guided_redaction.attributes.models import Attribute
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from .controller_generate import GenerateController
from .controller_score_manual import ScoreManualController


class JobRunSummariesViewSet(viewsets.ViewSet):

    def get_movie_names_list(self, job_run_summary):
        names = []
        if Attribute.objects.filter(job_run_summary=job_run_summary).exists():
            attributes = Attribute.objects.filter(job_run_summary=job_run_summary)
            for attribute in attributes:
                if attribute.name == 'jrs_movie_name':
                    names.append(attribute.value)
        return names

    def retrieve(self, request, pk):
        jrs = JobRunSummary.objects.get(pk=pk)
        jrs_data = jrs.as_dict()
        movie_names = self.get_movie_names_list(jrs)
        jrs_data['movie_names'] = movie_names
        return Response(jrs_data)

    def list(self, request):
        jrss = {}
        for jrs in JobRunSummary.objects.order_by('-created_on').all():
            content_length = str(len(jrs.content)) + ' bytes'
            if jrs.content_path:
                content_length = 'very large'
            movie_names = self.get_movie_names_list(jrs)
            jrss[str(jrs.id)] = {
                  'id': jrs.id,
                  'job_id': jrs.job.id,
                  'job_eval_objective_id': jrs.job_eval_objective.id,
                  'created_on': jrs.created_on,
                  'updated_on': jrs.updated_on,
                  'content_length': content_length,
                  'summary_type': jrs.summary_type,
                  'score': jrs.score,
                  'movie_names': movie_names,
                  'content_length': content_length,
            }
        return Response(jrss)

    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_id"):
            return self.error("job_id is required")
        if not request_data.get("job_eval_objective_id"):
            return self.error("job_eval_objective_id is required")

        worker = ScoreManualController()
        jrs = worker.score_job_run_summary(request_data)

        if type(jrs) == dict  and 'errors' in jrs:
          return self.error(jrs['errors'])
        return Response(jrs.as_dict())

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

        if 'errors' in jrs and jrs['errors']:
          return self.error(jrs['errors'])
        return Response(jrs)

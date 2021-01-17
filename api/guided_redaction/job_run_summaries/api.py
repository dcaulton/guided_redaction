import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from .controller_generate import GenerateController


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
        content = request.data.get('content')
        the_id = request.data.get('id')
        if the_id and JobRunSummary.objects.filter(pk=the_id).exists():
            jrs = JobRunSummary.objects.get(pk=the_id)
        else:
            jrs = JobRunSummary()

        job_id = request.data.get('job_id')
        if job_id:
            if not Job.objects.filter(id=job_id).exists():
                return self.error(['cannot find job for specified id'], status_code=400)
            jrs.job = Job.objects.get(pk=job_id)
        jeo_id = request.data.get('job_eval_objective_id')
        if jeo_id:
            if not JobEvalObjective.objects.filter(id=jeo_id).exists():
                return self.error(['cannot find job eval objective for specified id'], status_code=400)
            jrs.job_eval_objective = JobEvalObjective.objects.get(pk=jeo_id)
        jrs.content = json.dumps(content)
        jrs.save()
        return Response({"id": jrs.id})

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

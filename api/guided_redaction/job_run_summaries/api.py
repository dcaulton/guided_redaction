import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.job_run_summaries.models import JobRunSummary


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
            jrs.job = Job.objects.get(pk=job_id)
        jeo_id = request.data.get('job_eval_objective_id')
        if jeo_id:
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

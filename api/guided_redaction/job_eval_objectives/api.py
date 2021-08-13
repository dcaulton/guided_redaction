import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.job_eval_objectives.models import JobEvalObjective


class JobEvalObjectivesViewSet(viewsets.ViewSet):

    def retrieve(self, request, pk):
        jeo = JobEvalObjective.objects.get(pk=pk)
        build_attributes = {}
        jeo_data = {
            'id': jeo.id,
            'description': jeo.description,
            'created_on': jeo.created_on,
            'updated_on': jeo.updated_on,
            'content': jeo.content,
        }
        return Response({"job_eval_objective": jeo_data})

    def list(self, request):
        jeos = {}
        for jeo in JobEvalObjective.objects.all():
            content_length = len(jeo.content)
            if content_length < 1000000:
                content = json.loads(jeo.content)
            else:
                content = 'large content, truncated for list'
            jeos[str(jeo.id)] = {
                  'id': jeo.id,
                  'description': jeo.description,
                  'created_on': jeo.created_on,
                  'updated_on': jeo.updated_on,
                  'content_length': content_length,
                  'content': content,
            }

        return Response(jeos)

    def create(self, request):
        content = request.data.get('content')
        description = request.data.get('description')
        the_id = request.data.get('id')
        if the_id and JobEvalObjective.objects.filter(pk=the_id).exists():
            jeo = JobEvalObjective.objects.get(pk=the_id)
        else:
            jeo = JobEvalObjective()
        jeo.description = description
        jeo.content = json.dumps(content)
        jeo.save()
        return Response({"id": jeo.id})

    def delete(self, request, pk, format=None):
        if pk and JobEvalObjective.objects.filter(pk=pk).exists():
            JobEvalObjective.objects.get(pk=pk).delete()
            return Response()
        else:
            return Response({}, status=404)

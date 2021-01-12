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
            'description': scanner.description,
            'created_on': scanner.created_on,
            'updated_on': scanner.updated_on,
            'content': scanner.content,
        }
        return Response({"job_eval_objective": jeo_data})

    def list(self, request):
        jeos_list = []
        for jeo in JobEvalObjective.objects.all():
            content_length = len(jeo.content)
            if content_length < 1000000:
                content = json.loads(jeo.content)
            else:
                content = 'large content, truncated for list'
            jeos_list.append(    
                {
                    'id': scanner.id,
                    'description': scanner.description,
                    'created_on': scanner.created_on,
                    'updated_on': scanner.updated_on,
                    'content_length': content_length,
                    'content': content,
                }
            )

        return Response({"job_eval_objectives": jeos_list})

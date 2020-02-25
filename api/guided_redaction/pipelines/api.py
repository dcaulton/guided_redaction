import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.pipelines.models import Pipeline


class PipelinesViewSet(viewsets.ViewSet):
    def list(self, request):
        pipelines_list = []
        for pipeline in Pipeline.objects.all():
            pipelines_list.append(
                {
                    'id': pipeline.id,
                    'name': pipeline.name,
                    'description': pipeline.description,
                    'created_on': pipeline.created_on,
                    'updated_on': pipeline.updated_on,
                    'content': pipeline.content,
                }
            )

        return Response({"scanners": scanners_list})

    def retrieve(self, request, pk):
        pipeline = Pipeline.objects.get(pk=pk)
        p_data = {
            'id': pipeline.id,
            'name': pipeline.name,
            'description': pipeline.description,
            'created_on': pipeline.created_on,
            'updated_on': pipeline.updated_on,
            'content': pipeline.content,
        }
        return Response({"pipeline": p_data})

    def create(self, request):
        pipeline = Pipeline(
            name=request.data.get('name'),
            description=request.data.get('description'),
            content=json.dumps(request.data.get('content')),
        )
        pipeline.save()
        return Response({"pipeline_id": scanner.id})

    def delete(self, request, pk, format=None):
        Pipeline.objects.get(pk=pk).delete()
        return Response('', status=204)

import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.attributes.models import Attribute


class PipelinesViewSet(viewsets.ViewSet):
    def list(self, request):
        pipelines_list = []
        for pipeline in Pipeline.objects.all():
            build_attributes = {}
            if Attribute.objects.filter(pipeline=pipeline).exists():
                attributes = Attribute.objects.filter(pipeline=pipeline)
                for attribute in attributes:
                    build_attributes[attribute.name] = attribute.value
            pipelines_list.append(
                {
                    'id': pipeline.id,
                    'name': pipeline.name,
                    'description': pipeline.description,
                    'created_on': pipeline.created_on,
                    'updated_on': pipeline.updated_on,
                    'attributes': build_attributes,
                }
            )

        return Response({"pipelines": pipelines_list})

    def retrieve(self, request, pk):
        pipeline = Pipeline.objects.get(pk=pk)
        build_attributes = {}
        if Attribute.objects.filter(pipeline=pipeline).exists():
            attributes = Attribute.objects.filter(pipeline=pipeline)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value
        p_data = {
            'id': pipeline.id,
            'name': pipeline.name,
            'description': pipeline.description,
            'created_on': pipeline.created_on,
            'updated_on': pipeline.updated_on,
            'attributes': build_attributes,
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
        return Response({"pipeline_id": pipeline.id})

    def delete(self, request, pk, format=None):
        Pipeline.objects.get(pk=pk).delete()
        return Response('', status=204)

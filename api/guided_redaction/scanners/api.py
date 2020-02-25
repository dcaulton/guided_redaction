import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.scanners.models import Scanner


class ScannersViewSet(viewsets.ViewSet):
    def list(self, request):
        scanners_list = []
        for scanner in Scanner.objects.all():
            scanners_list.append(
                {
                    'id': scanner.id,
                    'type': scanner.type,
                    'name': scanner.name,
                    'description': scanner.description,
                    'created_on': scanner.created_on,
                    'updated_on': scanner.updated_on,
                    'content': scanner.content,
                }
            )

        return Response({"scanners": scanners_list})

    def retrieve(self, request, pk):
        scanner = Scanner.objects.get(pk=pk)
        s_data = {
            'id': scanner.id,
            'type': scanner.type,
            'name': scanner.name,
            'description': scanner.description,
            'created_on': scanner.created_on,
            'updated_on': scanner.updated_on,
            'content': scanner.content,
        }
        return Response({"scanner": s_data})

    def create(self, request):
        scanner = Scanner(
            type=request.data.get('type'),
            name=request.data.get('name'),
            description=request.data.get('description'),
            content=json.dumps(request.data.get('content')),
        )
        scanner.save()
        return Response({"scanner_id": scanner.id})

    def delete(self, request, pk, format=None):
        Scanner.objects.get(pk=pk).delete()
        return Response('', status=204)

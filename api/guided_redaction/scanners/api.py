import json
from rest_framework.response import Response
from base import viewsets
from guided_redaction.scanners.models import Scanner
from guided_redaction.attributes.models import Attribute


class ScannersViewSet(viewsets.ViewSet):
    def list(self, request):
        scanners_list = []
        for scanner in Scanner.objects.all():
            build_attributes = {}
            if Attribute.objects.filter(scanner=scanner).exists():
                attributes = Attribute.objects.filter(scanner=scanner)
                for attribute in attributes:
                    build_attributes[attribute.name] = attribute.value
            content_length = len(scanner.content)
            content = json.loads(scanner.content)
            scanner_metadata = {}
            if scanner.type == 'template':
                scanner_metadata['scan_level'] = content['scan_level']
                scanner_metadata['template_id'] = content['id']
                scanner_metadata['scale'] = content['scale']
                scanner_metadata['match_method'] = content['match_method']
                scanner_metadata['num_anchors'] = len(content['anchors'])
                scanner_metadata['num_mask_zones'] = len(content['mask_zones'])
            scanners_list.append(
                {
                    'id': scanner.id,
                    'type': scanner.type,
                    'name': scanner.name,
                    'description': scanner.description,
                    'created_on': scanner.created_on,
                    'updated_on': scanner.updated_on,
                    'attributes': build_attributes,
                    'content_length': content_length,
                    'content_metadata': scanner_metadata,
                }
            )

        return Response({"scanners": scanners_list})

    def retrieve(self, request, pk):
        scanner = Scanner.objects.get(pk=pk)
        build_attributes = {}
        if Attribute.objects.filter(scanner=scanner).exists():
            attributes = Attribute.objects.filter(scanner=scanner)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value
        s_data = {
            'id': scanner.id,
            'type': scanner.type,
            'name': scanner.name,
            'description': scanner.description,
            'created_on': scanner.created_on,
            'updated_on': scanner.updated_on,
            'attributes': build_attributes,
            'content': scanner.content,
        }
        return Response({"scanner": s_data})

    def create(self, request):
        scanner = Scanner(
            type=request.data.get('type'),
            name=request.data.get('name'),
            description=request.data.get('description'),
        )
        scanner.save()
#        import pdb; pdb.set_trace()
        request_content = request.data.get('content')
        if 'attributes' in request_content:
            for attribute_name in request_content['attributes']:
                attribute_value = request_content['attributes'][attribute_name]
                attribute = Attribute(
                    name=attribute_name,
                    value=attribute_value,
                    scanner=scanner,
                )
                attribute.save()
            del request_content['attributes']
        scanner.content = json.dumps(request_content)
        scanner.save()
        return Response({"scanner_id": scanner.id})

    def delete(self, request, pk, format=None):
        Scanner.objects.get(pk=pk).delete()
        return Response('', status=204)

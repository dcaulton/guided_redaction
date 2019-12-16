import uuid
import json
import os
from django.conf import settings
import requests
from rest_framework.response import Response
from base import viewsets
from guided_redaction.workbooks.models import Workbook
import json


class WorkbooksViewSet(viewsets.ViewSet):
    def list(self, request):
        workbooks_list = []
        for workbook in Workbook.objects.all():
            workbooks_list.append(
                {
                    'id': workbook.id,
                    'file_uuids_used': workbook.file_uuids_used,
                    'name': workbook.name,
                    'updated_on': workbook.updated_on,
                    'state_data': workbook.state_data,
                    'owner': workbook.owner,
                }
            )

        return Response({"workbooks": workbooks_list})

    def retrieve(self, request, pk):
        workbook = Workbook.objects.get(pk=pk)
        return Response({"workbook": workbook})

    def get_file_uuids_from_request(self, request_dict):
        uuids = []
#                (x_part, file_part) = os.path.split(movie)
#                (y_part, uuid_part) = os.path.split(x_part)
#                if uuid_part and len(uuid_part) == 36:
#                    uuids.append(uuid_part)
        return uuids

    # TODO refine this.  For now we're making it impossible for the caller to create duplicate
    #   workbooks.  I really want to add a PUT or PATCH  endpoint for updates, then make the front end
    #   smart enough to know if a workbook currently exists.
    #   We will also want to enforce owner+name being unique for a workbook
    def create(self, request):
        wb_exists = Workbook.objects.filter(name=request.data.get('name'), owner=request.data.get('owner')).count()
        if wb_exists:
            workbook = Workbook.objects.filter(
                name=request.data.get('name'),
                owner=request.data.get('owner')
            ).first()
            workbook.state_data=json.dumps(request.data.get('state_data'))
            workbook.file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data))
            workbook.save()
        else:
            workbook = Workbook(
                state_data=json.dumps(request.data.get('state_data')),
                file_uuids_used=json.dumps(self.get_file_uuids_from_request(request.data)),
                owner=request.data.get('owner'),
                name=request.data.get('name'),
            )
            workbook.save()

        return Response({"workbook_id": workbook.id})

    def delete(self, request, pk, format=None):
        Workbook.objects.get(pk=pk).delete()
        return Response('', status=204)

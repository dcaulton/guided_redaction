import json
from datetime import datetime, timedelta
from rest_framework.response import Response
from base import viewsets

from guided_redaction.workbooks.models import Workbook
from guided_redaction.attributes.models import Attribute


class WorkbooksViewSet(viewsets.ViewSet):
    def list(self, request):
        workbooks_list = []

        user_id = ''
        if 'user_id' in request.GET.keys():
            if request.GET['user_id'] and \
                request.GET['user_id'] != 'undefined' and \
                request.GET['user_id'] != 'all':
                user_id = request.GET['user_id']

        for workbook in Workbook.objects.all():
            workbook_obj = {
                'id': workbook.id,
                'name': workbook.name,
                'updated_on': workbook.updated_on,
            }

            owner = ''
            attrs = {}
            if Attribute.objects.filter(workbook=workbook).exists():
                attributes = Attribute.objects.filter(workbook=workbook)
                for attribute in attributes:
                    if attribute.name == 'user_id':
                        owner = attribute.value
                        workbook_obj['owner'] = owner
                    else:
                        attrs[attribute.name] = attribute.value
            if attrs:
                workbook_obj['attributes'] = attrs

            if user_id and owner != user_id:
                continue

            workbooks_list.append(workbook_obj)

        return Response({"workbooks": workbooks_list})

    def retrieve(self, request, pk):
        workbook = Workbook.objects.get(pk=pk)
        wb_data = {
            'id': workbook.id,
            'name': workbook.name,
            'updated_on': workbook.updated_on,
            'state_data': workbook.state_data,
        }
        if Attribute.objects.filter(workbook=workbook).exists():
            attributes = Attribute.objects.filter(workbook=workbook)
            for attribute in attributes:
                if attribute.name == 'user_id':
                    owner = attribute.value
                    wb_data['owner'] = owner

        return Response({"workbook": wb_data})

    # TODO refine this.  For now we're making it impossible for the caller to create duplicate
    #   workbooks.  I really want to add a PUT or PATCH  endpoint for updates, then make the front end
    #   smart enough to know if a workbook currently exists.
    def create(self, request):
        wb_exists = Workbook.objects.filter(name=request.data.get('name')).count()
        workbook = ''
        if wb_exists:
            workbook = Workbook.objects.filter(name=request.data.get('name')).first()
            workbook.state_data=json.dumps(request.data.get('state_data'))
            workbook.save()
        else:
            workbook = Workbook(
                state_data=json.dumps(request.data.get('state_data')),
                name=request.data.get('name'),
            )
            workbook.save()

        owner_id = request.data.get('owner')
        if owner_id:
            attribute = Attribute(
                name='user_id',
                value=owner_id,
                workbook=workbook,
            )
            attribute.save()

        auto_delete_age = request.data.get('auto_delete_age')
        if auto_delete_age:
            attribute = Attribute(
                name='auto_delete_age',
                value=auto_delete_age,
                workbook=workbook,
            )
            attribute.save()

        return Response({"workbook_id": workbook.id})

    def delete(self, request, pk, format=None):
        Workbook.objects.get(pk=pk).delete()
        return Response()

class WorkbooksViewSetDeleteOld(viewsets.ViewSet):
    def list(self, request):
        wb_ids_to_delete = []
        for workbook in Workbook.objects.all():
            if Attribute.objects.filter(workbook=workbook).exists():
                attributes = Attribute.objects.filter(workbook=workbook)
                for attribute in attributes:
                    if attribute.name == 'auto_delete_age':
                        workbook_age = datetime.now() - workbook.updated_on.replace(tzinfo=None)
                        print('workbook age is {}'.format(workbook_age))
                        if attribute.value == '1hours':
                            if workbook_age > timedelta(hours=1):
                                wb_ids_to_delete.append(workbook.id)
        for wb_id in wb_ids_to_delete:
            Workbook.objects.get(pk=wb_id).delete()

        resp_msg = '{} workbooks deleted'.format(len(wb_ids_to_delete))
        return Response({'message': resp_msg})

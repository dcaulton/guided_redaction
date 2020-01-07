from rest_framework.response import Response
from base import viewsets


class CodesViewSet(viewsets.ViewSet):
    def retrieve(self, request, pk):
        if pk == 'learn_dev_connection_data': 
            # TODO this is placeholder data until I work out connection details 
            #   to learn with Matt C
            return_data = {
                'api_key': 'abc123',
            }
            return Response({"code": return_data})

        return selfr.error("code not found", status_code=404)

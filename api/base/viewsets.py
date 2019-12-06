from rest_framework import status, viewsets
from rest_framework.response import Response


class ViewSet(viewsets.ViewSet):

    def error(self, err, status_code=None):
        if status_code is None:
            status_code = status.HTTP_400_BAD_REQUEST
        if isinstance(err, Exception):
            if err.args:
                messages = err.args[0]
            else:
                messages = []
            try:
                messages = json.loads(messages)
            except (TypeError, json.JSONDecodeError):
                pass
            return Response({"errors": messages}, status_code)
        if isinstance(err, str):
            err = [err]
        return Response({"errors": err}, status_code)

    def wrap_list(self, result):
        items = list(result)
        return {
            self.object_name or self.table_name: items,
            "COUNT": len(items),
            "PAGE": 1,
        }


class FunctionBasedViewSet(ViewSet):
    def list(self, request):
        return self.get(self, request)

    def create(self, request):
        return self.post(self, request)


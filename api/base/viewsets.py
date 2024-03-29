import simplejson as json
import base.json
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

    def make_csv_ready(self, result):
        items = list(result)
        for item in items:
            for key, value in item.items():
                if isinstance(value, (dict, list)):
                    item[key] = base.json.dumps(value)
        return items

    def wrap_list(self, result, object_name=None):
        object_name = object_name or self.object_name or self.table_name
        items = list(result)
        return {
            object_name: items,
            "COUNT": len(items),
            "PAGE": 1,
        }

    def validate(self, request):
        return []

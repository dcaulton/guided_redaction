import simplejson as json


JSONDecoder = json.JSONDecoder
load = json.load
loads = json.loads
errors = json.errors


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if hasattr(o, 'isoformat'):
            return o.isoformat()
        return super(BaseJsonEncoder, self).default(o)


def dump(*args, **kwargs):
    if "cls" not in kwargs:
        kwargs["cls"] = JSONEncoder
    return json.dump(*args, **kwargs)


def dumps(*args, **kwargs):
    if "cls" not in kwargs:
        kwargs["cls"] = JSONEncoder
    return json.dumps(*args, **kwargs)

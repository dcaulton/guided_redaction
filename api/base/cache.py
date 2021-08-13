import inspect
from warnings import warn, filterwarnings

from django.conf import settings
from redis import Redis, ResponseError

filterwarnings(
    "default",
    "(delete|set|get|pop|push|unpop) is deprecated. Use",
    DeprecationWarning,
    "base.cache",
)


redis_connection = None
def get_redis_connection(refresh=False):
    global redis_connection
    if redis_connection is None or refresh:
        redis_connection = Redis(**settings.REDIS_CONNECTION)
    return redis_connection

def delete(key):
    cache = Cache(key)
    return cache.delete()

def set(key, value, timeout=None):
    cache = Cache(key)
    return cache.set(value, timeout)

def get(key):
    cache = Cache(key)
    return cache.get()

def get_and_set(key, value, timeout=None):
    cache = Cache(key)
    return cache.get_and_set(value, timeout=None)

def length(key):
    cache = Cache(key)
    return cache.length()

def pop(key, stack=False):
    cache = Cache(key)
    return cache.pop(stack)

def push(key, value, timeout=None):
    cache = Cache(key)
    return cache.push(value)

def unpop(key, value):
    cache = Cache(key)
    return cache.unpop(value)


class Cache(object):

    def __init__(self, key):
        self.rconn = get_redis_connection()
        self.key = key

    def delete(self):
        self.rconn.delete(self.key)

    def set(self, value, timeout=None):
        if timeout is None:
            timeout = getattr(settings, "BASE_CACHE_TIMEOUT", 600)
        self.rconn.set(self.key, value, ex=timeout)

    def get(self):
        try:
            return self.rconn.get(self.key)
        except ResponseError:
            return self.rconn.lrange(self.key, 0, -1)

    def get_and_set(self, value, timeout=None):
        if timeout is None:
            timeout = getattr(settings, "BASE_CACHE_TIMEOUT", 600)
        pipeline = self.rconn.pipeline()
        pipeline.get(self.key)
        pipeline.set(self.key, value, ex=timeout)
        result = pipeline.execute()
        if result:
            return result[0]
        return None

    def length(self):
        return self.rconn.llen(self.key)

    def pop(self, stack=False):
        if stack:
            return self.rconn.lpop(self.key)
        return self.rconn.rpop(self.key)

    def push(self, value, timeout=None):
        if timeout is None:
            timeout = getattr(settings, "BASE_CACHE_TIMEOUT", 600)
        count = self.rconn.lpush(self.key, value)
        self.rconn.expire(self.key, timeout)
        return count

    def unpop(self, value):
        self.rconn.rpush(self.key, value)

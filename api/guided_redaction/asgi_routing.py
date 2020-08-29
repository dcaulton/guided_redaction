from django.urls import path

from server.router import get_asgi_router
from . import consumers


router = get_asgi_router()
router.urls.append(path("ws/redact-jobs", consumers.GuidedRedactionConsumer))

from server.router import get_router

from guided_redaction.attributes import api

router = get_router()

router.register(
    r"redact/v1/attributes", api.AttributesViewSet, basename="TomWaits"
)

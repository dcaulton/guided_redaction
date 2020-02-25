from server.router import get_router

from guided_redaction.pipelines import api

router = get_router()

router.register(
    r"v1/pipelines", api.PipelinesViewSet, basename="PaulLynde"
)

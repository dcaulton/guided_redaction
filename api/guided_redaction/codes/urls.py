from server.router import get_router

from guided_redaction.codes import api

router = get_router()

router.register(
    r"v1/codes/", api.CodesViewSet, basename="ClydeTombaugh"
)

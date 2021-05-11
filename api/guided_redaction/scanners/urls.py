from server.router import get_router

from guided_redaction.scanners import api

router = get_router()

router.register(
    r"redact/v1/scanners", api.ScannersViewSet, basename="DinoMartino"
)

from server.router import get_router

from . import api

router = get_router()

router.register(
    r"redact/v1/redact/redact-image", api.RedactViewSetRedactImage, basename="DerekZoolander"
)
router.register(
    r"redact/v1/redact/illustrate-image", api.RedactViewSetIllustrateImage, basename="SpiderMonkey"
)

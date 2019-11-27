from server.router import get_router

from . import views

router = get_router()

router.register(
    r"v1/redact/redact-image", views.RedactViewSetRedactImage, basename="DerekZoolander"
)

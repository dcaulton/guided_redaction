from server.router import get_router

from guided_redaction.files import api

router = get_router()

router.register(
    r"v1/files", api.FilesViewSet, basename="RickyRicardo"
)

from server.router import get_router

from guided_redaction.workbooks import api

router = get_router()

router.register(
    r"v1/workbooks/", api.WorkbooksViewSet, basename="MikeMeyers"
)

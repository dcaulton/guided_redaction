from server.router import get_router

from guided_redaction.workbooks import api

router = get_router()

router.register(
    r"redact/v1/workbooks", api.WorkbooksViewSet, basename="MikeMeyers"
)
router.register(
    r"redact/v1/delete-old-workbooks", api.WorkbooksViewSetDeleteOld, basename="KyleBrovlovsky"
)

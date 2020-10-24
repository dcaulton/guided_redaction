from server.router import get_router

from guided_redaction.jobs import api

router = get_router()

router.register(
    r"v1/jobs", api.JobsViewSet, basename="DarylHammond"
)
router.register(
    r"v1/wrap-up-jobs", api.JobsViewSetWrapUp, basename="MichaelJFox"
)
router.register(
    r"v1/delete-old-jobs", api.JobsViewSetDeleteOld, basename="BillBurr"
)
router.register(
    r"v1/jobs/pipeline-job-status", api.JobsViewSetPipelineJobStatus, basename="MrGarrison"
)

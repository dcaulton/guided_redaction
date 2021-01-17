from server.router import get_router

from guided_redaction.job_run_summaries import api

router = get_router()

router.register(
    r"v1/job-run-summaries/generate", api.JobRunSummariesGenerateViewSet, basename="JohnSimonRitchie"
)
router.register(
    r"v1/job-run-summaries", api.JobRunSummariesViewSet, basename="JohnLeyden"
)

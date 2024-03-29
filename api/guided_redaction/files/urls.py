from server.router import get_router

from guided_redaction.files import api

router = get_router()

router.register(
    r"redact/v1/files/export", api.FilesViewSetExport, basename="HughJackman"
)
router.register(
    r"redact/v1/files/import-archive", api.FilesViewSetImportArchive, basename="CarrollOConnor"
)
router.register(
    r"redact/v1/files/make-url", api.FilesViewSetMakeUrl, basename="JackTorrance"
)
router.register(
    r"redact/v1/files/get-version", api.FilesViewSetGetVersion, basename="Cicada"
)
router.register(
    r"redact/v1/files", api.FilesViewSet, basename="RickyRicardo"
)
router.register(
    r"redact/v1/download-secure-file", api.FilesViewSetDownloadSecureFile, basename="KeyzerSoze"
)

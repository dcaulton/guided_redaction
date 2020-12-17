from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller                                         
from guided_redaction.analyze.classes.GetScreens import GetScreens


class GetScreensController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def get_screens(self, request_data):
        response_data = {}
        image_url = request_data.get('image_url')
        generate_statistics = request_data.get('generate_statistics', True)
        cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
        get_screens_worker = GetScreens(generate_statistics=generate_statistics)
        response_data = get_screens_worker.get_screens(cv2_image)
        return response_data

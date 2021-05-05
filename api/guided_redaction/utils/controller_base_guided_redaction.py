import os
import cv2
import numpy as np
import requests
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter

class BaseGuidedRedactionController:

    def __init__(self):
        pass

    def get_cv2_image_from_url(self, image_url, file_writer=None):
        cv2_image = None
        if not file_writer:
            file_writer = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
        file_fullpath = file_writer.get_file_path_for_url(image_url)
        if os.path.exists(file_fullpath):
            image = file_writer.read_binary_data_from_filepath(file_fullpath)
        else:
            image = requests.get(
              image_url,
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2_image

    def get_uuid_from_url(self, the_url):
        (x_part, file_part) = os.path.split(the_url)
        (y_part, uuid_part) = os.path.split(x_part)
        return uuid_part

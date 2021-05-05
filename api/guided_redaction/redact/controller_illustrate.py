import os
from urllib.parse import urlsplit
import uuid
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.redact.classes.ImageIllustrator import ImageIllustrator
from guided_redaction.utils.controller_base_guided_redaction import BaseGuidedRedactionController


class IllustrateController(BaseGuidedRedactionController):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def illustrate_image(self, request_data):
        inbound_image_url = request_data.get("image_url")
        ill_data = request_data.get("illustration_data")

        cv2_image = self.get_cv2_image_from_url(inbound_image_url, self.file_writer)
        if type(cv2_image) == type(None):
            print('error fetching image for illustrate')
            return self.error('exception occurred while loading image')

        image_illustrator = ImageIllustrator()
        illustrated_image = image_illustrator.illustrate(
            cv2_image, ill_data
        )

        save_directory_hash = str(uuid.uuid4())
        if request_data.get('preserve_working_dir_across_batch') and \
            request_data.get('working_dir'):
            save_directory_hash = request_data['working_dir']
        inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
        (file_basename, file_extension) = os.path.splitext(inbound_filename)
        new_filename = file_basename + "_illustrated" + file_extension
        workdir = self.file_writer.create_unique_directory(save_directory_hash)
        outfilename = os.path.join(workdir, new_filename)
        illustrated_image_url = self.file_writer.write_cv2_image_to_filepath(illustrated_image, outfilename)

        build_response = {
            "illustrated_image_url": illustrated_image_url,
            "original_image_url": inbound_image_url,
        }
        return build_response






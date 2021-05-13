import cv2
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.DataSifterManualCompiler import DataSifterManualCompiler
from guided_redaction.utils.image_shared import (
    get_base64_image_string,
)


class DataSifterManualCompileController(T1Controller):

    def __init__(self):
        self.debug = True
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def compile(self, request_data):
        t1_scanners = request_data.get('tier_1_scanners')
        first_key = list(t1_scanners['data_sifter'].keys())[0]
        data_sifter = t1_scanners['data_sifter'][first_key]
        movies = request_data.get("movies")
        worker = DataSifterManualCompiler(data_sifter, movies)
        data_sifter = worker.compile()

        source_image = self.get_cv2_image_from_url(data_sifter['image_url'], self.file_writer)
        source_image = self.trim_cv2_image_to_ocr_inputs(source_image, movies)
        source_image_base64 = get_base64_image_string(source_image)
        # TODO push this up to the utils method when I can confirm it doesnt break anything
        data_sifter['source_image_base64'] = 'data:image/png;base64,' + source_image_base64

        return data_sifter

    def trim_cv2_image_to_ocr_inputs(self, cv2_image, movies):
        start_x = -1
        start_y = -1
        end_x = -1
        end_y = -1
        for movie_url in movies:
           for frameset_hash in movies[movie_url]['framesets']:
               for ocr_match_obj_id in movies[movie_url]['framesets'][frameset_hash]:
                   ocr_match_obj = movies[movie_url]['framesets'][frameset_hash][ocr_match_obj_id]
                   start = ocr_match_obj['location']
                   end = (
                       ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
                       ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
                   )
                   if start_x < 0:
                       start_x = start[0]
                   if start_y < 0:
                       start_y = start[1]
                   if end_x < 0:
                       end_x = end[0]
                   if end_y < 0:
                       end_y = end[1]
                   if start[0] < start_x:
                       start_x = start[0]
                   if start[1] < start_y:
                       start_y = start[1]
                   if end[0] > end_x:
                       end_x = end[0]
                   if end[1] > end_y:
                       end_y = end[1]

        black = (0, 0, 0)

        start = (0, 0)
        end = (cv2_image.shape[1], start_y)
        cv2.rectangle(
            cv2_image,
            start,
            end,
            black,
            -1
        )
        start = (0, 0)
        end = (start_x, cv2_image.shape[0])
        cv2.rectangle(
            cv2_image,
            start,
            end,
            black,
            -1
        )
        start = (end_x, 0)
        end = (cv2_image.shape[1], cv2_image.shape[0])
        cv2.rectangle(
            cv2_image,
            start,
            end,
            black,
            -1
        )
        start = (0, end_y)
        end = (cv2_image.shape[1], cv2_image.shape[0])
        cv2.rectangle(
            cv2_image,
            start,
            end,
            black,
            -1
        )

        return cv2_image

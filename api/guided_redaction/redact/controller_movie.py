import cv2
import json
import random
import os
from django.conf import settings
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.utils.controller_base_guided_redaction import BaseGuidedRedactionController


class RedactMovieController(BaseGuidedRedactionController):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
#            def get_cv2_image_from_url(self, image_url, file_writer=None):


    def redact_movie(self, request_data):
        movie_url = request_data.get("movie_url")
        movie = request_data.get("movie")
        source_movie = request_data.get("source_movie")
        redact_rule = request_data.get("redact_rule")

        response_data = {
            'movies': {},
        }
        response_data['movies'][movie_url] = {
            'framesets': {},
        }
        for frameset_hash in movie['framesets']:
            pass
            
        


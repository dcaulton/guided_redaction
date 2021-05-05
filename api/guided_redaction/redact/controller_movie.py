import cv2
import json
import random
import os
from urllib.parse import urlsplit
from django.conf import settings
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.utils.controller_base_guided_redaction import BaseGuidedRedactionController
from guided_redaction.redact.classes.ImageMasker import ImageMasker
from guided_redaction.redact.classes.TextEraser import TextEraser
from guided_redaction.redact.classes.DataSynthesizer import DataSynthesizer


class RedactMovieController(BaseGuidedRedactionController):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.redact_rule = {}
        self.target_directory_uuid = ''

    def redact_movie(self, request_data):
        movie_url = request_data.get("movie_url")
        movie = request_data.get("movie")
        source_movie = request_data.get("source_movie")
        self.redact_rule = request_data.get("redact_rule")

        response_data = {
            'movies': {},
        }
        response_data['movies'][movie_url] = {
            'framesets': {},
        }
        # get the directory to save to
        self.target_directory_uuid = self.get_uuid_from_url(movie_url)

        for frameset_hash in movie['framesets']:
            if frameset_hash not in source_movie['framesets']:
                print('error, no source frame for {} to redact'.format(frameset_hash))
                return self.error('exception occurred while getting image name for {}'.format(frameset_hash))
            # we are ignoring redacted and illustrated images, in a t1 pipeline context it makes sense
            #   because those are headless pipelines, no one is expected to manually redact/illustrate them 
            #   halfway through the pipeline run
            inbound_image_url = source_movie['framesets'][frameset_hash]['images'][0]
            cv2_image = self.get_cv2_image_from_url(inbound_image_url, self.file_writer)
            if type(cv2_image) == type(None):
                print('error fetching image for movie frameset {}'.format(frameset_hash))
                return self.error('exception occurred while loading image for {}'.format(frameset_hash))
            redacted_cv2_image = self.redact_one_image(cv2_image, movie['framesets'][frameset_hash])

            redacted_image_url = self.save_redacted_image(redacted_cv2_image, inbound_image_url)
            response_data['movies'][movie_url]['framesets'][frameset_hash] = {
                'redacted_image_url': redacted_image_url,
                'original_image_url': inbound_image_url,
            }

        return response_data

    def redact_one_image(self, cv2_image, frameset_data):
        areas_to_redact = []
        for match_obj_key in frameset_data:
            match_obj = frameset_data[match_obj_key]
            if 'start' in match_obj and 'end' in match_obj:
                coords_dict = {
                    "start": tuple(match_obj['start']),
                    "end": tuple(match_obj['end']),
                }
            elif 'location' in match_obj and 'size' in match_obj:
                coords_dict = {
                    "start": tuple(match_obj['location']),
                    "end": tuple((
                        match_obj['location'][0] + match_obj['size'][0],
                        match_obj['location'][1] + match_obj['size'][1]
                    ))
                }
            areas_to_redact.append(coords_dict)


        if self.redact_rule['mask_method'] == 'text_eraser':
            masker = TextEraser(self.redact_rule)
            masked_image = masker.mask_all_regions(
                cv2_image, areas_to_redact
            )
        elif self.redact_rule['mask_method'] == 'data_synthesizer':
            synthesizer = DataSynthesizer(self.redact_rule)
            masked_image = synthesizer.synthesize_data(
                cv2_image,
                frameset_data
            )
        else:
            image_masker = ImageMasker()
            masked_image = image_masker.mask_all_regions(
                cv2_image, areas_to_redact, self.redact_rule['mask_method']
            )
        return masked_image

    def save_redacted_image(self, redacted_cv2_image, inbound_image_url):
        inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
        (file_basename, file_extension) = os.path.splitext(inbound_filename)
        new_filename = file_basename + "_redacted" + file_extension
        workdir = self.file_writer.create_unique_directory(self.target_directory_uuid)
        outfilename = os.path.join(workdir, new_filename)
        redacted_image_url = self.file_writer.write_cv2_image_to_filepath(redacted_cv2_image, outfilename)
        return redacted_image_url

import cv2
import os
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from guided_redaction.analyze.classes.EntityFinder import EntityFinder
from .controller_t1 import T1Controller
import json
import numpy as np
from django.conf import settings
import requests

requests.packages.urllib3.disable_warnings()


class EntityFinderController(T1Controller):

    def __init__(self):
        pass

    def find_entities(self, request_data):
        entity_finder_meta = request_data.get("entity_finder_meta")
        movies = request_data.get("movies")
        build_response_data = {'movies': {}}
        for movie_url in movies:
            build_response_data['movies'][movie_url] = {'framesets': {}}
            movie = movies[movie_url]
            frames = movie['frames']
            framesets = movie['framesets']
            ordered_hashes = self.get_frameset_hashes_in_order(frames, framesets)
            for index, frameset_hash in enumerate(ordered_hashes):
                frameset = movie['framesets'][frameset_hash]
                response = self.analyze_one_frame(frameset, entity_finder_meta)
                build_response_data['movies'][movie_url]['framesets'][frameset_hash] = response

        return build_response_data

    def analyze_one_frame(self, frameset, entity_finder_meta):
        if 'images' not in frameset or not frameset['images']:
            return
        pic_response = requests.get(
          frameset['images'][0],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return 

        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if entity_finder_meta['entity_type'] == 'chrome_window':
            template_filepath = os.path.join(
                settings.BASE_DIR, 
                'guided_redaction/data/templates/chrome_controls.json'
            )
            template_text = ''.join(open(template_filepath, 'rt').readlines())
            template_object = json.loads(template_text)
        elif entity_finder_meta['entity_type'] == 'ie_window':
            template_filepath = os.path.join(
                settings.BASE_DIR, 
                'guided_redaction/data/templates/ie_controls.json'
            )
            template_text = ''.join(open(template_filepath, 'rt').readlines())
            template_object = json.loads(template_text)
        elif entity_finder_meta['entity_type'] == 'desktop':
            template_object = {}
        elif entity_finder_meta['entity_type'] == 'taskbar':
            template_filepath = os.path.join(
                settings.BASE_DIR, 
                'guided_redaction/data/templates/windows_start_button.json'
            )
            template_text = ''.join(open(template_filepath, 'rt').readlines())
            template_object = json.loads(template_text)

        template_matcher = TemplateMatcher(template_object)
        extents_finder = ExtentsFinder()

        entity_finder = EntityFinder(cv2_image, entity_finder_meta, template_matcher, extents_finder)

        return entity_finder.find_entities()

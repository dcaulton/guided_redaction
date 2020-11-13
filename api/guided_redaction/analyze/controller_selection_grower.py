import cv2 
from django.conf import settings
import numpy as np
import requests
from .controller_t1 import T1Controller

from guided_redaction.analyze.classes.SelectionGrower import SelectionGrower
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)

requests.packages.urllib3.disable_warnings()


class SelectionGrowerController(T1Controller):

    def __init__(self):
        self.debug = True

    def process_selection_grower(self, request_data):
        response_movies = {}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]
        source_movie = source_movies[movie_url]

        sg_id = list(request_data["tier_1_scanners"]['selection_grower'].keys())[0]
        sg_meta = request_data["tier_1_scanners"]['selection_grower'][sg_id]

        grower = SelectionGrower(sg_meta)

        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        statistics = {'movies': {}}
        statistics['movies'][movie_url] = {'framesets': {}}
        for frameset_hash in ordered_hashes:
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            if frameset_hash in movies[movie_url]['framesets']:
                if self.debug:
                    image_name = image_url.split('/')[-1]
                    print('selection grower trying image {}'.format(image_name))
                cv2_image = self.get_cv2_image(image_url)
                t1_match_data = movies[movie_url]['framesets'][frameset_hash]
                if not self.match_data_contains_ocr(t1_match_data):
                    self.add_ocr_to_match_data(t1_match_data, cv2_image)
                grown_selection, stats = grower.grow_selection(t1_match_data, cv2_image)
                if grown_selection:
                    response_movies[movie_url]['framesets'][frameset_hash] = grown_selection
                statistics['movies'][movie_url]['framesets'][frameset_hash] = stats
        return response_movies, statistics

    def match_data_contains_ocr(self, t1_match_data):
        for match_key in t1_match_data:
            if t1_match_data[match_key]['scanner_type'] == 'ocr':
                return True
        return False

    def add_ocr_to_match_data(self, t1_match_data, cv2_image):
        analyzer = EastPlusTessGuidedAnalyzer()
        start = (0, 0)
        end = (cv2_image.shape[1], cv2_image.shape[0])
        raw_rtas = analyzer.analyze_text(
            cv2_image,
            [start, end]
        )
        for rta in raw_rtas:
            t1_match_data[rta['id']] = rta

    def get_cv2_image(self, image_url):
        cv2_image = None
        image = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2_image

import cv2 
from django.conf import settings
import numpy as np
import requests
from .controller_t1 import T1Controller

from guided_redaction.analyze.classes.SelectionGrower import SelectionGrower

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
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], movie['framesets'])
        statistics = {'movies': {}}
        statistics['movies'][movie_url] = {'framesets': {}}
        for frameset_hash in ordered_hashes:
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            if self.debug:
                image_name = image_url.split('/')[-1]
                pstr = 'selection grower trying image {} with mr hash {}'
                print(pstr.format(image_name, most_recent_t1_frameset_hash))
            cv2_image = self.get_cv2_image(image_url)
        return response_movies, statistics

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
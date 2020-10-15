import json
import math
import cv2
from django.conf import settings
import numpy as np
import requests
from .controller_t1 import T1Controller


requests.packages.urllib3.disable_warnings()


class MeshMatchController(T1Controller):

    def __init__(self):
        pass

    def process_mesh_match(self, request_data):
        response_movies = {}







        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]
        source_movie = source_movies[movie_url]


        mesh_match_id = list(request_data["tier_1_scanners"]['mesh_match'].keys())[0]
        mesh_match_meta = request_data["tier_1_scanners"]['mesh_match'][mesh_match_id]
#        finder = ExtentsFinder()
        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        most_recent_t1_frameset = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        for frameset_hash in ordered_hashes:
            if frameset_hash in movie['framesets']:
                most_recent_t1_frameset = movie['framesets'][frameset_hash]
                continue

            cv2_image = self.get_cv2_image(
                source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            ) 
            print('samuel {}'.format(mesh_match_meta))









#            regions_for_image = self.build_sa_regions(frameset, cv2_image, selected_area_meta, finder)
#            regions_as_hashes = {}
#            for region in regions_for_image:
#                size = [
#                    region['regions'][1][0] - region['regions'][0][0], 
#                    region['regions'][1][1] - region['regions'][0][1]
#                ]
#                region_hash = {
#                    'location': region['regions'][0],
#                    'origin': region['origin'],
#                    'scale': 1,
#                    'size': size,
#                    "scanner_type": "selected_area",
#                }
#                regions_as_hashes[region['sam_area_id']] = region_hash
#            # TODO: GET TEMPLATE ANCHOR OFFSET HERE IF NEEDED
#            #   it prolly makes sense to return it from process_t1_results
#            if regions_as_hashes:
#                response_movies[movie_url]['framesets'][frameset_hash] = regions_as_hashes
        return response_movies

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

import cv2
import random
import os
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from .controller_t1 import T1Controller
import numpy as np
from django.conf import settings
import requests

requests.packages.urllib3.disable_warnings()


class OcrController(T1Controller):

    def scan_ocr_all(self, request_data):
        ocr_rule_id = list(request_data['tier_1_scanners']['ocr'].keys())[0]
        ocr_rule = request_data['tier_1_scanners']['ocr'][ocr_rule_id]
        response_data = {
            'movies': {},
            'statistics': {},
        }
        movies = request_data['movies']
        source_movies = {}
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        for movie_url in movies:
            movie = movies[movie_url]
            for frameset_hash in movie['framesets']:
                if 'images' in movie['framesets'][frameset_hash]:
                    image_url = movie['framesets'][frameset_hash]['images'][0]
                else:
                    image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]

            found_areas = self.scan_ocr(image_url, ocr_rule)
            if found_areas:
                if movie_url not in response_data['movies']:
                    response_data['movies'][movie_url] = {'framesets': {}}
                response_data['movies'][movie_url]['framesets'][frameset_hash] = found_areas

        return response_data

    def scan_ocr(self, image_url, ocr_rule):
        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content

        analyzer = EastPlusTessGuidedAnalyzer()
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if ocr_rule['start']:
            start = ocr_rule['start']
        else:
            start = (0, 0)
        if ocr_rule['end']:
            end = ocr_rule['end']
        else:
            end = (cv2_image.shape[1], cv2_image.shape[0])

        if ocr_rule['skip_east']:
            tight_image = cv2_image[
                start[1]:end[1], 
                start[0]:end[0]
            ]
            gray = cv2.cvtColor(tight_image, cv2.COLOR_BGR2GRAY)
            bg_color = gray[1,1]
            if bg_color < 100:  # its light text on dark bg, invert
                gray = cv2.bitwise_not(gray)
            raw_recognized_text_areas = analyzer.analyze_text(
                gray, 
                [start, end],
                processing_mode='tess_only'
            )
        else:
            raw_recognized_text_areas = analyzer.analyze_text(
                cv2_image, [start, end]
            )

        recognized_text_areas = {}
        for raw_rta in raw_recognized_text_areas:
            the_id = 'rta_' + str(random.randint(100000000, 999000000))
            
            if 'start' in raw_rta and 'end' in raw_rta:
                # we used east, so coords come with the ocr results
                size = [
                    raw_rta['end'][0]-raw_rta['start'][0], 
                    raw_rta['end'][1]-raw_rta['start'][1] 
                ]
                returned_start_coords = raw_rta['start']
            else:
                # 'skip east' requested, use adjusted box coords
                size = [
                    end[0] - start[0],
                    end[1] - start[1]
                ]
                returned_start_coords = start
                
            recognized_text_areas[the_id] = {
                'source': raw_rta['source'],
                'location': returned_start_coords,
                'size': size,
                'origin': (0, 0),
                'ocr_window_start': start, 
                'scale': 1,
                'scanner_type': 'ocr',
                'text': raw_rta['text']
            }

        return recognized_text_areas

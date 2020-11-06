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

    def __init__(self):
        pass

    def scan_ocr(self, request_data):
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        ocr_rule_id = list(request_data['tier_1_scanners']['ocr'].keys())[0]
        ocr_rule = request_data['tier_1_scanners']['ocr'][ocr_rule_id]

        analyzer = EastPlusTessGuidedAnalyzer()
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        box_coords = {
            'start': ocr_rule['start'],
            'end': ocr_rule['end'],
            'origin': ocr_rule['origin_entity_location'],
        }
        adjusted_coords = self.adjust_start_end_origin_for_t1(
            box_coords, request_data.get('tier_1_data'), ocr_rule
        )

        start = adjusted_coords['start']
        if not start:
            start = (0, 0)
        end = adjusted_coords['end']
        if not end:
            end = (cv2_image.shape[1], cv2_image.shape[0])

        origin = adjusted_coords['origin']
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
                'origin': adjusted_coords['origin'],
                'ocr_window_start': adjusted_coords['start'],
                'scale': 1,
                'scanner_type': 'ocr',
                'text': raw_rta['text']
            }

        return recognized_text_areas

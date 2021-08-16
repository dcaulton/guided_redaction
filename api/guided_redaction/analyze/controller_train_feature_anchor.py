import base64
import json
import pickle
import uuid

import cv2
from django.conf import settings

from .controller_t1 import T1Controller
from .classes.FeatureFinder import FeatureFinder
from guided_redaction.utils.classes.FileWriter import FileWriter


class TrainFeatureAnchorController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def train_anchor(self, request_data):
        response_obj = {
            'tier_1_scanners': {
                'feature': {},
            },
        }
        movie_url, movie, source_movie = self.get_movie_and_source_movie(request_data)
        meta_id = list(request_data['tier_1_scanners']['feature'].keys())[0]
        self.meta_obj = request_data['tier_1_scanners']['feature'][meta_id]
        anchor = self.meta_obj['anchors'][0]
        anchor_movie_url = anchor['movie']
        anchor_image_url = anchor['image']

        finder = FeatureFinder()
        frameset_hash = list(movie['framesets'].keys())[0]

        image_url = movie['frames'][0]
        cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
        if type(cv2_image) == type(None):
            err_string = 'error getting image for selected area'
            print(err_string)
            return {'errors': [err_string]}

        start = anchor['start']
        end = anchor['end']
        cv2_image = cv2_image[start[1]:end[1], start[0]:end[0]]

        keypoints, descriptors, cv2_image_with_keypoints = \
            finder.find_features(cv2_image, self.meta_obj.get('return_type'))

        kp_ser= []
        for index, point in enumerate(keypoints):
            desc = descriptors[index]
            build_desc = [int(i) for i in desc]
            build_kp = {
                'point': point.pt, 
#                'size': point.size, 
#                'angle': point.angle, 
#                'response': point.response, 
#                'octave': point.octave, 
#                'class_id': point.class_id,
                'descriptors': build_desc,
            }
            kp_ser.append(build_kp)

        if keypoints: 
            virgin_anchor_image = cv2_image.copy()
            virgin_anchor_image_string = self.get_base64_image_string(virgin_anchor_image)
            cv2_image = cv2.drawKeypoints(cv2_image, keypoints, None, color=(0,255,0), flags=0)
            anchor_image_string = self.get_base64_image_string(cv2_image)
            kps = json.dumps(kp_ser)
            anchor_obj = {
                'id': anchor['id'],
                'start': start,
                'end': end,
                'keypoints': kps,
                'cropped_image_bytes': anchor_image_string,
                'cropped_image_bytes_before': virgin_anchor_image_string,
                'movie': anchor_movie_url,
                'image': anchor_image_url,
            }
            self.meta_obj['anchors'] = [anchor_obj]
            response_obj['tier_1_scanners']['feature'][meta_id] = self.meta_obj

        return response_obj

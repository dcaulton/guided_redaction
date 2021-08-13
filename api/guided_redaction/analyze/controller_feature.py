import base64
import json
import pickle
import uuid

import cv2
from django.conf import settings

from .controller_t1 import T1Controller
from .classes.FeatureFinder import FeatureFinder
from guided_redaction.utils.classes.FileWriter import FileWriter


class FeatureController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def get_anchor_descriptors(self, feature_meta_object):
        return_obj = {}
        rehydrated_keypoints = []
        for anchor in feature_meta_object.get('anchors', []):
            akps = json.loads(anchor['keypoints'])
            for akp in akps:
                kp = cv2.KeyPoint(
                  akp['point'][0],
                  akp['point'][1],
                  akp['size'],
                  akp['angle'],
                  akp['response'],
                  akp['octave'],
                  akp['class_id'],
                )
                rehydrated_keypoints.append(kp)
        print('dandy don ', rehydrated_keypoints)

    def update_bounding_box(self, point):
        if point[0] < self.feature_bounding_box[0]:
            self.feature_bounding_box[0] = point[0]
        if point[0] > self.feature_bounding_box[2]:
            self.feature_bounding_box[2] = point[0]
        if point[1] < self.feature_bounding_box[1]:
            self.feature_bounding_box[1] = point[1]
        if point[1] > self.feature_bounding_box[3]:
            self.feature_bounding_box[3] = point[1]

    def find_features(self, request_data):
        response_obj = self.get_empty_t1_response_obj()
        movie_url, movie, source_movie = self.get_movie_and_source_movie(request_data)
        meta_id = list(request_data['tier_1_scanners']['feature'].keys())[0]
        feature_meta_obj = request_data['tier_1_scanners']['feature'][meta_id]
        anchor_descriptors = self.get_anchor_descriptors(feature_meta_obj)

        finder = FeatureFinder()
        response_obj['movies'][movie_url] = {}
        response_obj['movies'][movie_url]['framesets'] = {}
        for frameset_hash in movie['framesets']:
            image_url = source_movie['framesets'][frameset_hash]['images'][0]
            cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
            if type(cv2_image) == type(None):
                print('error getting image for selected area')
                continue
            self.feature_bounding_box = [cv2_image.shape[1], cv2_image.shape[0], 0, 0]

            keypoints, descriptors, cv2_image_with_keypoints = \
                finder.find_features(cv2_image, feature_meta_obj.get('return_type'))

            kp_ser= []
            for index, point in enumerate(keypoints):
                desc = descriptors[index]
                self.update_bounding_box(point.pt)
                temp={
                    'point': point.pt, 
                    'size': point.size, 
                    'angle': point.angle, 
                    'response': point.response, 
                    'octave': point.octave, 
                    'class_id': point.class_id,
                }
                kp_ser.append(temp)

            if keypoints: 
                feature_id = 'feature_' + str(uuid.uuid4())
                kps = json.dumps(kp_ser)
                bb_start = (int(self.feature_bounding_box[0]), int(self.feature_bounding_box[1]))
                bb_end = (int(self.feature_bounding_box[2]), int(self.feature_bounding_box[3]))
                match_obj = {
                    'id': feature_id,
                    'start': bb_start,
                    'origin': (0, 0),
                    'scale': 1,
                    'end': bb_end,
                    'keypoints': kps,
                    "scanner_type": "feature",
                }
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = {
                  feature_id: match_obj,
                }

        return response_obj

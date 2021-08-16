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
        self.max_allowable_distance = 15
        self.debug = False

    def find_features(self, request_data):
        response_obj = self.get_empty_t1_response_obj()
        movie_url, movie, source_movie = self.get_movie_and_source_movie(request_data)
        meta_id = list(request_data['tier_1_scanners']['feature'].keys())[0]
        feature_meta_obj = request_data['tier_1_scanners']['feature'][meta_id]

        finder = FeatureFinder()
        all_anchor_descriptor_obj = self.get_anchor_descriptors(feature_meta_obj, finder)
        for anchor_id in all_anchor_descriptor_obj: 
            anchor_kps = all_anchor_descriptor_obj[anchor_id]['keypoints']
            anchor_descriptors = all_anchor_descriptor_obj[anchor_id]['descriptors']
            anchor_bb = self.get_bounding_box_for_keypoints(anchor_kps)
            anchor_keypoints_bb_offset = (anchor_bb[0], anchor_bb[1])
            if self.debug:
                print('bounding box for anchor kps is {}'.format(anchor_bb))
            response_obj['movies'][movie_url] = {}
            response_obj['movies'][movie_url]['framesets'] = {}
            for frameset_hash in movie['framesets']:
                print(f'matching features for frameset {frameset_hash}, anchor {anchor_id}')
                image_url = source_movie['framesets'][frameset_hash]['images'][0]
                cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
                if type(cv2_image) == type(None):
                    print('error getting image for selected area')
                    continue

                keypoints, descriptors, cv2_image_with_keypoints = \
                    finder.find_features(cv2_image, feature_meta_obj.get('return_type'))

                query_all_features_bb = self.get_bounding_box_for_keypoints(keypoints)
                if self.debug:
                    print('bounding box for all query kps is {}'.format(query_all_features_bb))

                if keypoints:
                    match_object = {}
                    if feature_meta_obj.get('match_type') == 'brute_force':
                        match_object = self.try_to_match_keypoints(
                            anchor_descriptors, descriptors, cv2_image, anchor_kps, keypoints, anchor_id,
                            anchor_keypoints_bb_offset, feature_meta_obj.get('match_type')
                        )
                    if match_object:
                        if frameset_hash not in response_obj['movies'][movie_url]['framesets']:
                            response_obj['movies'][movie_url]['framesets'][frameset_hash] = {}
                        response_obj['movies'][movie_url]['framesets'][frameset_hash][match_object['id']] = match_object

        return response_obj

    def get_anchor_descriptors(self, feature_meta_object, finder):
        return_obj = {}
        for anchor in feature_meta_object.get('anchors', []):
            src_img_bytes = anchor['cropped_image_bytes_before']
            src_img = self.get_cv2_image_from_base64_string(src_img_bytes)
            keypoints, descriptors, cv2_image_with_keypoints = \
                finder.find_features(src_img, feature_meta_object.get('return_type'))
            return_obj[anchor['id']] = {
                'keypoints': keypoints, 
                'descriptors': descriptors,
            }
        return return_obj

    def get_bounding_box_for_keypoints(self, keypoints):
        bounding_box = [99999, 99999, 0, 0]
        for point in keypoints:
            if point.pt[0] < bounding_box[0]:
                bounding_box[0] = int(point.pt[0])
            if point.pt[0] > bounding_box[2]:
                bounding_box[2] = int(point.pt[0])
            if point.pt[1] < bounding_box[1]:
                bounding_box[1] = int(point.pt[1])
            if point.pt[1] > bounding_box[3]:
                bounding_box[3] = int(point.pt[1])
        return bounding_box

    def get_bounding_box_for_query_matches(self, matches, query_keypoints):
        points = []
        for match in matches[1:10]:
            points.append(query_keypoints[match.queryIdx])
        return self.get_bounding_box_for_keypoints(points)

    def try_to_match_keypoints(self, anchor_descriptors, query_descriptors, cv2_image, anchor_keypoints, 
        query_keypoints, anchor_id, anchor_keypoints_bb_offset, match_type
    ):
        return_obj = {}
        if match_type == 'brute_force':
            # create BFMatcher object
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            # match descriptors
            matches = bf.match(query_descriptors, anchor_descriptors)
        else:
            # for now we only support BF
            return {}

        # sort matches in the order of their distance.
        matches = sorted(matches, key=lambda x:x.distance)
        if len(matches) < 10:
            print('not enough keypoints matched')
            return {}
        if matches[0].distance > self.max_allowable_distance:
            print('no close enough matches')
            return {}

        # bond on the best match to get our offset
        # use the next 5 to get values for scale and distance
        query_bb = self.get_bounding_box_for_query_matches(matches[0:10], query_keypoints)
        if self.debug:
            print('bounding box for top 10 matched query kps is {}'.format(query_bb))
        total_dist = sum([match.distance for match in matches])

        for match in matches[1:10]:
            print('kp match: dist {} at query {} / anchor {}'.format(
                match.distance, query_keypoints[match.queryIdx].pt, anchor_keypoints[match.trainIdx].pt))
        # TODO should be multiplying dims by scale here
        query_keypoints_bb_offset = anchor_keypoints_bb_offset  
        query_start = (
            int(query_bb[0] - query_keypoints_bb_offset[0]),
            int(query_bb[1] - query_keypoints_bb_offset[1])
        )
        query_end = (
            int(query_bb[2] - query_keypoints_bb_offset[0]),
            int(query_bb[3] - query_keypoints_bb_offset[1])
        )

        match_obj = {
            'id': 'feature_match_' + str(uuid.uuid4()),
            'start': query_start,
            'origin': (0, 0),
            'scale': 1,
            'end': query_end,
            "scanner_type": "feature",
            "anchor_id": anchor_id,
            'top_ten_distance': total_dist,
        }
        return match_obj


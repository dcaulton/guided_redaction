import cv2
import random
import math
import imutils
import numpy as np


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = False
        self.template_match_threshold = .9
        self.match_origin_xy_tolerance = 5
        self.get_app_data()

    def sift_data(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        all_zones = {}
        return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')

        fast_pass = self.fast_pass_for_labels(ocr_results_this_frame, other_t1_results_this_frame)
        if fast_pass:
            fast_pass_confirmed = self.confirm_fast_pass(cv2_image, ocr_results_this_frame, other_t1_results_this_frame)
        if not fast_pass_confirmed:
            slow_pass_confirmed = self.slow_pass_for_labels(cv2_image, ocr_results_this_frame, other_t1_results_this_frame)
        if fast_pass_confirmed or slow_pass_confirmed:
            self.build_match_results(all_zones, return_stats, return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed)

        self.build_hardcoded_response(all_zones, return_stats)

        return all_zones, return_stats, return_mask

    def fast_pass_for_labels(self, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def confirm_fast_pass(self, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def slow_pass_for_labels(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def build_match_results(self, all_zones, return_stats, return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed):
        pass

    def build_hardcoded_response(self, all_zones, return_stats):
        one_zone = {
            'id': 'whatevs', 
            'location': (100, 115), 
            'size': (288, 45),
            'scale': 1,
            'scanner_type': 'data_sifter',
        }
        one_stat = {
            'id': 'whatevs', 
            'match_percent': 97.3,
            'text': 'Bobble Head'
        }
        all_zones[one_zone['id']] = one_zone
        return_stats[one_stat['id']] = one_stat

    def build_fast_pass_row_and_col_data(self):
        build_rows = []
        for row in self.app_data.rows:
            build_row = []
            for item_id in row:
                if items[item_id]['type'] == 'label':
                    build_row.append(items[item_id]['text'])
            build_rows.append(build_row)

        build_cols = []

        for col in self.app_data.cols:
            build_col = []
            for item_id in col:
                if items[item_id]['type'] == 'label':
                    build_col.append(items[item_id]['text'])
            build_cols.append(build_row)

        return build_rows, build_cols

    def get_app_data(self):
        self.app_data = {
            'rows': [
                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
                ['b1'],
            ],
            'cols': [
                ['a1'],
                ['a2'],
                ['a3'],
                ['a4'],
                ['a5'],
                ['a6'],
            ],
            'items': {
                'a1': {
                    'type': 'label',
                    'text': 'Details',
                },
                'a2': {
                    'type': 'label',
                    'text': 'System',
                },
                'a3': {
                    'type': 'label',
                    'text': 'User',
                },
                'a4': {
                    'type': 'label',
                    'text': 'Offsers',
                },
                'a5': {
                    'type': 'label',
                    'text': 'Beta',
                },
                'a6': {
                    'type': 'label',
                    'text': 'Subscriptions',
                },
                'b1': {
                    'type': 'label',
                    'text': 'Contact Information',
                },
            }
        }

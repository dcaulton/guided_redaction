import cv2
import random
import math
import imutils
import numpy as np


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = True
        self.template_match_threshold = .9
        self.match_origin_xy_tolerance = 5
        self.get_app_data()

    def sift_data(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        self.all_zones = {}
        self.return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')

        fast_pass_confirmed = slow_pass_confirmed = False
        fast_pass = self.fast_pass_for_labels(ocr_results_this_frame, other_t1_results_this_frame)
        if fast_pass:
            fast_pass_confirmed = self.confirm_fast_pass(fast_pass, cv2_image, ocr_results_this_frame, other_t1_results_this_frame)
        if not fast_pass_confirmed:
            slow_pass_confirmed = self.slow_pass_for_labels(cv2_image, ocr_results_this_frame, other_t1_results_this_frame)
        if fast_pass_confirmed or slow_pass_confirmed:
            self.build_match_results(return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed)

        self.add_zone_to_response((100, 115), (355, 160))

        return self.all_zones, self.return_stats, return_mask

    def fast_pass_for_labels(self, ocr_results_this_frame, other_t1_results_this_frame):
        app_rows, app_cols = self.build_fast_pass_row_and_col_data()
        row_neighbors, col_neighbors = self.quantize_rows_and_cols(ocr_results_this_frame)
        print('swords are good so are rows and cols')
        return False

    def confirm_fast_pass(self, fast_pass_match_obj, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def slow_pass_for_labels(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def build_match_results(self, return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed):
        pass

    def add_zone_to_response(self, zone_start, zone_end, comment=None):
        new_id = str(random.randint(1, 999999999))
        new_size = [
            zone_end[0] - zone_start[0],
            zone_end[1] - zone_start[1]
        ]
        one_zone = {
            'id': new_id, 
            'location': zone_start,
            'size': new_size,
            'scale': 1,
            'scanner_type': 'data_sifter',
        }
        if comment:
            one_zone['comment'] = comment
        one_stat = {
            'id': new_id,
            'match_percent': 97.3,
            'text': 'Bobble Head'
        }
        self.all_zones[one_zone['id']] = one_zone
        self.return_stats[one_stat['id']] = one_stat

    def get_app_data(self):
        self.app_data = {
            'rows': [
                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], ['b1'],
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

    def build_fast_pass_row_and_col_data(self):
        app_rows = []
        for row in self.app_data['rows']:
            app_row = []
            for item_id in row:
                if self.app_data['items'][item_id]['type'] == 'label':
                    app_row.append(self.app_data['items'][item_id]['text'])
            app_rows.append(app_row)

        app_cols = []
        for col in self.app_data['cols']:
            app_col = []
            for item_id in col:
                if self.app_data['items'][item_id]['type'] == 'label':
                    app_col.append(self.app_data['items'][item_id]['text'])
            app_cols.append(app_col)

        return app_rows, app_cols

    def quantize_rows_and_cols(self, ocr_results_this_frame):
        row_neighbors = col_neighbors = None

        row_class_count = self.count_existing_classes(ocr_results_this_frame, 'rows')
        col_class_count = self.count_existing_classes(ocr_results_this_frame, 'cols')

        return row_neighbors, col_neighbors

    def count_existing_classes(self, ocr_results_this_frame, rows_or_cols='rows'):
        existing_classes = {}
        for match_id in ocr_results_this_frame:
            match_obj = ocr_results_this_frame[match_id]
            closest_distance = 9999999
            closest_class_id = None
            for class_id in existing_classes:
                if self.is_close_enough(match_obj, existing_classes[class_id]['envelope']):
                    closest_class_id = class_id
            if closest_class_id:
                existing_class = existing_classes[closest_class_id]
                new_class_envelope = self.grow_envelope_to_accomodate(existing_class['envelope'], match_obj)
                existing_class['member_ids'].append(match_id)
                existing_class['envelope'] = new_class_envelope
            else:
                new_id = str(random.randint(1, 999999999))
                new_start = match_obj['location']
                new_end = [
                    match_obj['location'][0] + match_obj['size'][0],
                    match_obj['location'][1] + match_obj['size'][1]
                ]
                build_obj = {
                    'member_ids': [match_id],
                    'envelope': {
                        'start': new_start,
                        'end': new_end,
                    },
                }
                existing_classes[new_id] = build_obj
        if self.debug:
            # TODO embed masks of the rows and cols in statistics
            for row_class_id in existing_classes:
                self.add_zone_to_response(
                    existing_classes[row_class_id]['envelope']['start'], 
                    existing_classes[row_class_id]['envelope']['end'],
                    rows_or_cols
                )
        return len(existing_classes.keys())

    def grow_envelope_to_accomodate(self, envelope, new_ocr_obj):
        new_obj_start = new_ocr_obj['location']
        new_obj_end = [
            new_ocr_obj['location'][0] + new_ocr_obj['size'][0],
            new_ocr_obj['location'][1] + new_ocr_obj['size'][1]
        ]
        if new_obj_start[0] < envelope['start'][0]:
            envelope['start'][0] = new_obj_start[0]
        if new_obj_start[1] < envelope['start'][1]:
            envelope['start'][1] = new_obj_start[1]
        if new_obj_end[0] > envelope['end'][0]:
            envelope['end'][0] = new_obj_end[0]
        if new_obj_end[1] > envelope['end'][1]:
            envelope['end'][1] = new_obj_end[1]
        return envelope

    def is_close_enough(self, ocr_match_obj, envelope, group_type='rows'):
        ocr_start = ocr_match_obj['location']
        ocr_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        x_difference = self.get_axis_difference(ocr_start, ocr_end, envelope['start'], envelope['end'], 'x')
        y_difference = self.get_axis_difference(ocr_start, ocr_end, envelope['start'], envelope['end'], 'y')
        if group_type == 'rows':
            if y_difference > 0 or x_difference > 1000:
                return False
            return True
        else:  # group_type == 'cols':
            if x_difference > 0 or y_difference > 1000:
                return False
            return True

    def get_axis_difference(self, ocr_start, ocr_end, envelope_start, envelope_end, axis='y'):
        axis_index = 0
        if axis == 'y': 
            axis_index = 1
        if envelope_start[axis_index] <= ocr_start[axis_index] <= envelope_end[axis_index]:
            return 0   #completely enclosed vertically
        if ocr_start[axis_index] < envelope_start[axis_index]:
            if ocr_end[axis_index] >= envelope_start[axis_index]:
                return 0  # ocr starts first, but ends after the envelope starts, dist is zero
            else:
                return envelope_start[axis_index] - ocr_end[axis_index] 
        if ocr_start[axis_index] > envelope_start[axis_index]:
            if ocr_start[axis_index] <= envelope_end[axis_index]:
                return 0  # envelope starts first, the ocr starts before envelope is done
            else:
                return ocr_start[axis_index] - envelope_end[axis_index]

import random
import math
from fuzzywuzzy import fuzz
import cv2
import numpy as np
import imutils


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = mesh_match_meta.get('debug', False)
        self.get_app_data()
        self.min_vertical_overlap_pixels = 5
        self.max_column_misalign_pixels = 5
        self.min_row_horizontal_overlap_pixels = 1000
        self.min_app_score = 200
        self.fuzz_match_threshold = 70

    def sift_data(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        self.all_zones = {}
        self.return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')

        ocr_results_this_frame = self.filter_results_by_t1_bounds(ocr_results_this_frame, other_t1_results_this_frame)

        fast_pass_confirmed = slow_pass_confirmed = False
        fast_pass = self.fast_pass_for_labels(ocr_results_this_frame, other_t1_results_this_frame)
        if fast_pass:
            fast_pass_confirmed = self.confirm_fast_pass(
                fast_pass, cv2_image, ocr_results_this_frame, other_t1_results_this_frame
            )
        if not fast_pass_confirmed:
            slow_pass_confirmed = self.slow_pass_for_labels(
                cv2_image, ocr_results_this_frame, other_t1_results_this_frame
            )
        if fast_pass_confirmed or slow_pass_confirmed:
            self.build_match_results(return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed)

        self.add_zone_to_response((100, 115), (355, 160))

        return self.all_zones, self.return_stats, return_mask

    def filter_results_by_t1_bounds(self, ocr_results_this_frame, other_t1_results_this_frame):
        if other_t1_results_this_frame:
            build_ocr_results = {}
            for t1_match_id in other_t1_results_this_frame:
                t1_ele = other_t1_results_this_frame[t1_match_id]
                for ocr_ele_id in ocr_results_this_frame:
                    ocr_ele = ocr_results_this_frame[ocr_ele_id]
                    ocr_coords = ocr_ele.get('start')
                    if 'location' in ocr_ele:
                        ocr_coords = ocr_ele['location']
                        if self.point_is_in_t1_region(ocr_coords, t1_ele):
                            if ocr_ele_id not in build_ocr_results:
                                build_ocr_results[ocr_ele_id] = ocr_ele

            return build_ocr_results
        return ocr_results_this_frame

    def fast_pass_for_labels(self, ocr_results_this_frame, other_t1_results_this_frame):
        app_rows, app_cols = self.build_app_row_and_col_data()

        ocr_rows_dict = self.gather_ocr_rows(ocr_results_this_frame)
        ocr_left_cols_dict, ocr_right_cols_dict = self.gather_ocr_cols(ocr_results_this_frame)

        match_obj = self.fast_score_row_and_col_data(
            app_rows, app_cols, ocr_rows_dict, ocr_left_cols_dict, ocr_right_cols_dict, ocr_results_this_frame
        )

        if match_obj:
            print('WOOHOO, we found the app')

        else:
            print('UGH, app was not found')

        return match_obj

    def score_ocr_col_to_app_col(self, app_col, ocr_col, ocr_results_this_frame):
        total_score = 0
        base_ocr_col = 0
        for app_field_string in app_col:
            for index, match_id in enumerate(ocr_col['member_ids'][base_ocr_col:]):
                ocr_phrase = ocr_results_this_frame[match_id]['text']
                ratio = fuzz.ratio(app_field_string, ocr_phrase)
                if ratio >= self.fuzz_match_threshold:
                    total_score += ratio
                    base_ocr_col += index+1
                    break
        return total_score


    def fast_score_row_and_col_data(
        self, app_rows, app_cols, ocr_rows_dict, ocr_left_cols_dict, ocr_right_cols_dict, ocr_results_this_frame
    ):
        best_scores = {}

        sorted_keys = self.get_sorted_keys_this_group_type('left_col', ocr_rows_dict, ocr_left_cols_dict, ocr_right_cols_dict)
        left_col_bests = {}
        for left_col_id in sorted_keys:
            left_col = ocr_left_cols_dict[left_col_id]
            app_col_scores = []
            for app_col in app_cols:
                app_col_score = self.score_ocr_col_to_app_col(app_col, left_col, ocr_results_this_frame)
                app_col_scores.append(app_col_score)
            print('scores for left col are {}'.format(app_col_scores))

#    do this for left cols, right cols and rows:
#    order ocr_left_cols in ascending x
#    left_col_bests = {}
#    foreach ocr_left_col: 
#        possible_ocr_left_col_matches = {}
#        foreach app_col:
#            if cols_match(app_col, ocr_left_col):
#                possible_ocr_left_col_matches[ocr_left_col_id] = ocr_left_col
#        left_col_bests[ocr_left_col_id] = highest score entry in possible_ocr_left_col_matches
#    step through left col bests by each left col, see if we can find a highest path score
# with 3 app left cols and 6 ocr matches cols it looks like this:
#  ocr col1 [259, 0, 0]
#  ocr col2 [350, 0, 0]
#  ocr col3 [0, 179, 0]
#  ocr col4 [0, 324, 0]
#  ocr col5 [0, 0, 244]
#  ocr col6 [0, 0, 194]
# and you want to say ocr_col2, ocr_col4, ocr_col5 gives us the best overall score across all ocr and app rows


        return False

    def get_sorted_keys_this_group_type(self, group_type, ocr_rows_dict, ocr_left_cols_dict, ocr_right_cols_dict):
        if group_type == 'left_col':
            sorted_keys = sorted(ocr_left_cols_dict, key=lambda item: ocr_left_cols_dict[item]['start'][0])
        elif group_type == 'right_col':
            sorted_keys = sorted(
                ocr_right_cols_dict, 
                key=lambda item: ocr_right_cols_dict[item]['end'][0]
            )
        elif group_type == 'row':
            sorted_keys = sorted(ocr_rows_dict, key=lambda item: ocr_rows_dict[item]['start'][1])
        return sorted_keys

    def build_new_row_col_element(self, row_col_type, ocr_match_id, ocr_match_obj):
        new_id = str(random.randint(1, 999999999))
        new_start = ocr_match_obj['location']
        new_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        build_obj = {
            'id': new_id,
            'member_ids': [ocr_match_id],
            'start': new_start,
            'end': new_end,
            'row_column_type': row_col_type,
        }
        return build_obj

    def gather_ocr_cols(self, ocr_results_this_frame):
        left_cols = {}
        right_cols = {}
        sorted_ocr_keys = ocr_results_this_frame.keys()

        sorted_ocr_keys = sorted(ocr_results_this_frame, key=lambda item: ocr_results_this_frame[item]['location'][1])

        for match_id in sorted_ocr_keys:
            ocr_match_obj = ocr_results_this_frame[match_id]
            closest_left_col_id = None
            closest_right_col_id = None
            for class_id in left_cols:
                left_col = left_cols[class_id]
                if self.is_close_enough(ocr_match_obj, left_col, 'left_col'):
                    closest_left_col_id = class_id
            for class_id in right_cols:
                right_col = right_cols[class_id]
                if self.is_close_enough(ocr_match_obj, right_col, 'right_col'):
                    closest_right_col_id = class_id

            if closest_left_col_id:
                left_col = left_cols[closest_left_col_id]
                self.grow_object_to_accomodate(left_col, ocr_match_obj)
                left_col['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('left_col', match_id, ocr_match_obj)
                left_cols[new_element['id']] = new_element

            if closest_right_col_id:
                right_col = right_cols[closest_right_col_id]
                self.grow_object_to_accomodate(right_col, ocr_match_obj)
                right_col['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('right_col', match_id, ocr_match_obj)
                right_cols[new_element['id']] = new_element

        self.add_rows_cols_to_response_and_stats('left_col', left_cols)
        self.add_rows_cols_to_response_and_stats('right_col', right_cols)

        return left_cols, right_cols

    def gather_ocr_rows(self, ocr_results_this_frame):
        rows = {}
        sorted_ocr_keys = ocr_results_this_frame.keys()

        sorted_ocr_keys = sorted(ocr_results_this_frame, key=lambda item: ocr_results_this_frame[item]['location'][0])

        for match_id in sorted_ocr_keys:
            match_obj = ocr_results_this_frame[match_id]
            closest_class_id = None
            for class_id in rows:
                row = rows[class_id]
                if self.is_close_enough(match_obj, row, 'row'):
                    closest_class_id = class_id
            if closest_class_id:
                row = rows[closest_class_id]
                self.grow_object_to_accomodate(row, match_obj)
                row['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('row', match_id, match_obj)
                rows[new_element['id']] = new_element

        self.add_rows_cols_to_response_and_stats('row', rows)

        return rows

    def add_rows_cols_to_response_and_stats(self, row_col_type, existing_classes):
        build_classes = {}
        for row_class_id in existing_classes:
            build_classes[row_class_id] = {
                'start': existing_classes[row_class_id]['start'], 
                'end': existing_classes[row_class_id]['end'], 
                'ocr_member_ids': existing_classes[row_class_id]['member_ids'],
                'row_column_type': row_col_type,
            }
            if self.debug:
                self.add_zone_to_response(
                    existing_classes[row_class_id]['start'], 
                    existing_classes[row_class_id]['end'],
                    existing_classes[row_class_id]['member_ids'],
                    row_col_type,
                )

        group_name = 'undefined_35a4'
        if row_col_type == 'row': 
            group_name = 'rows'
        elif row_col_type == 'right_col': 
            group_name = 'right_columns'
        elif row_col_type == 'left_col': 
            group_name = 'left_columns'
        self.return_stats[group_name] = build_classes

    def point_is_in_t1_region(self, coords, t1_match_obj):
        start, end = self.get_match_obj_start_end(t1_match_obj)
        if start and end:
            if coords[0] >= start[0] and coords[0] <= end[0] and\
                coords[1] >= start[1] and coords[1] <= end[1]:
                return True
            return False
        return True

    def get_match_obj_start_end(self, match_obj):
        if 'start' in match_obj:
            start = match_obj['start']
        if 'location' in match_obj:
            start = match_obj['location']
        if 'end' in match_obj:
            end = match_obj['end']
        if 'size' in match_obj:
            end = [
                match_obj['location'][0] + match_obj['size'][0],
                match_obj['location'][1] + match_obj['size'][1]
            ]
        return start, end

    def confirm_fast_pass(self, fast_pass_match_obj, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def slow_pass_for_labels(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        pass

    def build_match_results(self, return_mask, cv2_image, fast_pass_confirmed, slow_pass_confirmed):
        pass

    def add_zone_to_response(self, zone_start, zone_end, ocr_member_ids=None, row_col_type=None):
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
        if ocr_member_ids:
            one_zone['ocr_member_ids'] = ocr_member_ids
        if row_col_type:
            one_zone['row_column_type'] = row_col_type
        self.all_zones[one_zone['id']] = one_zone

    def get_app_data(self):
        self.app_data = {
            'rows': [
                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 
                ['b1'],
            ],
            'cols': [
                ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
                ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
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
                'c1': {
                    'type': 'label',
                    'text': 'Email',
                },
                'c2': {
                    'type': 'label',
                    'text': 'Preferred Contact Method',
                },
                'c3': {
                    'type': 'label',
                    'text': 'Preferred Language',
                },
                'c4': {
                    'type': 'label',
                    'text': 'Mobile',
                },
                'c5': {
                    'type': 'label',
                    'text': 'Work Phone',
                },
                'c6': {
                    'type': 'label',
                    'text': 'Home Phone',
                },
                'c7': {
                    'type': 'label',
                    'text': 'Other Phone',
                },
                'd1': {
                    'type': 'label',
                    'text': 'Name',
                },
                'd2': {
                    'type': 'label',
                    'text': 'Sonos ID',
                },
                'd3': {
                    'type': 'label',
                    'text': 'Email Opt Out',
                },
                'd4': {
                    'type': 'label',
                    'text': 'Survey Opt Out',
                },
                'd5': {
                    'type': 'label',
                    'text': 'In app Messaging Opt Out',
                },
                'd6': {
                    'type': 'label',
                    'text': 'Address',
                },
                'd7': {
                    'type': 'label',
                    'text': 'User Type',
                },
                'd8': {
                    'type': 'label',
                    'text': 'Lead Source',
                },
            }
        }

    def build_app_row_and_col_data(self):
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

    def grow_object_to_accomodate(self, match_object, new_ocr_obj):
        new_obj_start = new_ocr_obj['location']
        new_obj_end = [
            new_ocr_obj['location'][0] + new_ocr_obj['size'][0],
            new_ocr_obj['location'][1] + new_ocr_obj['size'][1]
        ]
        if 'start' not in match_object:
            print('PROBLEM, were getting weird envelope vars')
        if new_obj_start[0] < match_object['start'][0]:
            match_object['start'][0] = new_obj_start[0]
        if new_obj_start[1] < match_object['start'][1]:
            match_object['start'][1] = new_obj_start[1]
        if new_obj_end[0] > match_object['end'][0]:
            match_object['end'][0] = new_obj_end[0]
        if new_obj_end[1] > match_object['end'][1]:
            match_object['end'][1] = new_obj_end[1]
        return match_object

    def is_close_enough(self, ocr_match_obj, envelope, group_type='row'):
        ocr_start = ocr_match_obj['location']
        ocr_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        if group_type == 'row':
            x_difference = self.get_axis_difference(ocr_start, ocr_end, envelope['start'], envelope['end'], 'x')
            y_overlap = self.get_vertical_overlap(ocr_start, ocr_end, envelope['start'], envelope['end'])
            if y_overlap < self.min_vertical_overlap_pixels or \
                x_difference > self.min_row_horizontal_overlap_pixels:
                return False
            return True
        elif group_type == 'left_col':
            if abs(ocr_start[0] - envelope['start'][0]) < self.max_column_misalign_pixels:
                return True
            return False
        elif group_type == 'right_col':
            if abs(ocr_end[0] - envelope['end'][0]) < self.max_column_misalign_pixels:
                return True
            return False

    def get_vertical_overlap(self, ocr_start, ocr_end, envelope_start, envelope_end):
        if ocr_end[1] <= envelope_start[1]:
            return 0 # box is above the row
        if ocr_start[1] >= envelope_end[1]:
            return 0 # box is below the row
        overlap_top = ocr_end[1] - envelope_start[1]
        overlap_bottom = envelope_end[1] - ocr_start[1]
        return max(overlap_top, overlap_bottom)

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

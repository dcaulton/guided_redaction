import cv2
import random
import math
import imutils
import numpy as np


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = mesh_match_meta.get('debug', False)
        self.template_match_threshold = .9
        self.match_origin_xy_tolerance = 5
        self.get_app_data()
        self.min_vertical_overlap_pixels = 5
        self.min_row_horizontal_overlap_pixels = 1000

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

        ocr_rows_dict = self.gather_existing_rows_cols(ocr_results_this_frame, 'rows')
        ocr_cols_dict = self.gather_existing_rows_cols(ocr_results_this_frame, 'cols')
        print('swords are good so are rows and cols')
        return False

    def build_new_row_col_elements(self, rows_or_cols, ocr_match_id, ocr_match_obj):
        return_hash = {}
        if rows_or_cols == 'rows':
            new_id = str(random.randint(1, 999999999))
            new_start = ocr_match_obj['location']
            new_end = [
                ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
                ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
            ]
            build_obj = {
                'member_ids': [ocr_match_id],
                'start': new_start,
                'end': new_end,
            }
            return_hash[new_id] = build_obj
        return return_hash

    def gather_existing_rows_cols(self, ocr_results_this_frame, rows_or_cols='rows'):
        print('DINNY gathering {}'.format(rows_or_cols))
        existing_classes = {}
        sorted_ocr_keys = ocr_results_this_frame.keys()

        if rows_or_cols == 'rows':
            sorted_ocr_keys = sorted(ocr_results_this_frame, key=lambda item: ocr_results_this_frame[item]['location'][0])
        elif rows_or_cols == 'cols':
            sorted_ocr_keys = sorted(ocr_results_this_frame, key=lambda item: ocr_results_this_frame[item]['location'][1])

        for match_id in sorted_ocr_keys:
            match_obj = ocr_results_this_frame[match_id]
            closest_distance = 9999999
            closest_class_id = None
            for class_id in existing_classes:
                row_col = existing_classes[class_id]
                if self.is_close_enough(match_obj, row_col):
                    closest_class_id = class_id
            if closest_class_id:
                existing_class = existing_classes[closest_class_id]
                self.grow_object_to_accomodate(existing_class, match_obj)
                existing_class['member_ids'].append(match_id)
            else:
                new_elements = self.build_new_row_col_elements(rows_or_cols, match_id, match_obj)
                existing_classes = {**existing_classes, **new_elements}

        build_classes = {}
        for row_class_id in existing_classes:
            build_classes[row_class_id] = {
                'start': existing_classes[row_class_id]['start'], 
                'end': existing_classes[row_class_id]['end'], 
                'ocr_member_ids': existing_classes[row_class_id]['member_ids'],
                'row_or_column': rows_or_cols,
            }
            if self.debug:
                self.add_zone_to_response(
                    existing_classes[row_class_id]['start'], 
                    existing_classes[row_class_id]['end'],
                    existing_classes[row_class_id]['member_ids'],
                    rows_or_cols,
                )

        self.return_stats[rows_or_cols] = build_classes
            
        return existing_classes

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

    def add_zone_to_response(self, zone_start, zone_end, ocr_member_ids=None, row_or_column=None):
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
        if row_or_column:
            one_zone['row_or_column'] = row_or_column
        self.all_zones[one_zone['id']] = one_zone

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

    def is_close_enough(self, ocr_match_obj, envelope, group_type='rows'):
        ocr_start = ocr_match_obj['location']
        ocr_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        x_difference = self.get_axis_difference(ocr_start, ocr_end, envelope['start'], envelope['end'], 'x')
        y_overlap = self.get_vertical_overlap(ocr_start, ocr_end, envelope['start'], envelope['end'])
        if group_type == 'rows':
            if y_overlap < self.min_vertical_overlap_pixels or \
                x_difference > self.min_row_horizontal_overlap_pixels:
                return False
            return True
        else:  # group_type == 'cols':
            # TODO: this needs consider left/right alignment
            #    vertical separation/overlap isn't as much of a concern as it is for rows
            if x_difference > 0 or y_difference > 1000:
                return False
            return True

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

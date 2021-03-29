import random
import math
import cv2
import numpy as np
import imutils

class OcrRowColMaker:

    def __init__(self):
        self.debug = False
        self.min_vertical_overlap_pixels = 5
        self.max_column_misalign_pixels = 15
        self.min_row_horizontal_overlap_pixels = 1000
        
    def gather_ocr_cols(self, ocr_results_this_frame):
        left_cols = {}
        right_cols = {}

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

        return rows

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

    def get_sorted_keys_for_ocr_rowcols(self, group_type, ocr_row_or_col_dict):
        if group_type == 'left_col':
            sorted_keys = sorted(ocr_row_or_col_dict, key=lambda item: ocr_row_or_col_dict[item]['start'][0])
        elif group_type == 'right_col':
            sorted_keys = sorted(
                ocr_row_or_col_dict,
                key=lambda item: ocr_row_or_col_dict[item]['end'][0]
            )
        elif group_type == 'row':
            sorted_keys = sorted(ocr_row_or_col_dict, key=lambda item: ocr_row_or_col_dict[item]['start'][1])
        return sorted_keys

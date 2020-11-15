import cv2
import uuid
import matplotlib.pyplot as plt
import random
import math
import imutils
import numpy as np


class SelectionGrower:

    def __init__(self, sg_meta):
        self.selection_grower_meta = sg_meta
        self.debug = self.selection_grower_meta['debug']
        self.alignment_tolerance = 10
        self.hist_grid_size = 10
        self.row_column_threshold = 4

    def grow_selection(self, tier_1_match_data, cv2_image):
        match_obj = {}
        match_stats = {}

        selected_area = {}
        ocr_match_objs = {}
        for match_key in tier_1_match_data:
            if tier_1_match_data[match_key]['scanner_type'] != 'ocr':
                selected_area = tier_1_match_data[match_key]
            else:
                ocr_match_objs[match_key] = tier_1_match_data[match_key]

        if self.selection_grower_meta['capture_grid'] and ocr_match_objs:
            grid_results, grid_stats = self.capture_grid(selected_area, ocr_match_objs, cv2_image)
            if grid_results:
                for gr_key in grid_results:
                    match_obj[gr_key] = grid_results[gr_key]
            if grid_stats:
                match_stats['grid_capture'] = grid_stats

        return match_obj, match_stats

    def capture_grid(self, selected_area, ocr_match_objs, cv2_image):
        new_areas = {}
        statistics = {}
        for growth_direction in ['south', 'west']:
            if not self.selection_grower_meta['directions'][growth_direction]:
                continue
            statistics[growth_direction] = {}
            growth_roi = self.build_roi(growth_direction, selected_area, cv2_image)
            ocr_matches_in_zone = self.filter_by_region(ocr_match_objs, growth_roi)
            ocr_matches_on_grid = self.find_points_on_grid(ocr_matches_in_zone)
            self.save_friends(ocr_matches_on_grid, statistics, growth_direction)
            hist_x, hist_y = self.build_position_histograms(ocr_matches_on_grid)
            grid_x_values = []
            grid_y_values = []
            for index, hist_val in enumerate(hist_x):
                if hist_val >= self.row_column_threshold:
                    x_pos = index * self.hist_grid_size
                    grid_x_values.append(x_pos)
            for index, hist_val in enumerate(hist_y):
                if hist_val >= self.row_column_threshold:
                    y_pos = index * self.hist_grid_size
                    grid_y_values.append(y_pos)
            first_y, last_y = self.gather_clustered_y_rows(grid_y_values)
            statistics[growth_direction]['x_captured_grid_values'] = grid_x_values
            statistics[growth_direction]['y_captured_grid_values'] = grid_y_values
            statistics[growth_direction]['x_hist'] = hist_x.tolist()
            statistics[growth_direction]['y_hist'] = hist_y.tolist()
            if grid_x_values and last_y - first_y:
                new_area = self.build_new_area(growth_direction, selected_area, grid_x_values, first_y, last_y)
                new_areas[new_area['id']] = new_area
                statistics[growth_direction]['roi'] = new_area
        return new_areas, statistics

    def save_friends(self, ocr_matches_on_grid, statistics, growth_direction):
        for match_id in ocr_matches_on_grid:
            if 'friends' not in statistics[growth_direction]:
                statistics[growth_direction]['friends'] = []
            match_obj = ocr_matches_on_grid[match_id]
            build_obj = (
                match_obj['location'],
                (
                    match_obj['location'][0] + match_obj['size'][0],
                    match_obj['location'][1] + match_obj['size'][1]
                )
            )
            statistics[growth_direction]['friends'].append(build_obj)

    def build_new_area(self, growth_direction, selected_area, grid_x_values, first_y, last_y):
        if growth_direction == 'south': 
            start_y_value = first_y
            if first_y > selected_area['location'][1] + selected_area['size'][1]:
                start_y_value = selected_area['location'][1] + selected_area['size'][1]
            new_area = {
                'scanner_type': 'selection_grower',
                'id': 'selection_grower_' + str(random.randint(1, 999999999)),
                'scale': 1,
                'location': [
                    grid_x_values[0],
                    start_y_value
                ],
                'size': [
                    grid_x_values[-1] - grid_x_values[0],
                    last_y - start_y_value,
                ],
            }
            return new_area
                    
    def gather_clustered_y_rows(self, grid_y_values):
        step_values = {}
        prev_val = 0
        for val in grid_y_values:
            diff = val - prev_val
            if diff:
                if (diff-10) in step_values:
                    diff = diff-10
                elif (diff+10) in step_values:
                    diff = diff+10
                if diff not in step_values:
                    step_values[diff] = {'first_location': val-diff, 'count': 0}
                # TODO if there is a hit at one 'diff' above, that is we want contiguous
                step_values[diff]['count'] += 1
            prev_val = val
        max_count = 0
        max_value = 0
        max_y_position = 0
        for step_value_key in step_values:
            step_value = step_values[step_value_key]
            if step_value['count'] > max_count:
                max_count = step_value['count']
                max_y_position = step_value['first_location']
                max_value = step_value_key
        first_y = max_y_position
        last_y = max_y_position + ((max_count+1) * max_value)
        return first_y, last_y

    def build_position_histograms(self, ocr_matches):
        x_left_vals = [ocr_matches[key]['location'][0] for key in ocr_matches]
        x_right_vals = [
            ocr_matches[key]['location'][0] + ocr_matches[key]['size'][0] for key in ocr_matches
        ]
        x_vals = x_left_vals + x_right_vals
        num_x_bins = math.ceil(max(x_vals) / self.hist_grid_size)
        x_bins_list = list(range(0, self.hist_grid_size*(num_x_bins + 1), self.hist_grid_size))
        x_hist, bin_edges = np.histogram(x_vals, x_bins_list)
        y_vals = [ocr_matches[key]['location'][1] for key in ocr_matches]
        num_y_bins = math.ceil(max(y_vals) / self.hist_grid_size)
        y_bins_list = list(range(0, self.hist_grid_size*(num_y_bins + 1), self.hist_grid_size))
        y_hist, bin_edges = np.histogram(y_vals, y_bins_list)
#        if self.debug:
#            plt.hist(x_vals, bins=num_x_bins+1)
#            plt.title("x Histogram")
#            plt.savefig('/Users/dcaulton/Desktop/x_hist.png')
#            plt.hist(y_vals, bins=num_y_bins+1)
#            plt.title("y Histogram")
#            plt.savefig('/Users/dcaulton/Desktop/y_hist.png')
        return x_hist, y_hist

    def find_points_on_grid(self, ocr_matches_in_zone):
        build_obj = {}
        for source_key in ocr_matches_in_zone:
            source_obj = ocr_matches_in_zone[source_key]
            source_x_end = source_obj['location'][0] + source_obj['size'][0]
            x_start_matched = False
            x_end_matched = False
            y_matched = False
            for target_key in ocr_matches_in_zone:
                if source_key == target_key:
                    continue
                target_obj = ocr_matches_in_zone[target_key]
                start_x_diff = abs(target_obj['location'][0] - source_obj['location'][0])
                if start_x_diff < self.alignment_tolerance:
                    x_start_matched = True
                y_diff = abs(target_obj['location'][1] - source_obj['location'][1])
                if y_diff < self.alignment_tolerance:
                    y_matched = True
                target_x_end = target_obj['location'][0] + target_obj['size'][0]
                if abs(target_x_end - source_x_end) < self.alignment_tolerance:
                    x_end_matched = True
                if y_matched and (x_start_matched or x_end_matched): 
                    build_obj[source_key] = source_obj
                    continue

        return build_obj

    def filter_by_region(self, ocr_match_objs, roi):
        build_obj = {}
        for key in ocr_match_objs:
            ocr_match_obj = ocr_match_objs[key]
            ocr_start = ocr_match_obj['location']
            ocr_end = [
                ocr_start[0] + ocr_match_obj['size'][0],
                ocr_start[1] + ocr_match_obj['size'][1]
            ]
            if roi['start'][0] <= ocr_start[0] <= roi['end'][0] and \
                roi['start'][1] <= ocr_start[1] <= roi['end'][1] and \
                roi['start'][0] <= ocr_end[0] <= roi['end'][0] and \
                roi['start'][1] <= ocr_end[1] <= roi['end'][1]:
                build_obj[key] = ocr_match_obj
        return build_obj
    
    # FOR NOW THIS IS ONLY SUPPORTED FOR SOUTH AND WEST GRID CAPTURE
    def build_roi(self, direction, selected_area, cv2_image):
        top_left = bottom_right = (0, 0)
        width, height = cv2_image.shape[1], cv2_image.shape[0]
        if 'location' in selected_area:
            start_coords = selected_area['location']
            end_coords = [
                selected_area['location'][0] + selected_area['size'][0],
                selected_area['location'][1] + selected_area['size'][1]
            ]
        if direction == 'south': 
           top_left = [
               start_coords[0] - int(self.selection_grower_meta['offsets']['west']),
               end_coords[1]
           ]
           bottom_right = [
               end_coords[0] + int(self.selection_grower_meta['offsets']['east']),
               height
           ]
        if direction == 'west': 
           top_left = [
               end_coords[0],
               start_coords[1] - int(self.selection_grower_meta['offsets']['north'])
           ]
           bottom_right = [
               width,
               end_coords[1] + int(self.selection_grower_meta['offsets']['south'])
           ]

        return {
            'start': top_left,
            'end': bottom_right
        }

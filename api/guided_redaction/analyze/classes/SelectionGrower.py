import cv2
import base64
import uuid
import matplotlib.pyplot as plt
import random
import math
import imutils
import numpy as np


class SelectionGrower:

    def __init__(self, sg_meta):
        self.selection_grower_meta = sg_meta
#        self.debug = self.selection_grower_meta['debug']
        self.debug = True
        self.alignment_tolerance = 10
        self.hist_grid_size = 10
        self.row_column_threshold = int(self.selection_grower_meta['row_column_threshold'])

    def grow_selection(self, tier_1_match_data, cv2_image):
        match_obj = {}
        match_stats = {}

        ocr_match_objs = {}
        template_match_objs = {}
        for match_key in tier_1_match_data:
            if tier_1_match_data[match_key]['scanner_type'] in ['selected_area', 'selection_grower']:
                selected_area = tier_1_match_data[match_key]
            if tier_1_match_data[match_key]['scanner_type'] == 'ocr':
                ocr_match_objs[match_key] = tier_1_match_data[match_key]
            if tier_1_match_data[match_key]['scanner_type'] == 'template':
                template_match_objs[match_key] = tier_1_match_data[match_key]
        if not selected_area:
            return match_obj, match_stats

        if self.selection_grower_meta['usage_mode'] == 'capture_grid' and ocr_match_objs:
            match_obj, match_stats['grid_capture'] = \
                self.capture_grid(selected_area, ocr_match_objs, cv2_image)
        elif self.selection_grower_meta['usage_mode'] == 'color_projection':
            match_obj, match_stats['color_projection'] = self.project_colors(selected_area, cv2_image)
        elif self.selection_grower_meta['usage_mode'] == 'template_capture' and template_match_objs:
            match_obj, match_stats['template_capture'] = \
                self.capture_template(selected_area, template_match_objs, cv2_image)

        return match_obj, match_stats

    def capture_template(self, selected_area, template_match_objs, cv2_image):
        statistics = {}
        matches = {}
        for growth_direction in ['south', 'east']:
            if self.selection_grower_meta['direction'] != growth_direction:
                continue
            statistics[growth_direction] = {}
            growth_roi = self.build_roi(growth_direction, selected_area, cv2_image)

            sg_match = self.extend_selected_area_to_eligible_template(
                selected_area, 
                template_match_objs, 
                growth_direction, 
                growth_roi,
                statistics[growth_direction]
            )

            if sg_match:
                matches[sg_match['id']] = sg_match
        return matches, statistics

    def extend_selected_area_to_eligible_template(
        self, 
        selected_area, 
        template_match_objs, 
        growth_direction, 
        growth_roi,
        stats_this_direction
    ):
        for tmo_key in template_match_objs:
            tmo = template_match_objs[tmo_key]
            if self.object_overlaps_roi(tmo, growth_roi):
                tmo_end = [
                    tmo['location'][0] + tmo['size'][0],
                    tmo['location'][1] + tmo['size'][1]
                ]
                sg_match = self.extend_selected_area_to_box(
                    selected_area, 
                    tmo['location'], 
                    tmo_end, 
                    growth_direction, 
                    growth_roi,
                    stats_this_direction
                )
                return sg_match


    def object_overlaps_roi(self, mo, roi):
        mo_end = [
            mo['location'][0] + mo['size'][0],
            mo['location'][1] + mo['size'][1]
        ]
        mo_start = mo['location']
        if mo_start[0] <= roi['end'][0] and \
            mo_start[1] <= roi['end'][1] and \
            mo_end[0] >= roi['start'][0] and \
            mo_end[1] >= roi['start'][1]:
            return True

    def extend_selected_area_to_box(
            self, 
            selected_area, 
            box_start,
            box_end,
            direction, 
            growth_roi,
            stats_this_direction
        ):
        # TODO set endpoint smart for partial roi overlaps
        print('ponch expanding to box')
        if direction == 'south':
            if self.selection_grower_meta['merge_response']:
                start_y_value = selected_area['location'][1]
            else:
                start_y_value = selected_area['location'][1] + selected_area['size'][1]
            end_y_value = box_end[1]
            start_x_value = selected_area['location'][0]
            end_x_value = selected_area['location'][0] + selected_area['size'][0]
            stats_this_direction['template_match_coords'] = [box_start, box_end]
            new_area = {
                'scanner_type': 'selection_grower',
                'id': 'selection_grower_' + str(random.randint(1, 999999999)),
                'scale': 1,
                'location': [
                    start_x_value,
                    start_y_value
                ],
                'size': [
                    end_x_value - start_x_value,
                    end_y_value - start_y_value
                ],
            }
            return new_area
        elif direction == 'east':
            if self.selection_grower_meta['merge_response']:
                start_x_value = selected_area['location'][0]
            else:
                start_x_value = selected_area['location'][0] + selected_area['size'][0]
            end_x_value = box_end[0]
            start_y_value = selected_area['location'][1]
            end_y_value = selected_area['location'][1] + selected_area['size'][1]
            stats_this_direction['template_match_coords'] = [box_start, box_end]
            new_area = {
                'scanner_type': 'selection_grower',
                'id': 'selection_grower_' + str(random.randint(1, 999999999)),
                'scale': 1,
                'location': [
                    start_x_value,
                    start_y_value
                ],
                'size': [
                    end_x_value - start_x_value,
                    end_y_value - start_y_value
                ],
            }
            return new_area

    def build_new_area(self, growth_direction, selected_area, grid_x_values, first_y, last_y):
        if growth_direction == 'south': 
            start_y_value = first_y
            if first_y < selected_area['location'][1] + selected_area['size'][1] or \
                self.selection_grower_meta['tie_grid_to_selected_area']:
                start_y_value = selected_area['location'][1] + selected_area['size'][1]
            if self.selection_grower_meta['merge_response']:
                start_y_value = selected_area['location'][1]

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

            

    def get_base64_image_string(self, cv2_image):
        image_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
        image_base64 = base64.b64encode(image_bytes)
        image_base64_string = image_base64.decode('utf-8')
        return image_base64_string

    def project_colors(self, selected_area, cv2_image):
        statistics = {'color_masks': {}}
        src_copy = cv2_image.copy()
        for growth_direction in ['south', 'east']:
            if self.selection_grower_meta['direction'] != growth_direction:
                continue
            statistics['color_masks'][growth_direction] = {}
            growth_roi = self.build_roi(growth_direction, selected_area, cv2_image)
            src_copy = src_copy[
                growth_roi['start'][1]:growth_roi['end'][1],
                growth_roi['start'][0]:growth_roi['end'][0]
            ]

            size = (
                growth_roi['end'][1] - growth_roi['start'][1],
                growth_roi['end'][0] - growth_roi['start'][0],
                3
            )
            all_color_mask = np.zeros(src_copy.shape[:2], np.uint8)

            for color_key in self.selection_grower_meta['colors']:
                color = self.selection_grower_meta['colors'][color_key]
                low_bgr_val = (
                    color['low_value'][2],
                    color['low_value'][1],
                    color['low_value'][0]
                )
                high_bgr_val = (
                    color['high_value'][2],
                    color['high_value'][1],
                    color['high_value'][0]
                )
                mask2 = cv2.inRange(src_copy, low_bgr_val, high_bgr_val) 
                if self.debug:
                    img_string = self.get_base64_image_string(mask2)
                    statistics['color_masks'][growth_direction][color_key] = img_string
                all_color_mask = cv2.bitwise_or(all_color_mask, mask2)
 
            if self.debug:
                img_string = self.get_base64_image_string(all_color_mask)
                statistics['color_masks'][growth_direction]['all'] = img_string

            build_regions = self.build_regions_from_mask(
                growth_direction, 
                all_color_mask, 
                src_copy,
                statistics
            )
            for region_key in build_regions:
                build_regions[region_key]['location'] = [
                    build_regions[region_key]['location'][0] + selected_area['location'][0] + selected_area['size'][0],
                    build_regions[region_key]['location'][1] + selected_area['location'][1]
                ]


        return build_regions, statistics

    def build_regions_from_mask(self, growth_direction, all_color_mask, src_copy, stats):
        regions = {}
        if self.selection_grower_meta['region_build_mode'] == 'near_flood':
            if growth_direction == 'east':
                start_point = (
                    math.floor(src_copy.shape[1] * .5),
                    0
                )
                all_color_3 = np.ones((all_color_mask.shape[0], all_color_mask.shape[1], 3), np.uint8) * 255
                masked = cv2.bitwise_and(all_color_3, all_color_3, mask=all_color_mask)
                x = cv2.floodFill(masked, None, start_point, (0, 255, 0))
                flood_filled_img = x[1]

                low_green = hi_green = np.array([0, 255, 0])
                mask = cv2.inRange(flood_filled_img, low_green, hi_green)
                cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cnts = imutils.grab_contours(cnts)
                left_edge_cnts = [cnt for cnt in cnts if cv2.boundingRect(cnt)[0] == 0]
                if len(left_edge_cnts) == 0:
                    return regions

                biggest_contour = max(left_edge_cnts, key=cv2.contourArea)
                (box_x, box_y, box_w, box_h) = cv2.boundingRect(biggest_contour)
                rect = ((box_x, box_y), (box_x + box_w, box_y + box_h))
                the_id = 'selection_grower_' + str(random.randint(1, 999999999))
                build_obj = {
                    'scanner_type': 'selection_grower',
                    'id': the_id,
                    'scale': 1,
                    'location': (box_x, box_y),
                    'size': (box_w, box_h),
                }
                if self.debug:
                    cv2.rectangle(
                        flood_filled_img,
                        (box_x, box_y),
                        (box_x + box_w, box_y + box_h),
                        (0, 0, 255),
                        -1
                    )
                    img_string = self.get_base64_image_string(flood_filled_img)
                    if 'flood_fill' not in stats:
                        stats['flood_fill'] = {}
                    if 'source_location' not in stats:
                        stats['source_location'] = {}
                    if growth_direction not in stats['flood_fill']:
                        stats['flood_fill'][growth_direction] = img_string
                        stats['source_location'][growth_direction] = (box_x, box_y)
                regions[the_id] = build_obj
        if self.selection_grower_meta['region_build_mode'] == 'furthest_edge':
            if growth_direction == 'east':
                cnts = cv2.findContours(all_color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cnts = imutils.grab_contours(cnts)

                furthest_east = 0
                furthest_south = 0
                for cnt in cnts:
                    if type(cnt) != type(None) and \
                        cv2.contourArea(cnt) >= int(self.selection_grower_meta['min_num_pixels']):
                        (box_x, box_y, box_w, box_h) = cv2.boundingRect(cnt)
                        (x, y, w, h) = cv2.boundingRect(cnt)
                        if x + w > furthest_east:
                            furthest_east = x + w
                        if y + h > furthest_south:
                            furthest_south = y + h
                if furthest_east > 0:
                    the_id = 'selection_grower_' + str(random.randint(1, 999999999))
                    build_obj = {
                        'scanner_type': 'selection_grower',
                        'id': the_id,
                        'scale': 1,
                        'location': (x, y),
                        'size': (furthest_east-x, furthest_south-y),
                    }
                    regions[the_id] = build_obj
        if self.selection_grower_meta['region_build_mode'] == 'contours':
            # this is an exception to how SG works.  I really want to have it return just one area - 
            #   the 'growth' of the selection.   But in this case it's broken down into several, each one
            #   matching a contour
            if growth_direction == 'east':
                cnts = cv2.findContours(all_color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cnts = imutils.grab_contours(cnts)

                for cnt in cnts:
                    if type(cnt) != type(None) and \
                        cv2.contourArea(cnt) >= int(self.selection_grower_meta['min_num_pixels']):
                        (box_x, box_y, box_w, box_h) = cv2.boundingRect(cnt)
                        (x, y, w, h) = cv2.boundingRect(cnt)
                        the_id = 'selection_grower_' + str(random.randint(1, 999999999))
                        build_obj = {
                            'scanner_type': 'selection_grower',
                            'id': the_id,
                            'scale': 1,
                            'location': (x, y),
                            'size': (w, h),
                        }
                        regions[the_id] = build_obj


        # if region_build_mode == 'near_flood':
        #   if any pixel on the edge towards the selected area is white, start with that point
        #   do a flood fill from that point
        #   take the far right edge of what comes back
        # if region_build_mode == 'furthest_edge':
        #   start from the right edge, still gotta figure this out exactly
        # if region_build_mode == 'contours':
        #   erode and blur all color_mask
        #   take the contours on the result, 
        #   return anything bigger than say 25 pixels of area
        return regions

    def capture_grid(self, selected_area, ocr_match_objs, cv2_image):
        new_areas = {}
        statistics = {}
        for growth_direction in ['south', 'east']:
            if self.selection_grower_meta['direction'] != growth_direction:
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
            statistics[growth_direction]['outer_roi'] = growth_roi
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
            if first_y < selected_area['location'][1] + selected_area['size'][1] or \
                self.selection_grower_meta['tie_grid_to_selected_area']:
                start_y_value = selected_area['location'][1] + selected_area['size'][1]
            if self.selection_grower_meta['merge_response']:
                start_y_value = selected_area['location'][1]

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
        if not ocr_matches:
            return np.array([]), np.array([])
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
                if y_matched or (x_start_matched or x_end_matched): 
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
        if direction == 'east': 
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

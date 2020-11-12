import cv2
import random
import math
import imutils
import numpy as np


class SelectionGrower:

    def __init__(self, sg_meta):
        self.selection_grower_meta = sg_meta
        self.debug = False

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

        if self.selection_grower_meta['capture_grid']:
            grid_results = self.capture_grid(selected_area, ocr_match_objs, cv2_image)

        return match_obj, match_stats

    def capture_grid(self, selected_area, ocr_match_objs, cv2_image):
        print('capturing grid baby', self.selection_grower_meta)
        for growth_direction in ['north', 'south', 'east', 'west']:
            if not self.selection_grower_meta['directions'][growth_direction]:
                continue
            growth_roi = self.build_roi(growth_direction, selected_area, cv2_image)
            print('roi zone is {} {}'.format(growth_roi['start'], growth_roi['end']))
            relevant_ocr_matches = self.filter_by_region(ocr_match_objs, growth_roi)
            print('{} ocr matches reduced to {}'.format(len(ocr_match_objs), len(relevant_ocr_matches)))
# build the zones of interest:
#    take the selected area, add n-s-e-w offsets, 
#    you now have four Zones, one for each direction from the selected area, 
# for each zone:
#    filter ocr matches to just those for that zone
#    for each ocr match:
#      quantize to columns and rows on both top left and top right
#      ^^ might be easiest to approach this as taking histograms for x and y.  
#         very popular values/buckets mark points in the grid
#      
#    review the columns and rows, return a bounding box to add to the selected area if appropriate
# add all the zone bounding boxes to the selected area, return the new selected area(s)
#    if you can grow a selected area in just one direction and keep it one entity, do that!
#      only add on more match objects/selected areas when you get the unfolding cardboard box problem.
#
# return enough statistics to be able to build the histogram of x and y, for each zone considered
#
#
#
#build_data = {}
#scan all ocr points, make a record of which x and y values are used
#for each ocr match point:
#    if it shares an x value within tolerance for at least one other point:
#        if it shares a y value within tolerance for at least one other point:
#            add its x and y values to the x and y histograms
#for each row of the x and y histograms:
#    if its greater than grid_histogram_threshold:
#        if its a row and (either the first row or there is another row within table_row_max_spacing)
#            add a row to build_data
#        if its a col  
#            add a col to build_data
#take the box defined by the rows and cols, return the bounding box for the captured grid
#
# actaully, after you see some repeating elements in the histogram, use them to define what's too far.  Say 
#  nothing more than two table rows/cols away is real data.


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
        elif 'start' in selected_area:
            start_coords = selected_area['start']
            end_coords = selected_area['end']
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

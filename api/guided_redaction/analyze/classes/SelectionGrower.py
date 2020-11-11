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
            grid_results = self.capture_grid(selected_area, ocr_match_objs)

        return match_obj, match_stats

    def capture_grid(self, selected_area, ocr_match_objs):
        print('capturing grid baby')
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




import imutils
import os
import glob
import numpy as np
import sys
np.set_printoptions(threshold=sys.maxsize)
import math
import cv2


class TextEraser:
    def __init__(self, redact_rule):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.xy_kernel = np.ones((3,3), np.uint8)
        # these help to make color partitioning less brittle, 
        # bucket closeness thresh allows us to sense a little beyond the colors 
        # spanned by the top 20 or so hitter colors on the histogram, grouped
        self.range_below_extra_padding = 10
        self.range_above_extra_padding = 10
        self.num_of_colors_from_histogram = 20

        if redact_rule and \
            'replace_with' in redact_rule and \
            redact_rule['replace_with'] in \
                ['eroded', 'edge_partitioned', 'color_partitioned']:
            self.replace_with = redact_rule['replace_with']
        else:
            self.replace_with = 'eroded'

        if redact_rule and \
            'erode_iterations' in redact_rule:
            self.erode_iterations = int(redact_rule['erode_iterations'])
        else:
            self.erode_iterations = 13

        if redact_rule and \
            'bucket_closeness' in redact_rule:
            self.bucket_closeness_threshold = int(redact_rule['bucket_closeness'])
        else:
            self.bucket_closeness_threshold = 100

        if redact_rule and \
            'min_contour_area' in redact_rule:
            self.min_contour_area= int(redact_rule['min_contour_area'])
        else:
            self.min_contour_area = 400

        if redact_rule and \
            'preserve_hlines' in redact_rule:
            if redact_rule['preserve_hlines'] == 'yes': 
                self.preserve_hlines = True
            else:
                self.preserve_hlines = False
        else:
            self.preserve_hlines = True

    def mask_all_regions(self, source, regions_to_mask):
        output = source.copy()
        for masking_region in regions_to_mask:
            self.process_one_region(output, masking_region)
        return output

    def process_one_region(self, output, masking_region):
        roi_copy = output.copy()[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ]
        bg_color = self.get_background_color(roi_copy)
        if self.replace_with == 'eroded': 
            zoned_source = self.build_eroded_source_image(roi_copy, bg_color, debug=False)
        elif self.replace_with == 'edge_partitioned': 
            zoned_source = self.build_edge_partitioned_source_image(roi_copy, bg_color)
        elif self.replace_with == 'color_partitioned': 
            zoned_source = self.build_color_partitioned_source_image(roi_copy)

        if self.preserve_hlines:
            hlines_thresh = self.get_horizontal_line_mask(roi_copy)
            hlines_thresh = cv2.cvtColor(hlines_thresh, cv2.COLOR_BGR2GRAY)
            hlines_contours = cv2.findContours(
                hlines_thresh,
                cv2.RETR_LIST,
                cv2.CHAIN_APPROX_SIMPLE
            )
            hlines_contours = imutils.grab_contours(hlines_contours)
            hlines_contours = \
                self.filter_hline_contours(hlines_contours, masking_region, debug=False)

            self.draw_hline_contours_with_color(zoned_source, hlines_contours, roi_copy, bg_color)

        output[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ] = zoned_source

    def build_color_partitioned_source_image(self, source):
        build_img = source.copy()
        hist = cv2.calcHist(
            [source],
            [0, 1, 2],
            None,
            [32, 32, 32],
            [0, 256, 0, 256, 0, 256]
        )
        source_num_pixels = source.shape[0] * source.shape[1]
        popular_colors = self.group_colors(hist, source_num_pixels)

        build_img = source.copy()
        for index, color_key in enumerate(popular_colors.keys()):
            color_data = popular_colors[color_key]
            print('processing color {} - {}'.format(index, color_data))
            color_mask = cv2.inRange(
                source, 
                color_data['lower_bgr_color'], 
                color_data['upper_bgr_color']
            )

            color_mask = cv2.dilate(
                color_mask, 
                self.xy_kernel, 
                iterations=3
            )
            color_mask = cv2.erode(
                color_mask, 
                self.xy_kernel, 
                iterations=3
            )

            color_contours = cv2.findContours(
                color_mask,
                cv2.RETR_LIST,
                cv2.CHAIN_APPROX_SIMPLE
            )
            color_contours = imutils.grab_contours(color_contours)
            filtered_color_contours = \
                self.filter_color_partition_contours(color_contours)

            cv2.drawContours(
                build_img, 
                filtered_color_contours, 
                -1, 
                color_data['avg_bgr_color'], 
                -1
            )

        return build_img

    def filter_color_partition_contours(self, color_contours):
        filtered_contours = []
        for contour in color_contours:
            area = cv2.contourArea(contour)
            if area >= self.min_contour_area:
                filtered_contours.append(contour)
        return filtered_contours

    def group_colors(self, hist, source_num_pixels):
        min_num_pixels = math.floor(source_num_pixels * .01)
        flat_hist = hist.flatten()
        range_number = -1 * self.num_of_colors_from_histogram
        indices = np.argpartition(flat_hist, range_number)[range_number:]
        big_enough_indices = [i for i in indices if flat_hist[i] > min_num_pixels]
        histogram_winners = np.vstack(np.unravel_index(big_enough_indices, hist.shape)).T
        # what these are is an array of 5 things, the last is the biggest
        # each thing has the three buckets, so 
        # [22 25 12] = COLOR [(21*8+4), (24*4+4), (11*8+4)]
        #   = [172 196 92], and it's plus or minus 4 on all three of those

        reduced = {}
        for index, bucket_loc in enumerate(histogram_winners):
            hist_val = hist[bucket_loc[0]][bucket_loc[1]][bucket_loc[2]]
            bucket_key = '{}-{}-{}'.format(bucket_loc[0], bucket_loc[1], bucket_loc[2])
            print('{} - {} - {} : {}'.format(index, bucket_key, bucket_loc, hist_val))

            if index == 0:
                print('   adding to first bucket')
                build_obj = {
                    'bucket_locs': [bucket_loc],
                    'avg_loc': bucket_loc,
                    'num_pixels': hist_val,
                }
                reduced[bucket_key] = build_obj
                continue
            added_to_existing_key = False
            for tk in reduced.keys():
                if self.buckets_are_close_enough(bucket_loc, reduced[tk]['avg_loc']):
                    num_pixels = reduced[tk]['num_pixels'] + hist_val
                    reduced[tk]['num_pixels'] = num_pixels
                    reduced[tk]['bucket_locs'].append(bucket_loc)
                    reduced[tk]['avg_loc'] = \
                        self.calc_average_bucket_loc(reduced[tk]['bucket_locs'])
                    added_to_existing_key = True
                    print('   adding to key {}'.format(tk))
                    break
            if not added_to_existing_key:
                print('   making a new bucket')
                build_obj = {
                    'bucket_locs': [bucket_loc],
                    'avg_loc': bucket_loc,
                    'num_pixels': hist_val,
                }
                reduced[bucket_key] = build_obj

        for bucket_key in reduced:
            avg_bgr_color = \
                self.get_color_for_bucket_coords(reduced[bucket_key]['avg_loc'])
            reduced[bucket_key]['avg_bgr_color'] = avg_bgr_color
            reduced[bucket_key]['color_range'] = \
            bgr_range = \
                self.get_color_range_for_buckets(reduced[bucket_key])
            reduced[bucket_key]['color_range'] = bgr_range
            lower_bgr_color = (
              max(0, avg_bgr_color[0] - bgr_range[0] - self.range_below_extra_padding),
              max(0, avg_bgr_color[1] - bgr_range[1] - self.range_below_extra_padding),
              max(0, avg_bgr_color[2] - bgr_range[2] - self.range_below_extra_padding)
            )
            upper_bgr_color = (
              min(255, avg_bgr_color[0] + bgr_range[0] + self.range_above_extra_padding),
              min(255, avg_bgr_color[1] + bgr_range[1] + self.range_above_extra_padding),
              min(255, avg_bgr_color[2] + bgr_range[2] + self.range_above_extra_padding)
            )
            reduced[bucket_key]['lower_bgr_color'] = lower_bgr_color
            reduced[bucket_key]['upper_bgr_color'] = upper_bgr_color

        self.filter_overlapping_ranges(reduced, 0)

        return reduced

    def filter_overlapping_ranges(self, reduced, index):
        reduced_keys = [x for x in reduced]
        reduced_keys.sort()
        source_key = reduced_keys[index]
        for x in reduced_keys[index+1:]:
            overlap_type = self.get_bucket_overlap(reduced[source_key], reduced[x])
            if overlap_type:
                self.fix_bucket_overlap(reduced[source_key], reduced[x], overlap_type)
        if (index < len(reduced_keys) - 1):
            self.filter_overlapping_ranges(reduced, index+1)

    def fix_bucket_overlap(self, bucket_1, bucket_2, overlap_type):
      if overlap_type == 'b2_upper':
          half = (
            math.floor((bucket_2['upper_bgr_color'][0] - bucket_1['lower_bgr_color'][0]) / 2),
            math.floor((bucket_2['upper_bgr_color'][1] - bucket_1['lower_bgr_color'][1]) / 2),
            math.floor((bucket_2['upper_bgr_color'][2] - bucket_1['lower_bgr_color'][2]) / 2)
          )
          b1_lower = (
              bucket_1['lower_bgr_color'][0] + half[0],
              bucket_1['lower_bgr_color'][1] + half[1],
              bucket_1['lower_bgr_color'][2] + half[2]
          )
          b2_upper = (
              bucket_2['upper_bgr_color'][0] - half[0] - 1,
              bucket_2['upper_bgr_color'][1] - half[1] - 1,
              bucket_2['upper_bgr_color'][2] - half[2] - 1
          )
          bucket_1['lower_bgr_color'] = b1_lower
          bucket_2['upper_bgr_color'] = b2_upper
      if overlap_type == 'b2_lower':
          half = (
            math.floor((bucket_1['upper_bgr_color'][0] - bucket_2['lower_bgr_color'][0]) / 2),
            math.floor((bucket_1['upper_bgr_color'][1] - bucket_2['lower_bgr_color'][1]) / 2),
            math.floor((bucket_1['upper_bgr_color'][2] - bucket_2['lower_bgr_color'][2]) / 2)
          )
          b2_lower = (
              bucket_2['lower_bgr_color'][0] + half[0],
              bucket_2['lower_bgr_color'][1] + half[1],
              bucket_2['lower_bgr_color'][2] + half[2]
          )
          b1_upper = (
              bucket_1['upper_bgr_color'][0] - half[0] - 1,
              bucket_1['upper_bgr_color'][1] - half[1] - 1,
              bucket_1['upper_bgr_color'][2] - half[2] - 1
          )
          bucket_1['upper_bgr_color'] = b1_upper
          bucket_2['lower_bgr_color'] = b2_lower

    def get_bucket_overlap(self, color_bucket_1, color_bucket_2):
        if color_bucket_1['lower_bgr_color'][0] <= \
            color_bucket_2['upper_bgr_color'][0] <= \
            color_bucket_1['upper_bgr_color'][0]:
            return 'b2_upper'
        if color_bucket_1['lower_bgr_color'][1] <= \
            color_bucket_2['upper_bgr_color'][1] <= \
            color_bucket_1['upper_bgr_color'][1]:
            return 'b2_upper'
        if color_bucket_1['lower_bgr_color'][2] <= \
            color_bucket_2['upper_bgr_color'][2] <= \
            color_bucket_1['upper_bgr_color'][2]:
            return 'b2_upper'
        if color_bucket_1['lower_bgr_color'][0] <= \
            color_bucket_2['lower_bgr_color'][0] <= \
            color_bucket_1['upper_bgr_color'][0]:
            return 'b2_lower'
        if color_bucket_1['lower_bgr_color'][1] <= \
            color_bucket_2['lower_bgr_color'][1] <= \
            color_bucket_1['upper_bgr_color'][1]:
            return 'b2_lower'
        if color_bucket_1['lower_bgr_color'][2] <= \
            color_bucket_2['lower_bgr_color'][2] <= \
            color_bucket_1['upper_bgr_color'][2]:
            return 'b2_lower'

    def calc_average_bucket_loc(self, bucket_locs):
        tt = [0,0,0]
        for bucket_loc in bucket_locs:
            tt[0] += bucket_loc[0]
            tt[1] += bucket_loc[1]
            tt[2] += bucket_loc[2]
        final = [
            tt[0]/len(bucket_locs), 
            tt[1]/len(bucket_locs), 
            tt[2]/len(bucket_locs)
        ]
        return final

    def get_color_for_bucket_coords(self, bucket_coords):
        red = int((bucket_coords[2] * 8) + 4)
        green = int((bucket_coords[1] * 8) + 4)
        blue = int((bucket_coords[0] * 8) + 4)

        bgr = (blue, green, red)
        return bgr

    def get_color_for_bucket_offset(self, bucket_offset):
        z = math.floor(bucket_offset / 1024)
        x_plus_y = bucket_offset - (z * 1024)
        y = x_plus_y % 32
        x = math.floor(x_plus_y / 32)
        blue = int((z * 8) + 4)
        green = int((x * 8) + 4)
        red = int((y * 8) + 4)

        bgr = (blue, green, red)
        return bgr

    def get_color_range_for_buckets(self, reduced_group):
        if len(reduced_group['bucket_locs']) == 1:
            return (0, 0, 0)
        max_x_var = 0
        max_y_var = 0
        max_z_var = 0
        for bucket_loc in reduced_group['bucket_locs']:
            x_diff = abs(bucket_loc[0] - reduced_group['avg_loc'][0])
            if x_diff > max_x_var:
                max_x_var = x_diff
            y_diff = abs(bucket_loc[1] - reduced_group['avg_loc'][1])
            if y_diff > max_y_var:
                max_y_var = y_diff
            z_diff = abs(bucket_loc[2] - reduced_group['avg_loc'][2])
            if z_diff > max_z_var:
                max_z_var = z_diff
        bucket_range = (max_x_var, max_y_var, max_z_var)
        # x, y, z = b, g, r
        color_ranges = (
            math.ceil(bucket_range[0] * 8),
            math.ceil(bucket_range[1] * 8),
            math.ceil(bucket_range[2] * 8),
        )
        return color_ranges

    def buckets_are_close_enough(self, bucket1, bucket2):
        dist = (bucket1[0] - bucket2[0])**2 + \
            (bucket1[1] - bucket2[1])**2 + \
            (bucket1[2] - bucket2[2])**2
        return dist <= self.bucket_closeness_threshold

    def build_edge_partitioned_source_image(self, source, bg_color):
        # TODO We need to be smarter about bg color here.  We should use all
        #   the pixels that are NOT covered by a contour
        scan_img = source.copy()

        cv2.GaussianBlur(scan_img, (13, 13), 0)
        cv2.imwrite('/Users/dcaulton/Desktop/blessy.png', scan_img)
        s2 = imutils.auto_canny(scan_img)
        cv2.imwrite('/Users/dcaulton/Desktop/tommy.png', s2)

        partition_contours = cv2.findContours(
            s2,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        partition_contours = imutils.grab_contours(partition_contours)
        enclosed_partition_contours, contours_touching_edge = \
            self.filter_edge_partition_contours(
                partition_contours, 
                scan_img.shape, 
                debug=True)

        build_img = source.copy()
        cv2.rectangle(
            build_img,
            (0, 0),
            (build_img.shape[1], build_img.shape[0]),
            bg_color,
            -1
        )

        cv2.drawContours(build_img, enclosed_partition_contours, -1, (0, 255, 0), 2)
        for contour in contours_touching_edge:
            bounding_box = cv2.boundingRect(contour)
            contour_image = source.copy()[
                bounding_box[1]:bounding_box[1]+bounding_box[3],
                bounding_box[0]:bounding_box[0]+bounding_box[2],
            ]
            contour_bg_color = self.get_background_color(contour_image)
            cv2.rectangle(
                build_img,
                (bounding_box[0], bounding_box[1]),
                (bounding_box[0]+bounding_box[2], bounding_box[1]+bounding_box[3]),
                contour_bg_color,
                -1
            )
#        cv2.imwrite('/Users/dcaulton/Desktop/binky.png', build_img)
        return build_img

    def filter_edge_partition_contours(
        self, 
        partition_contours, 
        build_image_shape, 
        debug
    ):
        # TODO these might be good input parameters, or maybe autotuning is better
        min_partition_area = 400
        min_line_length = 10
        roi_width = build_image_shape[1]
        roi_height = build_image_shape[0]
        enclosed_partition_contours = []
        contours_touching_edge = []
        for contour in partition_contours:
            bounding_box = cv2.boundingRect(contour)
            bb_area = int(bounding_box[2]) * int(bounding_box[3])
            if debug:
                print(' NEW PARTITION CONTOUR')
                print('   area: {}'.format(bb_area))
                print('   bounding box: {}'.format(bounding_box))
            if bb_area < min_partition_area:
                if debug:
                    print('TOO LITTLE AREA, SKIP')
                continue
            if bounding_box[2] < min_line_length and \
                not self.bb_touches_edge(bounding_box, roi_width, roi_height):
                if debug:
                    print('NOT LONG ENOUGH, SKIP')
                continue
            # TODO do a convex hull here, see if it's smaller than the bounding rect.
            #  if so it's some non-rectilinear shape and we're gonna ignore it.
            if self.contour_touches_edge_twice(contour, roi_width, roi_height):
                contours_touching_edge.append(contour)
                if debug:
                    print('========= ADDING EDGE TOUCHER')
            else:
                enclosed_partition_contours.append(contour)
                if debug:
                    print('========= ADDING ENCLOSED')
                
        return enclosed_partition_contours, contours_touching_edge

    def bb_touches_edge(self, bounding_box, roi_width, roi_height):
        if bounding_box[0] == 0:
            return True
        if bounding_box[0] + bounding_box[2] == roi_width - 1:
            return True 
        if bounding_box[1] == 0:
            return True
        if bounding_box[1] + bounding_box[3] == roi_height - 1:
            return True 
        return False

    def contour_touches_edge_twice(self, contour, roi_width, roi_height):
        touch_count = 0
        print(len(contour))
        for point in contour:
            if point[0][0] == 0:
                touch_count += 1
                continue
            if point[0][0] == roi_width - 1:
                touch_count += 1
                continue
            if point[0][1] == 0:
                touch_count += 1
                continue
            if point[0][1]  == roi_height - 1:
                touch_count += 1
                continue
        return touch_count >= 2

    def draw_hline_contours_with_color(self, target_image, contours, source_image, bg_color):
        for contour in contours:
            bounding_box = cv2.boundingRect(contour)
            center_x = math.floor(bounding_box[0] + bounding_box[2]/2)
            center_y = math.floor(bounding_box[1] + bounding_box[3]/2)
            xcolor = tuple(source_image[center_y, center_x])
            color = (int(xcolor[0]), int(xcolor[1]), int(xcolor[2]))
            thickness = math.floor(bounding_box[3] / 4)
            if thickness < 1:
                thickness = 1
            # quick and dirty fix for really thin lines that are close to the same
            #  color as the bg.  Assume we have a quantize/anti aliasing error and 
            #  fell on a bg pixel when trying to get a line pixel
            if (
                abs(color[0] - bg_color[0]) + 
                abs(color[1] - bg_color[1]) + 
                abs(color[2] - bg_color[2])
            ) < 200:
                if self.is_dark(bg_color):
                    color = (255, 255, 255)
                else:
                    color = (0, 0, 0)
            start_coords = (bounding_box[0], center_y)
            end_coords = (bounding_box[0] + bounding_box[2], center_y)
            cv2.line(
                target_image,
                start_coords,
                end_coords,
                color,
                thickness
            )
#        cv2.imwrite('/Users/dcaulton/Desktop/classy.png', target_image)

    def is_dark(self, color):
        if int(color[0]) + int(color[1]) + int(color[2]) <= 382:
            return True

    def get_horizontal_line_mask(self, image_in):
        gX = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=1, dy=0)
        gY = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=0, dy=1)
        gX = cv2.convertScaleAbs(gX)
        gY = cv2.convertScaleAbs(gY)
        sobelCombined = cv2.addWeighted(gX, 0.5, gY, 0.5, 0)

        hlines = cv2.erode(
            sobelCombined, 
            self.x_kernel, 
            iterations=self.erode_iterations
        )

        # this helps for very narrow lines
        hlines = cv2.dilate(hlines, self.y_kernel, iterations=1)

        (T, hlines_thresh) = \
            cv2.threshold(hlines, 100, 255, cv2.THRESH_BINARY_INV)
        # paint the left and right edges white, so horizontal lines dont 
        #  hit the edge.  When they do, the system will make one big contour
        #  that goes around the image perimeter, then the hlines perimeter
        # we discard the image perimeter one so we don't want to dump these 
        #  hlines with the bathwater
        hlines_thresh[:,0] = (255, 255, 255)
        hlines_thresh[:,hlines.shape[1]-1] = (255, 255, 255)
#        cv2.imwrite('/Users/dcaulton/Desktop/hlines_thresh.png', hlines_thresh)
        return hlines_thresh

    def filter_hline_contours(self, hlines_contours, masking_region, debug):
        # TODO these might be good input parameters, or maybe autotuning is better
        min_line_area = 20
        min_line_length = 20
        roi_width = masking_region['end'][0] - masking_region['start'][0]
        roi_height = masking_region['end'][1] - masking_region['start'][1]
        usable_hlines_contours = []
        for contour in hlines_contours:
            area = cv2.contourArea(contour)
            bounding_box = cv2.boundingRect(contour)
            if debug:
                print(' NEW CONTOUR')
                print('   area: {}'.format(area))
                print('   bounding box: {}'.format(bounding_box))
            if bounding_box[2] == roi_width and \
                bounding_box[3] == roi_height:
                if debug:
                    print('EXTERIOR BOX, SKIP')
                continue #this one goes around the whole selection
            if area < min_line_area:
                if debug:
                    print('TOO LITTLE AREA, SKIP')
                continue
            if bounding_box[2] < min_line_length:
                if debug:
                    print('TOO SHORT, SKIP')
                continue
            usable_hlines_contours.append(contour)
            if debug:
                print('========= KEEP IT')
                print(contour)

        return usable_hlines_contours

    def build_eroded_source_image(self, source, background_color, debug=False):
        # TODO this would be good as a parameter and UI control
        number_of_times_to_erode_source = 2
        source_eroded = source.copy()
        # if light colored letters, do erode, then dilate, 
        # else do dilate then erode
        # we will use < 1/2 full bright to indicate dark bg,
        #   people generally don't use dark text colors on a dark bg
        dilate = getattr(cv2, 'dilate')
        erode = getattr(cv2, 'erode')
        operations = [dilate, erode]
        if source.shape[2] > 1:
            if self.is_dark(background_color):
                operations = [erode, dilate]
        else: 
            if sum(background_color) <= 127:
                operations = [erode, dilate]
        if debug:
            print('operations are {}'.format(operations))
        for operation in operations:
            source_eroded = operation(
                source_eroded,
                self.xy_kernel, 
                iterations=number_of_times_to_erode_source
            )
#        if debug:
#            cv2.imwrite('/Users/dcaulton/Desktop/source_eroded.png', source_eroded)
        return source_eroded

    def get_background_color(self, image):
        return_value = None
        if image.shape[2] == 3:
            hist = cv2.calcHist(
                [image],
                [0, 1, 2],
                None,
                [32, 32, 32],
                [0, 256, 0, 256, 0, 256]
            )

            max_offset = np.argmax(hist)
            z = math.floor(max_offset / 1024)
            x_plus_y = max_offset - (z * 1024)
            y = x_plus_y % 32
            x = math.floor(x_plus_y / 32)
            blue = int((z * 8) + 4)
            green = int((x * 8) + 4)
            red = int((y * 8) + 4)

            return_value = (blue, green, red)
        else:  # assume shape=1, grayscale
            hist = cv2.calcHist(
                [i2],
                [0],
                None,
                [32],
                [0, 256]
            )
            max_offset = np.argmax(hist)
            return_value = (max_offset)
        print('bg color is {}'.format(return_value))
        return return_value

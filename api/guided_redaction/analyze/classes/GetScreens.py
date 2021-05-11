import cv2 
import base64
import imutils
import numpy as np
import random
import copy


class GetScreens:
    def __init__(self, generate_statistics=False):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.erode_iterations = 5
        self.taskbar_min_height_percent = .5
        self.main_screen_min_height_percent = .7
        self.debug = generate_statistics

        self.response_data = {}
        if self.debug:
            self.response_data['statistics'] = {}

    def get_base64_image_string(self, cv2_image):
        image_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
        image_base64 = base64.b64encode(image_bytes)
        image_base64_string = image_base64.decode('utf-8')
        return image_base64_string

    def get_screens(self, source_image):
        screen_rows = self.get_screen_rows_for_image(source_image)
        for row_index, row in enumerate(screen_rows):
            print('zippy processing screen row {}'.format(row))
            row_image = source_image[
                row['start'][1]:row['end'][1], row['start'][0]:row['end'][0]
            ]
            row_image, tb_x_divs = self.trim_off_taskbar(row_image)
            left_trim, right_trim = self.find_left_right_dead_space(row_image, row_index)
            print('  left right trims are {} {}'.format(left_trim, right_trim))
            horiz_points = self.find_vertical_divisions(
                row_image, 
                'upper_half',
                self.main_screen_min_height_percent
            )
            # this is the old way of returning screen areas, just the x, assuming one row
            self.response_data['x_values'] = horiz_points
            final_points = [x for x in horiz_points if self.close_enough(x, tb_x_divs, 20)]
            print('final points are {}'.format(final_points))
            if self.debug and len(final_points) < len(horiz_points):
                print('trimmed out some points because of no match on taskbar')
                self.response_data['x_values'] = final_points

            # the new way of return screen areas, by start and end boxes
            if 'screen_bounding_boxes' not in self.response_data:
                self.response_data['screen_bounding_boxes'] = []
            prev_x = left_trim
            for fp in final_points:
                print('ganga one fp is {}'.format(fp))
                if fp <= left_trim:
                    continue
                if fp >= right_trim:
                    continue
                if fp < prev_x:
                    prev_x = fp
                    continue
                start = (prev_x, row['start'][1])
                end = (fp, row['end'][1])
                build_obj = {'start': start, 'end': end}
                if end[0] - start[0] > 100: # only add screens that's at least 100px wide
                    print('adding ganga')
                    self.response_data['screen_bounding_boxes'].append(build_obj)
                    prev_x = fp + 1
            start = (prev_x, row['start'][1])
            end = (row_image.shape[1]-1, row['end'][1])
            build_obj = {'start': start, 'end': end}
            self.response_data['screen_bounding_boxes'].append(build_obj)

        return self.response_data

    def find_left_right_dead_space(self, row_image, row_index):
        left_trim = 0
        right_trim = row_image.shape[1] - 1
        low_green = hi_green = np.array([0, 255, 0])

        center_left_loc = (1, int(row_image.shape[0] * .5))
        x = cv2.floodFill(row_image.copy(), None, center_left_loc, (0, 255, 0))
        flood_filled_img = x[1]
        mask = cv2.inRange(flood_filled_img, low_green, hi_green)
        cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        if cnts:
            biggest_contour = max(cnts, key=cv2.contourArea)
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(biggest_contour)
            if box_w > 100 and box_h == row_image.shape[0]:
                left_trim = box_w
        center_right_loc = (row_image.shape[1] - 1, int(row_image.shape[0] * .5))
        x = cv2.floodFill(row_image.copy(), None, center_right_loc, (0, 255, 0))
        flood_filled_img = x[1]
        mask = cv2.inRange(flood_filled_img, low_green, hi_green)
        cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        if cnts:
            biggest_contour = max(cnts, key=cv2.contourArea)
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(biggest_contour)
            if box_w > 100 and box_h == row_image.shape[0]:
                right_trim = box_x

        return left_trim, right_trim

    def get_screen_rows_for_image(self, cv2_image):
        return_obj = []
        hlines_thresh = self.get_line_mask(cv2_image, 'horizontal', 'screen_rows')
        hlines_thresh = cv2.cvtColor(hlines_thresh, cv2.COLOR_BGR2GRAY)
        hlines_contours = cv2.findContours(
            hlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        hlines_contours = imutils.grab_contours(hlines_contours)
        image_height, image_width = hlines_thresh.shape[:2]
        for contour in hlines_contours:
            area = cv2.contourArea(contour)
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(contour)
            if image_width - box_w < 10:  #the contour essentially goes all the way across the image
                if image_height - box_y < 100:
                    continue  #screen starts too close to the bottom
                if 5 < box_y < 100:
                    continue  #screen starts too close to the top
                start = (box_x, box_y)
                end = (box_x + box_w, box_y + box_h)
                return_obj.append({
                    'start': start,
                    'end': end,
                })

        if not return_obj:
            return_obj = [{
                'start': (0, 0), 
                'end': (cv2_image.shape[1], cv2_image.shape[0]),
            }]
        if self.debug:
            print('screen rows are {}'.format(return_obj))
            self.response_data['statistics']['screen_rows'] = return_obj
        return return_obj

    def close_enough(self, value, list_of_vals, threshold):
        print('testing if {} is close enough to anything in {}'.format(value, list_of_vals))
        for x in list_of_vals:
            if abs(x-value) <= threshold:
                return True

    def trim_off_taskbar(self, cv2_image):
        hlines_thresh = self.get_line_mask(cv2_image, 'horizontal', 'all_hlines')
        # paint the left and right edges white, so horizontal lines dont
        #  hit the edge.  When they do, the system will make one big contour
        #  that goes around the image perimeter, then the hlines perimeter
        # we discard the image perimeter one so we don't want to dump these
        #  hlines with the bathwater
        hlines_thresh[:,0] = (255, 255, 255)
        hlines_thresh[:,hlines_thresh.shape[1]-1] = (255, 255, 255)
        hlines_thresh = cv2.cvtColor(hlines_thresh, cv2.COLOR_BGR2GRAY)
        hlines_contours = cv2.findContours(
            hlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        hlines_contours = imutils.grab_contours(hlines_contours)
        biggest_contour = max(hlines_contours, key=cv2.contourArea)
        copy = cv2_image.copy()
        image_height, image_width = copy.shape[:2]
        y_cut_height = image_height
        for contour in hlines_contours:
            area = cv2.contourArea(contour)
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(contour)
            percent_width = box_w / image_width
            percent_up_from_bottom = box_y / image_height
            if area > 50:
                if percent_width > .25 and percent_up_from_bottom > .9:
                    if y_cut_height == image_height:
                        y_cut_height = box_y
                    elif box_y > y_cut_height:
                        y_cut_height = box_y
                    print('one keeper area {}, {} {}'.format(area, percent_width, percent_up_from_bottom))

        taskbar_x_markers = []
        if y_cut_height < image_height:
            taskbar_image = copy[y_cut_height:,]
            if self.debug:
                self.response_data['statistics']['taskbar_y_start'] = y_cut_height
            taskbar_x_markers = self.find_vertical_divisions(
                taskbar_image, 
                'taskbar',
                self.taskbar_min_height_percent
            )
            if self.debug:
                print('taskbar found and trimmed.  its x markers are {} '.format(taskbar_x_markers))
            copy = copy[0:y_cut_height,]

        return copy, taskbar_x_markers
        
    def find_vertical_divisions(self, cv2_image, image_name, min_height_percent=.9):
        screen_x_markers = []
        image_height, image_width = cv2_image.shape[:2]
        vlines_thresh = self.get_line_mask(cv2_image, 'vertical', image_name)
        vlines_thresh = cv2.cvtColor(vlines_thresh, cv2.COLOR_BGR2GRAY)
        (T, vlines_thresh) = \
            cv2.threshold(vlines_thresh, 100, 255, cv2.THRESH_BINARY)
        cv2.imwrite('/Users/davecaulton/Desktop/dungy.png', vlines_thresh)
        vlines_contours = cv2.findContours(
            vlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        vlines_contours = imutils.grab_contours(vlines_contours)
        # TODO find a better way to do this
        all_xs = {}
        app_height_threshold = .9
        top_bottom_height_threshold = .5
        touches_top_bottom_margin_of_error_px = 10
        vlines_contours_dict = {}
        for cnt in vlines_contours:
           x, y, w, h = cv2.boundingRect(cnt)
           if x not in vlines_contours_dict:
             vlines_contours_dict[x] = []
           vlines_contours_dict[x].append((x, y, w, h))
        for x_value in sorted(vlines_contours_dict.keys()):
          print('contours for {}'.format(x_value))
          for content_obj in vlines_contours_dict[x_value]:
            x, y, w, h = content_obj
            print('  charles h {}'.format(content_obj))
            percent_height = content_obj[3] / image_height

            touches_top = False
            touches_bottom = False
            if y < touches_top_bottom_margin_of_error_px :
              print('  topper')
              touches_top = True
            if image_height - (y+h) < touches_top_bottom_margin_of_error_px:
              print('  bottoms')
              touches_bottom = True
            if percent_height > .2 or touches_top or touches_bottom:
              print('XXXXXXXXXXXXXXXXYYYYYYYYYYYYEEEEEEEAAAAAAAAAAAAAAAAAHHHHHHHHHHH')
#             all_xs[x_value] = {
#               'percent_height': percent_height, 
#               'touches_top': touches_top,
#               'touches_bottom': touches_bottom,
#             }
#        used_xs = []
#          
#        for x_value in all_xs:
#          print('marnie looking at x val {}'.format(x_value))
        #   if x_value in used_xs:
        #     continue
        #   working_xs = all_xs_within_range_of(x_value)   # so basically this value up to plus 10
        #   total_percent_height = 0
        #   touches_top = False
        #   touches_bottom = False
        #   for wx in working_xs:
        #     used_xs.append(wx)
        #     total_percent_height += all_xs[wx]['percent_height']
        #     if all_xs[wx]['touches_top']:
        #       touches_top = True
        #     if all_xs[wx]['touches_bottom']:
        #       touches_bottom = True
        #   if total_percent_height > app_height_threshold
        #     add this one
        #   else if touches_top and touches_bottom and total_percent_height > top_bottom_height_threshold:
        #     add this one
        #


        for contour in vlines_contours:
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(contour)
            percent_height = box_h / image_height
            if box_x == 0:
                continue
            if percent_height < .1:
                continue
            if image_name == 'upper_half': #MAMA
                print('uv cont {} {} '.format(box_x, percent_height))
            if percent_height > min_height_percent:
                print(' ginsu adding')
                screen_x_markers.append(box_x)
        final_x = []
        if screen_x_markers:
           final_x.append(sorted(screen_x_markers)[0])
           for x_val in sorted(screen_x_markers):
               if abs(final_x[-1] - x_val) > 20:
                   final_x.append(x_val)
        return final_x

    def get_line_mask(self, image_in, direction, image_name):
        gX = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=1, dy=0)
        gY = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=0, dy=1)
        gX = cv2.convertScaleAbs(gX)
        gY = cv2.convertScaleAbs(gY)
        sobelCombined = cv2.addWeighted(gX, 0.5, gY, 0.5, 0)

        if direction == 'vertical':
            erode_kernel = self.y_kernel
            dilate_kernel = self.x_kernel
        elif direction == 'horizontal':
            erode_kernel = self.x_kernel
            dilate_kernel = self.y_kernel

        sobelCombined= cv2.dilate(
            sobelCombined,
            dilate_kernel,
            iterations=self.erode_iterations
        )

        lines = cv2.erode(
            sobelCombined,
            erode_kernel,
            iterations=self.erode_iterations
        )

        (T, lines_thresh) = \
            cv2.threshold(lines, 100, 255, cv2.THRESH_BINARY_INV)

        if self.debug:
            img_string = self.get_base64_image_string(lines_thresh)
            key = 'threshold_'+direction+'_'+image_name+ '.png'
            self.response_data['statistics'][key] = img_string
            cv2.imwrite('/Users/davecaulton/Desktop/' + key, lines_thresh)
        return lines_thresh

import cv2 
import base64
import imutils
import numpy as np
import random
import copy


class GetScreens:
    def __init__(self, meta_obj={}):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.erode_iterations = meta_obj.get('erode_iterations', 5)
        self.main_screen_min_height_percent = meta_obj.get('main_screen_min_height_percent', .7)
        self.debug = meta_obj.get('debug')
        self.app_height_threshold = meta_obj.get('app_height_threshold', .9)
        self.min_contour_height = meta_obj.get('min_contour_height', 20)
        self.min_aspect_ratio = meta_obj.get('min_aspect_ratio', 1)

        self.response_data = {}
        self.response_data['statistics'] = {}
        self.response_data['x_values'] = []
        self.response_data['screen_bounding_boxes'] = []

    def get_base64_image_string(self, cv2_image):
        image_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
        image_base64 = base64.b64encode(image_bytes)
        image_base64_string = image_base64.decode('utf-8')
        return image_base64_string

    def get_screens(self, source_image):
        screen_rows = self.get_screen_rows_for_image(source_image)
        for row_index, row in enumerate(screen_rows):
            print('processing screen row {}'.format(row))
            row_image = source_image[
                row['start'][1]:row['end'][1], row['start'][0]:row['end'][0]
            ]
            row_image = self.trim_off_taskbar(row_image, row_index)
            left_trim, right_trim = self.find_left_right_dead_space(row_image, row_index)
            print('  left right trims are {} {}'.format(left_trim, right_trim))
            x_values = self.find_vertical_divisions(row_image, row_index, left_trim, right_trim)
            # this is the old way of returning screen areas, just the x, assuming one row
            [self.response_data['x_values'].append(x) for x in x_values]

            # the new way of return screen areas, by start and end boxes
            prev_x = left_trim
            for fp in x_values:
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
                self.response_data['screen_bounding_boxes'].append(build_obj)
                prev_x = fp + 1
            start = (prev_x, row['start'][1])
            end = (right_trim, row['end'][1])
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
        hlines_thresh, hlines_contours = self.get_line_mask_and_contours(cv2_image, 'horizontal')
        self.write_image('threshold_horizontal_screen_rows', hlines_thresh)
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
            self.response_data['statistics']['screen_rows'] = return_obj
        return return_obj

    def close_enough(self, value, list_of_vals, threshold):
        print('testing if {} is close enough to anything in {}'.format(value, list_of_vals))
        for x in list_of_vals:
            if abs(x-value) <= threshold:
                return True

    def trim_off_taskbar(self, cv2_image, screen_row_number):
        hlines_thresh = cv2_image.copy()
        hlines_thresh[:,0] = 255
        hlines_thresh[:,hlines_thresh.shape[1]-1] = 255
        hlines_thresh, hlines_contours = self.get_line_mask_and_contours(hlines_thresh, 'horizontal')
        self.write_image('threshold_horizontal_to_find_taskbar_'+str(screen_row_number), hlines_thresh)
        # paint the left and right edges white, so horizontal lines dont
        #  hit the edge.  When they do, the system will make one big contour
        #  that goes around the image perimeter, then the hlines perimeter
        # we discard the image perimeter one so we don't want to dump these
        #  hlines with the bathwater
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

        if y_cut_height < image_height:
            self.response_data['statistics']['taskbar_y_start'] = y_cut_height
            copy = copy[0:y_cut_height,]

        return copy
        
    def find_vertical_divisions(self, cv2_image, row_index, left_trim, right_trim):
        screen_x_markers = []
        screen_height, screen_width = cv2_image.shape[:2]
        vlines_thresh, vlines_contours = self.get_line_mask_and_contours(cv2_image, 'vertical')
        self.write_image('threshold_vertical_'+str(row_index), vlines_thresh)

        all_xs = []

        for cnt in vlines_contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if h < self.min_contour_height:
                continue
            percent_height = h / screen_height
            if percent_height > self.app_height_threshold:
                all_xs.append(x)
                print('  -- cnt -- {}*'.format((x, y, w, h)))
            else:
                print('  -- cnt -- {}'.format((x, y, w, h)))

        if not all_xs:
           return []

        final_xs = []
        start_x = left_trim
        for x in sorted(all_xs):
            if x < left_trim+10:
                continue
            if (x - start_x) / screen_height < self.min_aspect_ratio:
                continue
            final_xs.append(x)
            start_x = x
        if x not in final_xs:
            final_xs.append(x)

        return final_xs

    def get_line_mask_and_contours(self, image_in, direction):
        image_in = cv2.cvtColor(image_in, cv2.COLOR_BGR2GRAY)
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

        contours = cv2.findContours(
            lines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        contours = imutils.grab_contours(contours)

        return lines_thresh, contours

    def write_image(self, image_name, cv2_image):
        img_string = self.get_base64_image_string(cv2_image)
        key = image_name+ '.png'
        self.response_data['statistics'][key] = img_string
        cv2.imwrite('/Users/davecaulton/Desktop/' + key, cv2_image)

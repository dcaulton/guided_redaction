import cv2 
import imutils
from django.conf import settings
import numpy as np
import requests
import json
import random
import copy
from .controller_t1 import T1Controller                                         


class GetScreensController(T1Controller):

    def __init__(self):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.erode_iterations = 5
        self.taskbar_min_height_percent = .5
        self.main_screen_min_height_percent = .9
        self.debug = True

    def get_screens(self, request_data):
        response_data = {}
        image_url = request_data.get('image_url')
        cv2_image = self.get_cv2_image_from_url(image_url)
        cv2_image, tb_x_divs = self.trim_off_taskbar(cv2_image)
        horiz_points = self.find_vertical_divisions(
            cv2_image, 
            'upper_half',
            self.main_screen_min_height_percent
        )
        response_data['x_values'] = horiz_points
#        final_points = [x for x in horiz_points if self.close_enough(x, tb_x_divs, 20)]
#        print('daddy', final_points)
#        response_data['x_values'] = final_points
        return response_data

    def close_enough(value, list_of_vals, threshold):
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
                    if self.debug:
                        print('one keeper area {}, {} {}'.format(area, percent_width, percent_up_from_bottom))
                        rand_color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                        cv2.rectangle(
                            copy,
                            (box_x, box_y),
                            (box_x + box_w, box_y + box_h),
                            rand_color,
                            2
                        )
        if self.debug:
            cv2.imwrite('/Users/dcaulton/Desktop/htrim.png', copy)

        if y_cut_height < image_height:
            taskbar_image = copy[y_cut_height:,]
            if self.debug:
                cv2.imwrite('/Users/dcaulton/Desktop/taskbar.png', taskbar_image)
            taskbar_x_markers = self.find_vertical_divisions(
                taskbar_image, 
                'taskbar',
                self.taskbar_min_height_percent
            )
            if debug:
                print('taskbar x markers ', taskbar_x_markers)
            copy = copy[0:y_cut_height,]

        return copy, taskbar_x_markers
        
    def find_vertical_divisions(self, cv2_image, image_name, min_height_percent=.9):
        screen_x_markers = []
        image_height, image_width = cv2_image.shape[:2]
        vlines_thresh = self.get_line_mask(cv2_image, 'vertical', image_name)
        vlines_thresh = cv2.cvtColor(vlines_thresh, cv2.COLOR_BGR2GRAY)
        vlines_contours = cv2.findContours(
            vlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        vlines_contours = imutils.grab_contours(vlines_contours)
        for contour in vlines_contours:
            (box_x, box_y, box_w, box_h) = cv2.boundingRect(contour)
            percent_height = box_h / image_height
            if box_x == 0:
                continue
            if percent_height > min_height_percent:
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
            kernel = self.y_kernel
        elif direction == 'horizontal':
            kernel = self.x_kernel
        lines = cv2.erode(
            sobelCombined,
            kernel,
            iterations=self.erode_iterations
        )

        (T, lines_thresh) = \
            cv2.threshold(lines, 100, 255, cv2.THRESH_BINARY_INV)

        if self.debug:
            filename = '/Users/dcaulton/Desktop/thresh_'+direction+'_'+image_name+ '.png'
            cv2.imwrite(filename, lines_thresh)
        return lines_thresh

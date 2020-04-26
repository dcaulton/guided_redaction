import cv2
import imutils
import numpy as np


class ExtentsFinder:

    def __init__(self):
        pass

    def determine_flood_fill_area(self, the_image, fill_center, tol=5):
        x = fill_center[0]
        y = fill_center[1]
        gray = cv2.cvtColor(the_image, cv2.COLOR_BGR2GRAY)
        img_height = gray.shape[0]
        img_width = gray.shape[1]
        im2 = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        x = cv2.floodFill(im2, None, (x, y), (0, 255, 0), (tol, tol, tol, tol))
        flood_filled_img = x[1]
        low_green = np.array([0, 250, 0])
        hi_green = np.array([0, 255, 0])
        mask = cv2.inRange(flood_filled_img, low_green, hi_green)
        cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        biggest_contour = max(cnts, key=cv2.contourArea)
        (box_x, box_y, box_w, box_h) = cv2.boundingRect(biggest_contour)
        rect = ((box_x, box_y), (box_x + box_w, box_y + box_h))
        return rect

    def determine_arrow_fill_area(self, image, fill_center, tolerance=5):
        print('bippy finding an area with fill center {}'.format(fill_center))
        x = fill_center[0]
        y = fill_center[1]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        img_height = gray.shape[0]
        img_width = gray.shape[1]
        target_color = gray[y, x]

        # find x to the right
        row = gray[y, x:img_width]
        mask = abs(target_color - row) > tolerance
        if not np.where(mask)[0].any():
            plus_x = 0
            plus_x = img_width
        else:
           plus_x = np.where(mask)[0][0]
        # find x to the left
        row = gray[y, 0:x]
        mask = abs(target_color - row) > tolerance
        if not np.where(mask)[0].any():
            minus_x = 0
        else:
           minus_x = np.where(mask)[0][-1]
        # find y down
        row = gray[y:img_height, x]
        mask = abs(target_color - row) > tolerance
        if not np.where(mask)[0].any():
            plus_y = img_height
        else:
           plus_y = np.where(mask)[0][0]
        # find y up
        row = gray[0:y, x]
        mask = abs(target_color - row) > tolerance
        if not np.where(mask)[0].any():
            minus_y = 0
        else:
           minus_y = np.where(mask)[0][-1]

        xd = x - (x - minus_x)
        yd = y - (y - minus_y)
        top_left = (int(xd), int(yd))
        bottom_right = (int(x + plus_x), int(y + plus_y))
        ret_arr = (top_left, bottom_right)

        return ret_arr

    def get_template_coords(self, source, template):
        res = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        template_top_left = max_loc
        if max_val > 0.9:
            print("high confidence on primary matching, secondary matching bypassed")
            return template_top_left
        if not self.histograms_match(template, source, template_top_left):
            print("no match found")
            return False
        return template_top_left

import cv2
from classes.EastScanner import EastScanner
from imutils import grab_contours
import math
import numpy as np
import os
import pytesseract
import random
import time

# tools to use East and Tesseract to find word regions in an image
class EastPlusTessScanner(EastScanner):

    TEXT_REGION_NOT_CLAIMED = 0
    TEXT_REGION_HAS_BEEN_CLAIMED = 1
    working_dir = ''

    def __init__(self, args):
        super().__init__(args)
        self.working_dir = args.get('working_dir', '')

    # takes text areas detected by EAST, grows them horizontally using opencv morphology operations, 
    def grow_selections_and_get_contours(self, image, selections, input_filename):
        kernel_size = (13, 1)
        im2 = np.zeros((image.shape[0], image.shape[1]), dtype='uint8')  # regions of text
        for s in selections:
            cv2.rectangle(im2, s[0], s[1], 255, -1)
        parts = os.path.splitext(input_filename)
        if self.debug:
            pre_grow_img_name = os.path.join(self.working_dir, parts[0]+ '_pre_grow' + parts[1])
            print('saving ', pre_grow_img_name) if self.debug else None
            cv2.imwrite(pre_grow_img_name, im2)
        rectKernel = cv2.getStructuringElement(cv2.MORPH_RECT, kernel_size)
        im3 = cv2.morphologyEx(im2, cv2.MORPH_CLOSE, rectKernel) # grown regions of text
        if self.debug:
            post_grow_img_name = os.path.join(self.working_dir, parts[0]+ '_post_grow' + parts[1])
            print('saving ', post_grow_img_name) if self.debug else None
            cv2.imwrite(post_grow_img_name, im3)
        cnts = cv2.findContours(im3, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = grab_contours(cnts)
        return cnts

    # calls Tesseract to do text recognition on the contours detected by EAST
    def do_tess_on_contours(self, image, contours, input_filename):
        parts = os.path.splitext(input_filename)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)

        text_regions = []
        total_tess_time = 0
        copy = image.copy()
        config = ("-l eng --oem 1 --psm 7")
        for contour in contours:
            (x, y, w, h) = cv2.boundingRect(contour)
            roi = gray[y:y+h, x:x+w]
            start = time.time()
            text = pytesseract.image_to_string(roi, config=config)
            end = time.time()
            total_tess_time += end - start
            upper_left = (x, y)
            lower_right = (x+w, y+h)
            print('found text at ',upper_left, lower_right, ':', text) if self.debug else None
            centroid = self.get_centroid(contour)
            text_regions.append([upper_left, lower_right, text, centroid, self.TEXT_REGION_NOT_CLAIMED])
            if self.debug:
                self.draw_bounding_box_leader_and_label(copy, centroid, text, upper_left, lower_right)
        sum_text = 'total text recognition time: ' + str(math.ceil(total_tess_time)) + ' seconds for ' + \
            str(len(contours)) + ' calls'
        print(sum_text) if self.debug else None
        if self.debug:
            post_tess_img_name = os.path.join(self.working_dir, parts[0]+ '_post_tess' + parts[1])
            print('saving ', post_tess_img_name) if self.debug else None
            cv2.imwrite(post_tess_img_name, copy)
        return text_regions

    # for debugging our EAST and Tesseract OCR 
    def draw_bounding_box_leader_and_label(self, image, centroid, text, upper_left, lower_right):
        cv2.rectangle(image, upper_left, lower_right, (255,0,0), 2)
        leader_length = random.randint(30,90)
        text_loc = (centroid[0]+leader_length, centroid[1]+leader_length)
        cv2.line(image, centroid, text_loc, (255,0,0), 2)
        cv2.putText(image, text, text_loc, cv2.FONT_HERSHEY_SIMPLEX, .5, (255,0,0))

    def get_centroid(self, contour):
        M = cv2.moments(contour)
        cX = int(M["m10"] / M["m00"])
        cY = int(M["m01"] / M["m00"])
        return (cX, cY)

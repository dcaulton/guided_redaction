import cv2
from analyze.classes.EastScanner import EastScanner
from imutils import grab_contours
import math
import numpy as np
import os
import pytesseract
import random
import time
import uuid

# tools to use East and Tesseract to find word regions in an image
class EastPlusTessScanner(EastScanner):

    TEXT_REGION_NOT_CLAIMED = 0
    TEXT_REGION_HAS_BEEN_CLAIMED = 1

    def __init__(self):
        pass

    # takes text areas detected by EAST, grows them horizontally using opencv morphology operations, 
    def grow_selections_and_get_contours(self, image, selections):
        kernel_size = (13, 1)
        im2 = np.zeros((image.shape[0], image.shape[1]), dtype='uint8')  # regions of text
        for s in selections:
            cv2.rectangle(im2, s[0], s[1], 255, -1)

        rectKernel = cv2.getStructuringElement(cv2.MORPH_RECT, kernel_size)
        im3 = cv2.morphologyEx(im2, cv2.MORPH_CLOSE, rectKernel) # grown regions of text

        cnts = cv2.findContours(im3, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = grab_contours(cnts)
        return cnts

    # calls Tesseract to do text recognition on the contours detected by EAST
    def do_tess_on_contours(self, image, contours):
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
            centroid = self.get_centroid(contour)
            recognized_text_area = {
                'id': 'rta_' + str(uuid.uuid4()),
                'start': upper_left,
                'end': lower_right,
                'text': text,
                'centroid': centroid,
                'claimed': self.TEXT_REGION_NOT_CLAIMED,
            }
            text_regions.append(recognized_text_area)

        sum_text = 'total text recognition time: ' + str(math.ceil(total_tess_time)) + ' seconds for ' + \
            str(len(contours)) + ' calls'
        print(sum_text)
        return text_regions

    def get_centroid(self, contour):
        M = cv2.moments(contour)
        cX = int(M["m10"] / M["m00"])
        cY = int(M["m01"] / M["m00"])
        return (cX, cY)

import cv2
import random
import math
import imutils
import numpy as np


class SelectionGrower:

    def __init__(self, sg_meta):
        self.selection_grower_meta = sg_meta
        self.debug = False

    def grow_selection(self, selected_area, ocr_data, cv2_image):
        match_obj = {}
        match_stats = {
            'cell_stats': {},
        }

        return match_obj, match_stats

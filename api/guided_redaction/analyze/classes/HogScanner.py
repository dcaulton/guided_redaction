import base64
import cv2
import numpy as np


class HogScanner:

    def __init__(self, hog_rule):
        self.hog_rule = hog_rule
        self.orientations = int(hog_rule['orientations'])
        self.pixels_per_cell = int(hog_rule['pixels_per_cell'])
        self.cells_per_block = int(hog_rule['cells_per_block'])
        
        widths = []
        heights = []
        if 'training_images' not in hog_rule or not hog_rule['training_images']:
            raise Exception('cannot have a HOG scanner without training images')

        for training_image_key in hog_rule['training_images']:
            training_image = hog_rule['training_images'][training_image_key]
            img_base64 = training_image['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            widths.append(cv2_image.shape[1])
            heights.append(cv2_image.shape[0])
        if widths:
            self.avg_img_width = sum(widths) / len(widths)
        if heights:
            self.avg_img_height = sum(heights) / len(heights)

        upper_limit = self.pixels_per_cell * self.cells_per_block
        for w in range(self.avg_img_width, self.avg_img_width + upper_limit):
            if w % self.pixels_per_cell == 0 and w % self.cells_per_block == 0:
                self.window_width = w
        for h in range(self.avg_img_height, self.avg_img_height + upper_limit):
            if h % self.pixels_per_cell == 0 and h % self.cells_per_block == 0:
                self.window_height = h
        if not self.window_width or not self.window_height:
            raise Exception('bad match on getting HOG window sizes')




    def train_model(self):
        return 'all done fool'

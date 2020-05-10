import base64
import cv2
from skimage import feature                                                                                             
import skimage 
import numpy as np
import h5py


class HogScanner:

    def __init__(self, hog_rule):
        self.hog_rule = hog_rule
        self.orientations = int(hog_rule['orientations'])
        self.pixels_per_cell = (
            int(hog_rule['pixels_per_cell']),
            int(hog_rule['pixels_per_cell'])
        )
        self.cells_per_block = (
            int(hog_rule['cells_per_block']),
            int(hog_rule['cells_per_block'])
        )
        self.normalize = hog_rule['normalize']
        
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
        for w in range(self.avg_img_width, self.avg_img_width + upper_limit + 1):
            if w % self.pixels_per_cell == 0 and w % self.cells_per_block == 0:
                self.window_width = w
        for h in range(self.avg_img_height, self.avg_img_height + upper_limit + 1):
            if h % self.pixels_per_cell == 0 and h % self.cells_per_block == 0:
                self.window_height = h
        if not self.window_width or not self.window_height:
            raise Exception('bad match on getting HOG window sizes')



    def describe(self, cv2_image):
        hist = feature.hog(
            cv2_image, 
            orientations=self.orientations, 
            pixels_per_cell=self.pixels_per_cell,
            cells_per_block = self.cells_per_block, 
            transform_sqrt = self.normalize, 
            block_norm="L1"
        )

        hist[hist < 0] = 0
        return hist

    def train_model(self):
        return 'all done fool'

    def dump_dataset(self, data, labels, path, datasetName, writeMethod="w"):
        # open the database, create the dataset, write the data and labels to dataset,
        # and then close the database
        db = h5py.File(path, writeMethod)
        dataset = db.create_dataset(datasetName, (len(data), len(data[0]) + 1), dtype="float")
        dataset[0:len(data)] = np.c_[labels, data]
        db.close()

    def load_dataset(self, path, datasetName):
        # open the database, grab the labels and data, then close the dataset
        db = h5py.File(path, "r")
        (labels, data) = (db[datasetName][:, 0], db[datasetName][:, 1:])
        db.close()

        # return a tuple of the data and labels
        return (data, labels)

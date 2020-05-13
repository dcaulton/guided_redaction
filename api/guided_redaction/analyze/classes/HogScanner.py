import base64
import os
import cv2
import pickle
from skimage import feature                                                                                             
from sklearn.feature_extraction.image import extract_patches_2d
from sklearn.svm import SVC
import skimage 
import numpy as np
import requests
import h5py


class HogScanner:

    def __init__(self, hog_rule, movies, file_writer):
        self.num_distractions_per_image = 40
        self.hog_rule = hog_rule
        self.movies = movies
        self.file_writer = file_writer
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
        self.c_for_svm = float(hog_rule['c_for_svm'])
        
        if 'training_images' not in hog_rule or not hog_rule['training_images']:
            raise Exception('cannot have a HOG scanner without training images')

        widths = []
        heights = []
        for training_image_key in hog_rule['training_images']:
            training_image = hog_rule['training_images'][training_image_key]
            img_base64 = training_image['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            widths.append(cv2_image.shape[1])
            heights.append(cv2_image.shape[0])
        if widths:
            self.avg_img_width = int(sum(widths) / len(widths))
        if heights:
            self.avg_img_height = int(sum(heights) / len(heights))

        upper_limit = self.pixels_per_cell[0] * self.cells_per_block[0]
        for w in range(self.avg_img_width, self.avg_img_width + upper_limit + 1):
            if w % self.pixels_per_cell[0] == 0 and w % self.cells_per_block[0] == 0:
                self.window_width = w
        for h in range(self.avg_img_height, self.avg_img_height + upper_limit + 1):
            if h % self.pixels_per_cell[0] == 0 and h % self.cells_per_block[0] == 0:
                self.window_height = h
        if not self.window_width or not self.window_height:
            raise Exception('bad match on getting HOG window sizes')

        self.data = []
        self.labels = []

        if 'features_path' in hog_rule:
            self.features_path = hog_rule['features_path']
        else:
            hogdir = self.file_writer.create_unique_directory('hog_features')
            underscore_hog_name = 'features_'
            underscore_hog_name += self.hog_rule['name'].replace(' ', '_')
            underscore_hog_name += '-' + self.hog_rule['id']
            underscore_hog_name += '.hdf5'
            outfilename = os.path.join(hogdir, underscore_hog_name)
            self.features_path = outfilename

        if 'classifier_path' in hog_rule:
            self.classifier_path = hog_rule['classifier_path']
        else:
            underscore_hog_name = 'classifier_'
            underscore_hog_name += self.hog_rule['name'].replace(' ', '_')
            underscore_hog_name += '-' + self.hog_rule['id']
            underscore_hog_name += '.cpickle'
            outfilename = os.path.join(hogdir, underscore_hog_name)
            self.classifier_path = outfilename

    def train_model(self):
        if os.path.exists(self.features_path):
            print('loading features from disk')
            (self.data, self.labels) = self.load_dataset(
                self.features_path, 
                "features"
            )
        else:
            print('creating features')
            self.extract_features()

        model = SVC(
            kernel="linear", 
            C=self.c_for_svm,
            probability=True, 
            random_state=42
        )
        model.fit(self.data, self.labels)

        self.file_writer.write_binary_data_to_filepath(
            pickle.dumps(model), 
            self.classifier_path
        )

        return_obj = {
            'features_path': self.features_path,
            'classifier_path': self.classifier_path,
        }
        return return_obj

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

    def extract_features(self):
        # extract positive training features
        for training_image_key in self.hog_rule['training_images']:
            training_image = self.hog_rule['training_images'][training_image_key]
            img_base64 = training_image['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            cv2_image = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
            cv2_image_standard_size = cv2.resize(
                cv2_image, 
                (self.window_width, self.window_height), 
                interpolation=cv2.INTER_AREA
            )

            features = self.describe(cv2_image_standard_size)
            self.data.append(features)
            self.labels.append(1)

        # extract negative training features
        for training_image_key in self.hog_rule['training_images']:
            training_image = self.hog_rule['training_images'][training_image_key]

            pic_response = requests.get(training_image['image_url'])
            image = pic_response.content
            if not image:
                raise Exception('could not load source image for negative training')
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            color_at_upper_left = tuple(cv2_image[
                training_image['start'][1], 
                training_image['start'][0]
            ])
            need_to_use = (
                int(color_at_upper_left[0]),
                int(color_at_upper_left[1]),
                int(color_at_upper_left[2]),
            )
            cv2.rectangle(
                cv2_image, 
                tuple(training_image['start']),
                tuple(training_image['end']),
                need_to_use,
                -1
            )
            cv2_image = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
            patches = extract_patches_2d(
                cv2_image,
                (self.window_height, self.window_width),
                max_patches=self.num_distractions_per_image
            )
            for index, patch in enumerate(patches):
                features = self.describe(patch)
                self.data.append(features)
                self.labels.append(-1)

            self.dump_dataset(
                self.data, 
                self.labels, 
                self.features_path,
                "features"
            )

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

import base64
import uuid
import imutils
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
        self.debug = True
        self.num_distractions_per_image = int(hog_rule['num_distractions_per_image'])
        #TODO, see where this is getting dropped in the gui
        if 'sliding_window_step_size' in hog_rule:
            self.sliding_window_step_size = int(hog_rule['sliding_window_step_size'])
        else:
            self.sliding_window_step_size = 4
        self.minimum_probability = float(hog_rule['minimum_probability'])
        self.global_scale = float(hog_rule['global_scale'])
        self.testing_image_skip_factor = hog_rule['testing_image_skip_factor']
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
        if self.hog_rule['only_test_positives'] == 'true':
            self.only_test_positives = True
        else:
            self.only_test_positives = False
        
        if 'training_images' not in hog_rule or not hog_rule['training_images']:
            raise Exception('cannot have a HOG scanner without training images')

        self.get_average_image_size_and_scale_training_images_globally()

        self.get_sliding_window_size()

        self.scale_testing_image_locations_globally()

        self.get_datafile_paths_and_dirs()

        self.get_scales()

        self.statistics = {
            'movies': {}
        }
        self.build_movies = {}
        self.data = []
        self.labels = []

    def scale_testing_image_locations_globally(self):
        # deal with global scale
        if self.global_scale != 1:
            for testing_image_key in self.hog_rule['testing_images']:
                testing_image = self.hog_rule['testing_images'][testing_image_key]
                old_location = self.hog_rule['testing_images'][testing_image_key]['location']
                self.hog_rule['testing_images'][testing_image_key]['location'] = self.scale_point(old_location)

    def get_sliding_window_size(self):
        upper_limit = self.pixels_per_cell[0] * self.cells_per_block[0]
        for w in range(self.avg_img_width, self.avg_img_width + upper_limit + 1):
            if w % self.pixels_per_cell[0] == 0 and w % self.cells_per_block[0] == 0:
                self.window_width = w
        for h in range(self.avg_img_height, self.avg_img_height + upper_limit + 1):
            if h % self.pixels_per_cell[0] == 0 and h % self.cells_per_block[0] == 0:
                self.window_height = h
        if not self.window_width or not self.window_height:
            raise Exception('bad match on getting HOG window sizes')
        if self.debug:
            print('sliding window size: ({}, {})'.format(self.window_width, self.window_height))

    def get_average_image_size_and_scale_training_images_globally(self):
        widths = []
        heights = []
        self.avg_img_width = 0
        self.avg_img_height= 0
        for training_image_key in self.hog_rule['training_images']:
            training_image = self.hog_rule['training_images'][training_image_key]
            img_base64 = training_image['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # deal with global scale
            if self.global_scale != 1:
                cv2_image = imutils.resize(cv2_image, width=int(cv2_image.shape[1] * self.global_scale))
                cv2_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
                cv2_base64 = base64.b64encode(cv2_bytes)
                self.hog_rule['training_images'][training_image_key]['cropped_image_bytes'] = cv2_base64
                old_start = self.hog_rule['training_images'][training_image_key]['start']
                old_end = self.hog_rule['training_images'][training_image_key]['end']
                self.hog_rule['training_images'][training_image_key]['start'] = self.scale_point(old_start)
                self.hog_rule['training_images'][training_image_key]['end'] = self.scale_point(old_end)

            widths.append(cv2_image.shape[1])
            heights.append(cv2_image.shape[0])
        if widths:
            self.avg_img_width = int(sum(widths) / len(widths))
        if heights:
            self.avg_img_height = int(sum(heights) / len(heights))

    def get_datafile_paths_and_dirs(self):
        hogdir = ''
        if 'features_path' in self.hog_rule and self.hog_rule['features_path']:
            self.features_path = self.hog_rule['features_path']
        else:
            hogdir = self.file_writer.create_unique_directory('hog_features')
            underscore_hog_name = 'features_'
            underscore_hog_name += self.hog_rule['name'].replace(' ', '_')
            underscore_hog_name += '-' + self.hog_rule['id']
            underscore_hog_name += '.hdf5'
            outfilename = os.path.join(hogdir, underscore_hog_name)
            self.features_path = outfilename

        if 'classifier_path' in self.hog_rule and self.hog_rule['classifier_path']:
            if self.debug:
                print('loading classifier from supplied path')
            self.classifier_path = self.hog_rule['classifier_path']
            classifier_binary = self.file_writer.read_binary_data_from_filepath(self.classifier_path)
            self.model = pickle.loads(classifier_binary)
        else:
            if not hogdir:
                hogdir = self.file_writer.create_unique_directory('hog_features')
            underscore_hog_name = 'classifier_'
            underscore_hog_name += self.hog_rule['name'].replace(' ', '_')
            underscore_hog_name += '-' + self.hog_rule['id']
            underscore_hog_name += '.cpickle'
            outfilename = os.path.join(hogdir, underscore_hog_name)
            self.classifier_path = outfilename

        if self.debug:
            the_uuid = str(uuid.uuid4())
            self.debug_images_dir = self.file_writer.create_unique_directory(the_uuid)

    def get_scales(self):
        scale = self.hog_rule.get('scale', '1:1')
        if scale == '+/-25/1':
            self.scales = np.linspace(.75, 1.25, 51)[::-1]
        elif scale == '+/-25/5':
            self.scales = np.linspace(.75, 1.25, 11)[::-1]
        elif scale == '+/-40/1':
            self.scales = np.linspace(.60, 1.40, 81)[::-1]
        elif scale == '+/-40/5':
            self.scales = np.linspace(.60, 1.40, 17)[::-1]
        elif scale == '+/-50/1':
            self.scales = np.linspace(.50, 1.50, 101)[::-1]
        elif scale == '+/-50/5':
            self.scales = np.linspace(.50, 1.50, 21)[::-1]
        elif scale == '+/-50/10':
            self.scales = np.linspace(.50, 1.50, 11)[::-1]
        elif scale == '+/-50/25':
            self.scales = np.linspace(.50, 1.50, 5)[::-1]
        elif scale == '+/-10/1':
            self.scales = np.linspace(.90, 1.1, 11)[::-1]
        elif scale == '+/-10/5':
            self.scales = np.linspace(.90, 1.1, 5)[::-1]
        elif scale == '+/-10/10':
            self.scales = np.linspace(.90, 1.1, 3)[::-1]
        elif scale == '+/-20/1':
            self.scales = np.linspace(.80, 1.2, 21)[::-1]
        elif scale == '+/-20/5':
            self.scales = np.linspace(.80, 1.2, 9)[::-1]
        elif scale == '+/-20/10':
            self.scales = np.linspace(.80, 1.2, 5)[::-1]
        elif scale == '+/-20/20':
            self.scales = np.linspace(.80, 1.2, 3)[::-1]
        else:
            self.scales = [1]

    def scale_point(self, point):
        return (
            int(point[0] * self.global_scale),
            int(point[1] * self.global_scale)
        )

    def train_model(self):
#        if os.path.exists(self.features_path):
#            if self.debug:
#                print('loading features from disk')
#            (self.data, self.labels) = self.load_dataset(
#                self.features_path, 
#                "features"
#            )
#        else:
#            if self.debug:
#                print('creating features')
#            self.extract_features()
        # for now, create fresh training data every time
        self.extract_features()

        self.model = SVC(
            kernel="linear", 
            C=self.c_for_svm,
            probability=True, 
            random_state=42
        )
        self.model.fit(self.data, self.labels)

        self.file_writer.write_binary_data_to_filepath(
            pickle.dumps(self.model), 
            self.classifier_path
        )

        return_obj = {
            'features_path': self.features_path,
            'classifier_path': self.classifier_path,
        }
        if self.debug:
            return_obj['statistics'] = self.statistics

        return return_obj

    def test_model(self):
        self.process_test_single()

        return_obj = {
            'movies': self.build_movies,
        }
        if self.debug:
            return_obj['statistics'] = self.statistics

        return return_obj

    def process_test_single(self):
        for movie_url in self.movies:
            movie = self.movies[movie_url]
            self.statistics['movies'][movie_url] = {'framesets': {}}
            self.build_movies[movie_url] = {'framesets': {}}
            for frameset_index, frameset_hash in enumerate(movie['framesets']):
                frameset = movie['framesets'][frameset_hash]
                image_url = frameset['images'][0]
                if self.debug:
                    print('scanning image {}'.format(image_url))
                self.build_movies[movie_url]['framesets'][frameset_hash] = {}
                pic_response = requests.get(image_url)
                image = pic_response.content
                if not image:
                    raise Exception("couldn't read source image data for testing")
                nparr = np.fromstring(image, np.uint8)
                cv2_scan_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                gray = cv2.cvtColor(cv2_scan_image, cv2.COLOR_BGR2GRAY)

                # deal with global scale
                if self.global_scale != 1:
                    gray = imutils.resize(gray, width=int(gray.shape[1] * self.global_scale))

                (boxes, probs) = self.detect(gray)

                boxes = self.non_max_suppression(boxes, probs, .3)

                for box in boxes:
                    the_id = 'hog_feature_' + str(uuid.uuid4())
                    build_feature = {
                        'id': the_id,
                        'start': (int(box[0]), int(box[1])), 
                        'end': (int(box[2]), int(box[3])),
                        'scanner_type': 'hog',
                        'source': self.hog_rule['id'],
                        'image_url': image_url,
                    }
                    if self.debug:
                        print('build feature {}'.format(build_feature))
                    self.build_movies[movie_url]['framesets'][frameset_hash][the_id] = build_feature

                if self.debug:
                    debug_image_url = self.draw_boxes_on_image(boxes, cv2_scan_image, image_url)
                    self.statistics['movies'][movie_url]['framesets'][frameset_hash] = debug_image_url

    def non_max_suppression(self, boxes, probs, overlapThresh=.3):
        boxes = np.array(boxes)

        if len(boxes) == 0:
            return[]

        if boxes.dtype.kind == 'i':
            boxes = boxes.astype('float')

        pick = []

        # grab coords of bounding boxes
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]

        # compute the area of the bounding boxes and sort the bounding boxes by 
        # their associated probabilities
        area = (x2 - x1 + 1) * (y2 - y1 + 1)
        idxs = np.argsort(probs)

        # keep looping while some indexes still remain in the indexes list
        while len(idxs) > 0:
            # grab the last index in the indexes list and add the index value to the list of
            # picked indexes
            last = len(idxs) - 1
            i = idxs[last]
            pick.append(i)

            # find the largest (x, y) coordinates for the start of the bounding box and the
            # smallest (x, y) coordinates for the end of the bounding box
            xx1 = np.maximum(x1[i], x1[idxs[:last]])
            yy1 = np.maximum(y1[i], y1[idxs[:last]])
            xx2 = np.minimum(x2[i], x2[idxs[:last]])
            yy2 = np.minimum(y2[i], y2[idxs[:last]])

            # compute the width and height of the bounding box
            w = np.maximum(0, xx2 - xx1 + 1)
            h = np.maximum(0, yy2 - yy1 + 1)

            # compute the ratio of overlap
            overlap = (w * h) / area[idxs[:last]]

            # delete all indexes from the index list that have overlap greater than the
            # provided overlap threshold
            idxs = np.delete(idxs, np.concatenate(([last],
                np.where(overlap > overlapThresh)[0])))

        # return only the bounding boxes that were picked
        return boxes[pick].astype("int")

    def draw_boxes_on_image(self, boxes, cv2_image, image_url): 
        image_filename = image_url.split('/')[-1]
        image_before_dot_name  = image_filename.split('.')[0]
        debug_fullpath = os.path.join(self.debug_images_dir, image_before_dot_name + '_detect.png')
        for box in boxes:
            cv2.rectangle(
                cv2_image, 
                (box[0], box[1]), 
                (box[2], box[3]),
                (0, 0, 255),
                3
            )
        cv2.imwrite(debug_fullpath, cv2_image)
        debug_image_url = self.file_writer.get_url_for_file_path(debug_fullpath)
        return debug_image_url

    def detect(self, cv2_image):
        counter = 0
        boxes = []
        probs = []
        orig_width = cv2_image.shape[1]
        for scale in self.scales:
            resized = imutils.resize(cv2_image, width=int(orig_width * scale))
            for (x, y, window) in self.sliding_window(resized):
                counter += 1
                # grab the dimensions of the window
                (winH, winW) = window.shape[:2]
                if winH == self.window_height and winW == self.window_width:
                    features = self.describe(window).reshape(1, -1)
                    prob = self.model.predict_proba(features)[0][1]
                    if prob > self.minimum_probability:
                        unity_scale_start_x = int(x / (self.global_scale * scale) )
                        unity_scale_start_y = int(y / (self.global_scale * scale) )
                        unity_scale_end_x = int(unity_scale_start_x + self.window_width/self.global_scale)
                        unity_scale_end_y = int(unity_scale_start_y + self.window_height/self.global_scale)
                        if self.debug:
                            print('ITS A HIT AT scan number {} - scale {} ({}, {}) - prob {}'.format(
                                counter, scale, unity_scale_start_x, unity_scale_start_y, prob
                            ))
                        boxes.append((
                            unity_scale_start_x, 
                            unity_scale_start_y,
                            unity_scale_end_x, 
                            unity_scale_end_y
                        ))
                        probs.append(prob)
        if self.debug:
            print('total number of scans for image: {}'.format(counter))
        return (boxes, probs)

    def sliding_window(self, image):
        # slide a window across the image
        for y in range(0, image.shape[0], self.sliding_window_step_size):
            for x in range(0, image.shape[1], self.sliding_window_step_size):
                # yield the current window
                yield (x, y, image[y:y + self.window_height, x:x + self.window_width])

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

        # perform hard negative mining
        for hn_key in self.hog_rule['hard_negatives']:
            hard_negative = self.hog_rule['hard_negatives'][hn_key]
            img_base64 = hard_negative['cropped_image_bytes']
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

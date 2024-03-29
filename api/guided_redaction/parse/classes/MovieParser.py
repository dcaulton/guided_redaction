import math
from operator import add
import os
import re
import requests
from traceback import format_exc
import uuid

import cv2
from django import db
from django.conf import settings
import numpy as np


# Handles getting from a series of images to a movie and vise versa
class MovieParser:

    input_filename = ""
    output_frames_per_second = 1
    working_dir = ""
    scan_method = ""
    image_hash_size = 8
    frameset_discriminator = 'gray8'
    hash_to_grayscale = True

    def __init__(self, args):
        self.output_frames_per_second = args.get("ofps", 1)
        self.scan_method = args.get("scan_method")
        self.movie_url = args.get("movie_url")
        self.file_writer = args.get("file_writer")
        self.source = args.get('source', 'file')
        self.sykes_dev_azure_blob_connection_string = args.get(
            'sykes_dev_azure_blob_connection_string'
        )
        self.use_same_directory= args.get('use_same_directory', False)
        self.frameset_discriminator= args.get("frameset_discriminator")
        self.image_request_verify_headers = args.get("image_request_verify_headers")
        if 'hash_to_grayscale' in args: 
            self.hash_to_grayscale = args.get("hash_to_grayscale")

        if not self.frameset_discriminator:
          self.frameset_discriminator = 'gray8'
        if re.search('^gray\d+$', self.frameset_discriminator):
          match_digit =  re.match('^gray(\d+)$', self.frameset_discriminator)[1]
          self.image_hash_size = int(match_digit)

        if self.use_same_directory:
            self.working_uuid = self.get_movie_dir()
        else:
            self.working_uuid = str(uuid.uuid4())

    def get_movie_dir(self):
        (x_part, file_part) = os.path.split(self.movie_url)
        (y_part, uuid_part) = os.path.split(x_part)
        return uuid_part

    def split_movie(self):
        self.unique_working_dir = self.file_writer.create_unique_directory(self.working_uuid)
        print("splitting movie into frames at "+ self.unique_working_dir)
        video_capture = cv2.VideoCapture(self.movie_url)
        success = True
        created_count = 0
        files_created = []
        interval_msec = float(1 / self.output_frames_per_second) * 1000
        last_time_msec = 0
        next_time_msec = 0
        current_position_msec = 0
        try:
            while True:
                success, image = video_capture.read()
                if not success: 
                    break
                if current_position_msec >= next_time_msec:
                    filename = "frame_{:05d}.png".format(created_count)
                    filename_full = os.path.join(self.unique_working_dir, filename)
                    file_url = self.file_writer.write_cv2_image_to_filepath(
                        image, filename_full
                    )
                    files_created.append(file_url)
                    created_count += 1
                    last_time_msec = current_position_msec
                    cur_frame_pos = math.floor(current_position_msec / interval_msec)
                    next_frame_pos = cur_frame_pos + 1
                    next_time_msec = next_frame_pos * interval_msec
                current_position_msec = video_capture.get(cv2.CAP_PROP_POS_MSEC)
        except Exception as e:
            print(format_exc())
        print("{} frames created".format(str(created_count)))
        return files_created

    def load_and_hash_frames(self, input_url_list):
        unique_frames = {}
        for image_url in input_url_list:
            try: 
                cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
                if type(cv2_image) != type(None):
                    self.advance_one_frame(cv2_image, image_url, unique_frames)
            except Exception as err:
                print(format_exc())
                print(image_url)
        return unique_frames

    def advance_one_frame(self, image, image_url, unique_frames):
        gray = image
        if not self.hash_to_grayscale:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        current_hash = self.get_hash(gray)
        if current_hash in unique_frames.keys():
            unique_frames[current_hash].append(image_url)
        else:
            unique_frames[current_hash] = [image_url]

    def get_hash(self, image):
        if re.search('^gray\d+$', self.frameset_discriminator):
            resized = cv2.resize(image, (self.image_hash_size + 1, self.image_hash_size))
            diff = resized[:, 1:] > resized[:, :-1]
            the_hash = sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])
        else:
            print('getting not gray hash')
            the_hash = 1
        return the_hash

    def zip_movie(self, image_urls, movie_name="output.mp4"):
        print("zipping frames into movie named "+ movie_name)
        output_url = self.file_writer.write_video(image_urls, movie_name)
        print("output_url is "+ output_url)
        return output_url

    # the following is duplicated in analyze/controller_t1.py  Refactor when we have a convenient place
    #   to share this logic
    def get_cv2_image_from_url(self, image_url, file_writer=None):
        cv2_image = None
        if not file_writer:
            file_writer = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
        file_fullpath = file_writer.get_file_path_for_url(image_url)
        if os.path.exists(file_fullpath):
            image = file_writer.read_binary_data_from_filepath(file_fullpath)
        else:
            image = requests.get(
              image_url,
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2_image

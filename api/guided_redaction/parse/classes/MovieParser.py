import cv2
from django import db
import math
from operator import add
import os
import numpy as np
import re
import requests
import uuid

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
            print("exception encountered unzipping movie frames: "+ e)
        print("{} frames created".format(str(created_count)))
        return files_created

    def load_and_hash_frames(self, input_url_list):
        unique_frames = {}
        for input_url in input_url_list:
            try: 
                pic_response = requests.get(
                  input_url,
                  verify=self.image_request_verify_headers,
                )
                img_binary = pic_response.content
                if img_binary:
                    nparr = np.fromstring(img_binary, np.uint8)
                    cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    try:
                        if cv2_image.any():
                            self.advance_one_frame(cv2_image, input_url, unique_frames)
                    except:
                        print('MovieParser.load_and_hash_frames: empty or invalid cv2 image')
            except Exception as err:
                print('MovieParser.load_and_hash_frames DIED TRYING TO READ A FRAME: {}'.format(input_url))
                print(error)

        return unique_frames

    def advance_one_frame(self, image, image_url, unique_frames):
        gray = image
        if self.hash_to_grayscale:
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
        print("zipping frames into movie at "+ movie_name)
        output_url = self.file_writer.write_video(image_urls, movie_name)
        print("output_url is "+ output_url)
        return output_url

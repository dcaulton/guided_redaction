import cv2
from django import db
from operator import add
import os
import numpy as np
import re
import requests
import uuid

# Handles getting from a series of images to a movie and vise versa
class MovieParser:

    input_filename = ""
    input_frames_per_second = 1
    output_frames_per_second = 1
    working_dir = ""
    scan_method = ""
    image_hash_size = 8
    frameset_discriminator = 'gray8'

    def __init__(self, args):
        self.input_frames_per_second = args.get("ifps", 1)
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
        video_object = cv2.VideoCapture(self.movie_url)
        success = True
        read_count = 0
        created_count = 0
        files_created = []
        try:
            while success:
                read_count += 1
                filename = "frame_{:05d}.png".format(read_count)
                success, image = video_object.read()
                filename_full = os.path.join(self.unique_working_dir, filename)
                if success:
                    if self.input_frames_per_second > self.output_frames_per_second:
                        if read_count % (60 / self.output_frames_per_second) != 0:
                            # drop frames not needed for output based on FPS
                            print("dropping frame number "+str(read_count)+" due to output_fps") 
                            continue
                    file_url = self.file_writer.write_cv2_image_to_url(
                        image, filename_full
                    )
                    files_created.append(file_url)
                    created_count += 1
        except Exception as e:
            print("exception encountered unzipping movie frames: "+ e)
        print("{} frames created".format(str(created_count)))
        return files_created

    def load_and_hash_frames(self, input_url_list):
        unique_frames = {}
        for input_url in input_url_list:
            pic_response = requests.get(
              input_url,
              verify=self.image_request_verify_headers,
            )
            img_binary = pic_response.content
            if img_binary:
                nparr = np.fromstring(img_binary, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                self.advance_one_frame(cv2_image, input_url, unique_frames)
        return unique_frames

    def advance_one_frame(self, image, image_url, unique_frames):
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

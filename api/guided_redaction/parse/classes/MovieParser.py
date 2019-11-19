import cv2
from operator import add
import os
import numpy as np
import requests
import uuid

# Handles getting from a series of images to a movie and vise versa
class MovieParser():

    debug = False
    input_filename = ''
    input_frames_per_second = 1
    output_frames_per_second = 1
    working_dir = ''
    scan_method = ''
    image_hash_size = 8;

    def __init__(self, args):
        self.debug = args.get('debug', False)
        self.input_frames_per_second = args.get('ifps', 1)
        self.output_frames_per_second = args.get('ofps', 1)
        self.scan_method = args.get('scan_method')
        self.movie_url = args.get('movie_url')
        self.file_writer = args.get('file_writer')

        working_uuid = str(uuid.uuid4())
        self.unique_working_dir = self.file_writer.create_unique_directory(working_uuid)

    def split_movie(self):
        print('splitting movie into frames at ', self.unique_working_dir) if self.debug else None
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
                            print('dropping frame number ', str(read_count),' due to output_fps') if self.debug else None
                            continue
                    file_url = self.file_writer.write_image_to_url(image, filename_full)
                    files_created.append(file_url)
                    created_count += 1
        except Exception as e:
            print('exception encountered unzipping movie frames: ', e)
        print("{} frames created".format(str(created_count))) if self.debug else None
        return files_created

    def load_and_hash_frames(self, input_url_list):
        unique_frames = {}
        for input_url in input_url_list:
            pic_response = requests.get(input_url)
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
        resized = cv2.resize(image, (self.image_hash_size+1, self.image_hash_size))
        diff = resized[:, 1:] > resized[:, :-1]
        the_hash = sum([2**i for (i,v) in enumerate(diff.flatten()) if v])
        return the_hash


    def zip_movie(self, image_urls, movie_name='output.mp4'):
        print('zipping frames into movie at ', movie_name) if self.debug else None
        fps = self.output_frames_per_second
        output_url = self.file_writer.write_video_to_url(image_urls, movie_name)
        return output_url

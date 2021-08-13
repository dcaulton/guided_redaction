import os
import shutil
from traceback import format_exc
from urllib.parse import urlsplit

import cv2
import ffmpeg
import numpy as np
import requests

from guided_redaction.task_queues import get_path_routing_segment


requests.packages.urllib3.disable_warnings()

class FileWriter():

    working_dir = ''

    def __init__(self, working_dir, base_url, image_request_verify_headers):
        self.working_dir = working_dir
        path_routing_segment = get_path_routing_segment()
        self.base_url = base_url.format(route=path_routing_segment)
        self.image_request_verify_headers = image_request_verify_headers

    def get_recording_id_from_url(self, movie_url):
        # relies on the assumption that we're using stuff from secure files.
        #   but it's just for storing info back in a related system
        (x_part, file_name) = os.path.split(movie_url)
        (file_basename, file_extension) = os.path.splitext(file_name)
        file_basename_first_segment = file_basename.split('_')[0]
        return file_basename_first_segment 

    def delete_directory(self, the_uuid):
        dirpath = os.path.join(self.working_dir, the_uuid)
        shutil.rmtree(dirpath, ignore_errors=True)

    def get_images_from_uuid(self, the_uuid):
        the_path = os.path.join(self.working_dir, the_uuid)
        the_files = sorted(os.listdir(the_path))
        the_urls = []
        for filename in the_files:
            (file_basename, file_extension) = os.path.splitext(filename)
            if file_extension == '.png':
               the_urls.append(os.path.join(self.base_url, the_uuid, filename))
            return the_urls

    def write_cv2_image_to_url(self, cv2_image, the_url):
        image_bytes = cv2.imencode('.png', cv2_image)[1].tostring()
        (x_part, file_part) = os.path.split(the_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_fullpath = os.path.join(self.working_dir, uuid_part, file_part)

        with open(file_fullpath, 'wb') as fh:
            fh.write(image_bytes)

        return the_url
  
    def get_uuid_directory_from_url(self, the_url):
        (x_part, file_part) = os.path.split(the_url)
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part == 'build': # sometimes we have a build dir
            (y_part, uuid_part) = os.path.split(y_part)
        return uuid_part

    def get_file_path_for_url(self, the_url):
        (x_part, file_part) = os.path.split(the_url)
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part == 'build': # sometimes we have a build dir
            (y_part, uuid_part) = os.path.split(y_part)
            file_fullpath = os.path.join(self.working_dir, uuid_part, 'build', file_part)
        else:
            file_fullpath = os.path.join(self.working_dir, uuid_part, file_part)
        return file_fullpath

    def get_url_for_file_path(self, the_filepath):
        (x_part, file_part) = os.path.split(the_filepath)
        (y_part, uuid_part) = os.path.split(x_part)
        if uuid_part == 'build': # sometimes we have a build dir
            (y_part, uuid_part) = os.path.split(y_part)
            new_url = '/'.join([self.base_url, uuid_part, 'build', file_part])
        else:
            new_url = '/'.join([self.base_url, uuid_part, file_part])
        return new_url

    def build_file_fullpath_for_uuid_and_filename(self, the_uuid, the_file_name):
        return os.path.join(self.working_dir, the_uuid, the_file_name)

    def get_file_pattern_fullpath_for_movie_split(self, movie_url, file_pattern):
        (x_part, file_part) = os.path.split(movie_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_pattern_fullpath = os.path.join(self.working_dir, uuid_part, file_pattern)
        return file_pattern_fullpath

    def write_cv2_image_to_filepath(self, cv2_image, file_fullpath):
        # assumes we just have uuid and file name, no other segments in the relative path
        image_bytes = cv2.imencode('.png', cv2_image)[1].tostring()
        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        if not os.path.exists(x_part):
            self.create_unique_directory(uuid_part)

        with open(file_fullpath, 'wb') as fh:
            fh.write(image_bytes)

        return new_url
  
    def read_binary_data_from_filepath(self, file_fullpath):
        with open(file_fullpath, 'rb') as fh:
            ret_obj = fh.read()
        return ret_obj

    def write_binary_data_to_filepath(self, binary_data, file_fullpath):
        with open(file_fullpath, 'wb') as fh:
            fh.write(binary_data)
        return 0

    def write_text_data_to_filepath(self, text_data, file_fullpath):
        with open(file_fullpath, 'w') as fh:
            fh.write(text_data)
        return 0

    def delete_item_at_filepath(self, file_fullpath):
        if os.path.exists(file_fullpath):
            os.remove(file_fullpath)
            (file_dir, file_name) = os.path.split(file_fullpath)
            if len(os.listdir(file_dir)) == 0:
                shutil.rmtree(file_dir)

    def get_text_data_from_filepath(self, file_fullpath):
        if not os.path.exists(file_fullpath):
            return ''
        with open(file_fullpath, 'r') as fh:
            text_data = fh.read()
        return text_data

    def copy_file(self, source_url, new_uuid, new_filename=None):
        (x_part, file_part) = os.path.split(source_url)
        (y_part, uuid_part) = os.path.split(x_part)
        old_path = os.path.join(self.working_dir, uuid_part, file_part)
        if new_filename:
            new_path = os.path.join(self.working_dir, new_uuid, new_filename)
        else:
            new_path = os.path.join(self.working_dir, new_uuid, file_part)
        new_url = '/'.join([self.base_url, new_uuid, file_part])
        shutil.copy(old_path, new_path)

        return new_url

    def write_file_to_url(self, video_source_file, file_fullpath):
        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        with open(video_source_file, 'rb') as in_fh:
            video_bytes = in_fh.read()

        with open(file_fullpath, 'wb') as fh:
            fh.write(video_bytes)

        return new_url
  
    def create_unique_directory(self, working_uuid):
        unique_working_dir = os.path.join(self.working_dir, working_uuid)
        if not os.path.isdir(unique_working_dir):
            os.mkdir(unique_working_dir)
        return unique_working_dir

    def write_video(self, image_url_list, output_file_name):
        # get the directory/uuid from the first image
        if not image_url_list:
            return ''
        (x_part, file_part) = os.path.split(image_url_list[0])
        (y_part, uuid_part) = os.path.split(x_part)
        # make a new subdirectory
        new_subdir = os.path.join(uuid_part, 'build')
        print('new subdir is {}'.format(new_subdir))
        self.create_unique_directory(new_subdir)
        # copy images to a new directory, give them sequential numbers
        for image_index, image_url in enumerate(image_url_list):
            build_image_filename = 'frame_{:05d}.png'.format(image_index)
            (x_part, file_part) = os.path.split(image_url)
            print('build image filename {}: {}'.format(build_image_filename, file_part))
            self.copy_file(image_url, new_subdir, build_image_filename)
        # run ffmpeg against the new directory
        input_filepath = self.build_file_fullpath_for_uuid_and_filename(new_subdir, 'frame_%05d.png')
        output_filepath = self.build_file_fullpath_for_uuid_and_filename(new_subdir, output_file_name)
        try:
            (
                ffmpeg
                .input(input_filepath, framerate=1)
                .output(output_filepath)
                .overwrite_output()
                .run()
            )
            output_url = '/'.join([self.base_url, new_subdir, output_file_name])
            return output_url
        except Exception as err:
            print(format_exc())
            return ''

    def find_dir_with_files(self, filenames_in):
        for (dirpath, dirnames, filenames) in os.walk(self.working_dir):
            if dirpath == self.working_dir:
                continue
            files_found = 0
            for fn in filenames_in:
                if fn in filenames:
                    files_found += 1
            if files_found == len(filenames_in):
                the_uuid = os.path.split(dirpath)[-1]
                return the_uuid

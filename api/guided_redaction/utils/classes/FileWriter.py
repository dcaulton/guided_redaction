import cv2
import ffmpeg
import numpy as np
import os
import requests
import shutil

from guided_redaction.task_queues import get_path_routing_segment


requests.packages.urllib3.disable_warnings()

class FileWriter():

    working_dir = ''

    def __init__(self, working_dir, base_url, image_request_verify_headers):
        self.working_dir = working_dir
        path_routing_segment = get_path_routing_segment()
        self.base_url = base_url.format(route=path_routing_segment)
        self.image_request_verify_headers = image_request_verify_headers

    def delete_directory(self, the_uuid):
        dirpath = os.path.join(self.working_dir, the_uuid)
        shutil.rmtree(dirpath)

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

        fh = open(file_fullpath, 'wb')
        fh.write(image_bytes)
        fh.close()

        return the_url
  
    def get_file_path_for_url(self, the_url):
        (x_part, file_part) = os.path.split(the_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_fullpath = os.path.join(self.working_dir, uuid_part, file_part)
        return file_fullpath

    def get_url_for_file_path(self, the_filepath):
        (x_part, file_part) = os.path.split(the_filepath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])
        return new_url

    def build_file_fullpath_for_uuid_and_filename(self, the_uuid, the_file_name):
        if the_uuid and the_file_name:
            return os.path.join(self.working_dir, the_uuid, the_file_name)
        if the_uuid and not the_file_name:
            return os.path.join(self.working_dir, the_uuid)

    def get_file_pattern_fullpath_for_movie_split(self, movie_url, file_pattern):
        (x_part, file_part) = os.path.split(movie_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_pattern_fullpath = os.path.join(self.working_dir, uuid_part, file_pattern)
        return file_pattern_fullpath

    def write_cv2_image_to_filepath(self, cv2_image, file_fullpath):
        image_bytes = cv2.imencode('.png', cv2_image)[1].tostring()
        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        fh = open(file_fullpath, 'wb')
        fh.write(image_bytes)
        fh.close()

        return new_url
  
    def read_binary_data_from_filepath(self, file_fullpath):
        fh = open(file_fullpath, 'rb')
        ret_obj = fh.read()
        fh.close()
        return ret_obj

    def write_binary_data_to_filepath(self, binary_data, file_fullpath):
        fh = open(file_fullpath, 'wb')
        fh.write(binary_data)
        fh.close()
        return 0

    def write_text_data_to_filepath(self, text_data, file_fullpath):
        fh = open(file_fullpath, 'w')
        fh.write(text_data)
        fh.close()
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
        fh = open(file_fullpath, 'r')
        text_data = fh.read()
        fh.close()
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

        in_fh = open(video_source_file, 'rb')
        video_bytes = in_fh.read()
        in_fh.close()

        fh = open(file_fullpath, 'wb')
        fh.write(video_bytes)
        fh.close()

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
            print('exception in write video: {}'.format(err))
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

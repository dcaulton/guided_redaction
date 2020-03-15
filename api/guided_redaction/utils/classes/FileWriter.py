from azure.storage.blob import BlobClient, ContentSettings
import cv2
import numpy as np
import requests
import os
import shutil

class FileWriter():

    working_dir = ''

    def __init__(self, working_dir, base_url, image_request_verify_headers):
        self.working_dir = working_dir
        self.base_url = base_url
        self.image_request_verify_headers = image_request_verify_headers

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
        return os.path.join(self.working_dir, the_uuid, the_file_name)

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
  
    def copy_file(self, source_url, new_uuid):
        (x_part, file_part) = os.path.split(source_url)
        (y_part, uuid_part) = os.path.split(x_part)
        old_path = os.path.join(self.working_dir, uuid_part, file_part)
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
        if image_url_list:
            (x_part, file_part) = os.path.split(image_url_list[0])
            (y_part, uuid_part) = os.path.split(x_part)

            pic_response = requests.get(
              image_url_list[0],
              verify=self.image_request_verify_headers,
            )
            img_binary = pic_response.content
            if img_binary:
                nparr = np.fromstring(img_binary, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                cap_size = (cv2_image.shape[1], cv2_image.shape[0])
        fps = 1
        fourcc = cv2.VideoWriter_fourcc('a', 'v', 'c', '1')

        output_fullpath = os.path.join(self.working_dir, uuid_part, output_file_name)
        writer = cv2.VideoWriter(output_fullpath, fourcc, fps, cap_size, True)
        num_frames = len(image_url_list)
        for count, output_frame_url in enumerate(image_url_list):
            percent_done = str(count+1) + '/' + str(num_frames)
            pic_response = requests.get(
              output_frame_url,
              verify=self.image_request_verify_headers,
            )
            img_binary = pic_response.content
            if img_binary:
                nparr = np.fromstring(img_binary, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                success = writer.write(frame)
        writer.release()
        print('writer done at '+ output_fullpath)

        (x_part, file_part) = os.path.split(output_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        output_url = '/'.join([self.base_url, uuid_part, file_part])

        return output_url

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






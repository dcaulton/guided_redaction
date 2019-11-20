import cv2
import numpy as np
import requests
import os

class FileWriter():

    working_dir = ''

    def __init__(self, working_dir, base_url):
        self.working_dir = working_dir
        self.base_url = base_url

    def write_cv2_image_to_url(self, cv2_image, file_fullpath):
        image_bytes = cv2.imencode('.png', cv2_image)[1].tostring()
        fh = open(file_fullpath, 'wb')
        fh.write(image_bytes)
        fh.close()

        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        return new_url
  
    def create_unique_directory(self, working_uuid):
        unique_working_dir = os.path.join(self.working_dir, working_uuid)
        if not os.path.isdir(unique_working_dir):
            os.mkdir(unique_working_dir)
        return unique_working_dir

    def write_video_to_url(self, image_url_list, output_file_name):
        if image_url_list:
            (x_part, file_part) = os.path.split(image_url_list[0])
            (y_part, uuid_part) = os.path.split(x_part)

            pic_response = requests.get(image_url_list[0])
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
            pic_response = requests.get(output_frame_url)
            img_binary = pic_response.content
            if img_binary:
                nparr = np.fromstring(img_binary, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                success = writer.write(frame)
        writer.release()
      
        (x_part, file_part) = os.path.split(output_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        output_url = '/'.join([self.base_url, uuid_part, file_part])

        return output_url

from azure.storage.blob import BlobClient, ContentSettings
import cv2
import numpy as np
import requests
import os
from guided_redaction.parse.models import ImageBlob

class FileWriter():

    working_dir = ''

    def __init__(self, working_dir, base_url, connection_string, image_storage):
        self.working_dir = working_dir
        self.base_url = base_url
        self.connection_string = connection_string
        self.image_storage = image_storage

    def write_cv2_image_to_url(self, cv2_image, file_fullpath):
        image_bytes = cv2.imencode('.png', cv2_image)[1].tostring()
        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        if self.image_storage == 'mysql':
            image_blob = ImageBlob()
            image_blob.uuid = uuid_part
            image_blob.file_name = file_part
            image_blob.asset_type = 'image/png'
            image_blob.image_data = image_bytes
            image_blob.save()
        elif self.image_storage == 'azure_blob':
            blob_name = os.path.join(uuid_part, file_part)
            blob = BlobClient.from_connection_string(
                conn_str=self.connection_string, container_name="mycontainer", blob_name=blob_name)
            blob.upload_blob(image_bytes)
            blob.set_http_headers(content_settings=ContentSettings(content_type='image/png'))
            new_url = os.path.join(self.base_url, blob_name)
        else:
            fh = open(file_fullpath, 'wb')
            fh.write(image_bytes)
            fh.close()

        return new_url
  
    def write_video_to_url(self, video_source_file, file_fullpath):
        (x_part, file_part) = os.path.split(file_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        new_url = '/'.join([self.base_url, uuid_part, file_part])

        in_fh = open(video_source_file, 'rb')
        video_bytes = in_fh.read()
        in_fh.close()

        if self.image_storage == 'mysql':
            image_blob = ImageBlob()
            image_blob.uuid = uuid_part
            image_blob.file_name = file_part
            image_blob.asset_type = 'image/png'
            image_blob.image_data = video_bytes
            image_blob.save()
        elif self.image_storage == 'azure_blob':
            blob_name = os.path.join(uuid_part, file_part)
            blob = BlobClient.from_connection_string(
                conn_str=self.connection_string, container_name="mycontainer", blob_name=blob_name)
            blob.upload_blob(video_bytes)
            blob.set_http_headers(content_settings=ContentSettings(content_type='image/png'))
            new_url = os.path.join(self.base_url, blob_name)
        else:
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

            pic_response = requests.get(image_url_list[0])
            img_binary = pic_response.content
            if img_binary:
                nparr = np.fromstring(img_binary, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                cap_size = (cv2_image.shape[1], cv2_image.shape[0])
        fps = 1
        fourcc = cv2.VideoWriter_fourcc('a', 'v', 'c', '1')

        if self.image_storage == 'mysql' or self.image_storage == 'azure_blob':
            output_tempdir = os.path.join('/tmp', uuid_part)
            self.create_unique_directory(output_tempdir)
            output_fullpath = os.path.join(output_tempdir, output_file_name)
        else:
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
        print('writer done at ', output_fullpath)
      

        (x_part, file_part) = os.path.split(output_fullpath)
        (y_part, uuid_part) = os.path.split(x_part)
        output_url = '/'.join([self.base_url, uuid_part, file_part])

        if self.image_storage == 'mysql':
            fh = open(output_fullpath, 'rb')
            image_bytes = fh.read()
            image_blob = ImageBlob()
            image_blob.uuid = uuid_part
            image_blob.file_name = file_part
            image_blob.asset_type = 'video/mp4'
            image_blob.image_data = image_bytes
            image_blob.save()
        elif self.image_storage == 'azure_blob':
            fh = open(output_fullpath, 'rb')
            image_bytes = fh.read()
            blob_name = os.path.join(uuid_part, file_part)
            blob = BlobClient.from_connection_string(
                conn_str=self.connection_string, container_name="mycontainer", blob_name=blob_name)
            blob.upload_blob(image_bytes)
            blob.set_http_headers(content_settings=ContentSettings(content_type='video/mp4'))
            new_url = os.path.join(self.base_url, blob_name)

        return output_url

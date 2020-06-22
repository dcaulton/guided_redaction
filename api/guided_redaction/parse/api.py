import os
import uuid

import simplejson as json
import base64
from azure.storage.blob import BlobClient, ContainerClient
from django.http import HttpResponse
from base import viewsets
from rest_framework.response import Response
import cv2
import numpy as np
import ffmpeg

from guided_redaction.parse.classes.MovieParser import MovieParser
from guided_redaction.utils.classes.FileWriter import FileWriter
from django.shortcuts import render
from django.conf import settings
import requests


def collate_image_urls(frames, unique_frames):
    new_frames = []
    for frame in frames:
        new_frames.append(frame)

    new_unique_frames = {}
    for uf in unique_frames.keys():
        new_unique_frames[uf] = {}
        url_list = []
        for frame in unique_frames[uf]:
            url_list.append(frame)
        new_unique_frames[uf]["images"] = url_list

    return (new_frames, new_unique_frames)

def get_movie_frame_dimensions(frames):
    if not frames:
        return []
    input_url = frames[0]
    try:
        pic_response = requests.get(
          input_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        img_binary = pic_response.content
        if img_binary:
            nparr = np.fromstring(img_binary, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return (cv2_image.shape[1], cv2_image.shape[0])
        else:
            return (0, 0)
    except Exception as err:
        print('exception getting movie frame dimensions: {}'.format(err))
        return (0, 0)

def get_url_as_cv2_image(the_url):
    empty_image = np.zeros((5, 5, 3), dtype='uint8')
    try:
        pic_response = requests.get(
          the_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        img_binary = pic_response.content
        if img_binary:
            nparr = np.fromstring(img_binary, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2_image
        else:
            return empty_image
    except Exception as err:
        print('exception getting url as cv2 image: {}'.format(err))
        return empty_image

def split_movie_audio(file_writer, movie_url):
    movie_filepath = file_writer.get_file_path_for_url(movie_url)
    audio_url = movie_url[0:movie_url.rfind('.')] + '.mp3'
    audio_filepath = file_writer.get_file_path_for_url(audio_url)
    (
    ffmpeg
        .input(movie_filepath)
        .output(audio_filepath)
        .overwrite_output()
        .run()
    )
    return audio_url

def add_movie_audio(file_writer, movie_url, audio_url):
    movie_filepath = file_writer.get_file_path_for_url(movie_url)
    new_movie_url = movie_url[0:movie_url.rfind('.')] + '_audio_added' + movie_url[movie_url.rfind('.'):]
    new_movie_filepath = file_writer.get_file_path_for_url(new_movie_url)
    audio_filepath = file_writer.get_file_path_for_url(audio_url)

    audio_input = ffmpeg.input(audio_filepath)
    video_input = ffmpeg.input(movie_filepath)
    (
        ffmpeg
        .filter((audio_input, audio_input), 'join', inputs=2, channel_layout='stereo')
        .output(video_input.video, new_movie_filepath, vcodec='copy')
        .overwrite_output()
        .run()
    )
    return new_movie_url

def split_movie_partial(file_writer, movie_url, start_seconds_offset, num_frames):
    movie_filepath = file_writer.get_file_path_for_url(movie_url)
    file_pattern_fullpath = file_writer.get_file_pattern_fullpath_for_movie_split(movie_url, 'frame_%05d.png')
    try:
        (
            ffmpeg
            .input(movie_filepath, ss=start_seconds_offset)
            .filter('fps', fps=1)
            .output(file_pattern_fullpath, start_number=start_seconds_offset, frames=num_frames)
            .overwrite_output()
            .run()
        )
    except Exception as err:
        print('exception in split movie partial: {}'.format(err))
        return []
    files_created = []
    for i in range(start_seconds_offset,start_seconds_offset+num_frames):
        index_as_string = '{:05d}'.format(i)
        filename = file_pattern_fullpath.replace('%05d', index_as_string)
        file_url = file_writer.get_url_for_file_path(filename)
        files_created.append(file_url)
    return files_created

class ParseViewSetGetImagesForUuid(viewsets.ViewSet):
    def list(self, request):
        the_uuid = request.GET['uuid']

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        the_files = fw.get_images_from_uuid(the_uuid)

        return Response({"images": the_files})
    

class ParseViewSetChangeMovieResolution(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("resolution"):
            return self.error("resolution is required")
        new_x = int(request_data.get('resolution').split('x')[0])
        new_y = int(request_data.get('resolution').split('x')[1])

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        movie_url = list(request_data['movies'].keys())[0]
        build_movie = request_data['movies'][movie_url]
        new_uuid = str(uuid.uuid4())
        fw.create_unique_directory(new_uuid)
        
        new_frames = []
        for frame_url in build_movie['frames']:
            cv2_image = get_url_as_cv2_image(frame_url)
            resized = cv2.resize(cv2_image, (new_x, new_y), interpolation=cv2.INTER_AREA)
            fw.write_cv2_image_to_url(resized, frame_url)
        
        for frameset_hash in build_movie['framesets']:
            if 'redacted_image' in build_movie['framesets'][frameset_hash]:
                img_url = build_movie['framesets'][frameset_hash]['redacted_image']
                cv2_image = get_url_as_cv2_image(img_url)
                resized = cv2.resize(cv2_image, (new_x, new_y), interpolation=cv2.INTER_AREA)
                fw.write_cv2_image_to_url(resized, img_url)
            if 'illustrated_image' in build_movie['framesets'][frameset_hash]:
                img_url = build_movie['framesets'][frameset_hash]['illustrated_image']
                cv2_image = get_url_as_cv2_image(img_url)
                resized = cv2.resize(cv2_image, (new_x, new_y), interpolation=cv2.INTER_AREA)
                fw.write_cv2_image_to_url(resized, img_url)
        build_movie['frame_dimensions'] = [new_x, new_y]
        return_movies = {}
        return_movies[movie_url] = build_movie

        return Response({'movies': return_movies})


class ParseViewSetCopyMovie(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        movie_url = list(request_data['movies'].keys())[0]
        build_movie = request_data['movies'][movie_url]
        new_uuid = str(uuid.uuid4())
        fw.create_unique_directory(new_uuid)
        
        new_frames = []
        for frame_url in build_movie['frames']:
            new_url = fw.copy_file(frame_url, new_uuid)
            new_frames.append(new_url)
        build_movie['frames'] = new_frames

        new_framesets = {}
        for frameset_hash in build_movie['framesets']:
            new_images = []
            frameset = build_movie['framesets'][frameset_hash]
            new_framesets[frameset_hash] = frameset
            for image_url in frameset['images']:
                (x_part, file_part) = os.path.split(image_url)
                (y_part, uuid_part) = os.path.split(x_part)
                new_url = '/'.join([the_base_url, new_uuid, file_part])
                new_images.append(new_url)
            new_framesets[frameset_hash]['images'] = new_images
            if 'redacted_image' in frameset:
                new_url = fw.copy_file(frameset['redacted_image'], new_uuid)
                new_framesets[frameset_hash]['redacted_image'] = new_url
            if 'illustrated_image' in frameset:
                new_url = fw.copy_file(frameset['illustrated_image'], new_uuid)
                new_framesets[frameset_hash]['illustrated_image'] = new_url
        build_movie['framesets'] = new_framesets
        build_movie['nickname'] += ' copy'
        new_movie_url = fw.copy_file(movie_url, new_uuid)
        return_movies = {}
        return_movies[new_movie_url] = build_movie

        return Response({'movies': return_movies})


class ParseViewSetSplitMovie(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def get_movie_length_in_seconds(self, movie_url):
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        movie_fullpath = file_writer.get_file_path_for_url(movie_url)
        probe = ffmpeg.probe(movie_fullpath)
        video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
        duration = int(float(video_stream['duration']))
        return duration

    def process_create_request(self, request_data):
        if not request_data.get("movie_url"):
            return self.error("movie_url is required")
        if request_data.get('movie_url'):
            movie_url = request_data.get("movie_url")
        if not movie_url:
            return self.error("couldn't read movie data")

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        if 'start_seconds_offset' in request_data and 'num_frames' in request_data:
            frames = split_movie_partial(
                fw, 
                movie_url, 
                request_data.get('start_seconds_offset'), 
                request_data.get('num_frames')
            )
            movie_frame_dims = get_movie_frame_dimensions(frames)
        else:
            parser = MovieParser(
                {
                    "debug": settings.DEBUG,
                    "ifps": 1,
                    "ofps": 1,
                    "scan_method": "unzip",
                    "movie_url": movie_url,
                    "file_writer": fw,
                    "use_same_directory": True,
                    "image_request_verify_headers": settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
                }
            )
            frames = parser.split_movie()
            movie_frame_dims = get_movie_frame_dimensions(frames)

        return_data = {}
        return_data['movies'] = {}
        return_data['movies'][movie_url] = {
            "frames": frames,
            "frame_dimensions": movie_frame_dims,
            "framesets": {},
        }

        if request_data.get('preserve_movie_audio'):
            audio_url = split_movie_audio(fw, movie_url)
            return_data['movies'][movie_url]['audio_url'] = audio_url

        return Response(return_data)



class ParseViewSetHashFrames(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")

        movie_url = list(request_data['movies'].keys())[0]
        frames = request_data['movies'][movie_url]['frames']
        disc = request_data['movies'][movie_url]['frameset_discriminator']
        parser = MovieParser(
            {
                "debug": False,
                "ifps": 1,
                "ofps": 1,
                "scan_method": "unzip",
                "movie_url": '',
                "file_writer": {},
                "frameset_discriminator": disc,
                "image_request_verify_headers": settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            }
        )
        
        framesets = parser.load_and_hash_frames(frames)
        (_, new_framesets) = collate_image_urls(frames, framesets)

        return Response({
            "framesets": new_framesets,
        })


class ParseViewSetZipMovie(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)
        resp_payload = {
            "movie_url": resp_data['response_data']['movie_url'],
        }
        return Response(resp_payload)

    def process_create_request(self, request_data):
        if not request_data.get("image_urls"):
            return self.error("image_urls is required")
        if not request_data.get("new_movie_name"):
            return self.error("new_movie_name is required")
        image_urls = request_data["image_urls"]
        movie_name = request_data["new_movie_name"]

        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        parser = MovieParser(
            {
                "debug": settings.DEBUG,
                "ifps": 1,
                "ofps": 1,
                "file_writer": file_writer,
                "image_request_verify_headers": settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            }
        )

        output_url = parser.zip_movie(image_urls, movie_name)

        if request_data.get('audio_url'):
            output_url = add_movie_audio(file_writer, output_url, request_data.get('audio_url'))

        return Response({
            "movie_url": output_url,
        })


class ParseViewSetPing(viewsets.ViewSet):
    def list(self, request):
        return Response({"response": "pong"})


class ParseViewSetCropImage(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("image_url"):
            return self.error("image_url is required")
        if not request.data.get("anchor_id"):
            return self.error("anchor_id is required")
        if not request.data.get("start"):
            return self.error("start is required")
        if not request.data.get("end"):
            return self.error("end is required")
        try:
            image = requests.get(
              request.data["image_url"],
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            ).content
            if not image:
                return self.error('could not read image', status_code=422)
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            start = request.data.get('start')
            end = request.data.get('end')
            cropped = cv2_image[start[1]:end[1], start[0]:end[0]]
            cropped_bytes = cv2.imencode(".png", cropped)[1].tostring()
            cropped_base64 = base64.b64encode(cropped_bytes)
            return Response({
              'anchor_id': request.data.get('anchor_id'),
              'cropped_image_bytes': cropped_base64,
            })
        except Exception as err:
            print('exception creating a cropped image: {}'.format(err))
            return self.error('could not crop image', status_code=400)


class ParseViewSetRebaseMovies(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        movies_in = request_data.get('movies')
        build_movies = {}

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        for movie_url in movies_in:
            movie = movies_in[movie_url]
            first_frame_filename = movie['frames'][0].split('/')[-1]
            last_frame_filename = movie['frames'][-1].split('/')[-1]
            movie_filename = movie_url.split('/')[-1]
            old_uuid = movie_url.split('/')[-2]
            current_uuid = fw.find_dir_with_files([
                movie_filename,
                first_frame_filename,
                last_frame_filename
            ])
            if current_uuid and current_uuid != old_uuid:
                new_frames = []
                for frame in movie['frames']:
                    new_frames.append(frame.replace(old_uuid, current_uuid))
                movie['frames'] = new_frames
                new_framesets = {}
                for frameset_hash in movie['framesets']:
                    frameset = movie['framesets'][frameset_hash]
                    new_frameset_images = []
                    for image in frameset['images']:
                        new_frameset_images.append(image.replace(old_uuid, current_uuid))
                    frameset['images'] = new_frameset_images
                    if 'redacted_image' in frameset:
                        frameset['redacted_image'] = frameset['redacted_image'].replace(old_uuid, current_uuid)
                    if 'illustrated_image' in frameset:
                        frameset['illustrated_image'] = frameset['illustrated_image'].replace(old_uuid, current_uuid)
                    new_framesets[frameset_hash] = frameset
                movie['framesets'] = new_framesets
                new_movie_url = movie_url.replace(old_uuid, current_uuid)
                build_movies[new_movie_url] = movie

        return Response({
            "movies": build_movies,
        })


class ParseViewSetRenderSubsequence(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("subsequence"):
            return self.error("subsequence is required")
        subsequence = request_data['subsequence']

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

        #build a working directory
        new_uuid = str(uuid.uuid4())
        fw.create_unique_directory(new_uuid)
        #put the images in the working directory
        new_frames = []
        for frame_url in subsequence['images']:
            new_url = fw.copy_file(frame_url, new_uuid)
            new_frames.append(new_url)
        # build a wildcard for the source files             
        input_files_wildcard = fw.build_file_fullpath_for_uuid_and_filename(new_uuid, '*.png')
        #build the rendered image name - 'subimage name' + .gif
        output_file_fullpath = fw.build_file_fullpath_for_uuid_and_filename(new_uuid, subsequence['id']+'.gif')
        #load the delay, convert it into floating point framerate
        delay = int(subsequence['delay'])
        output_framerate = float(1000/delay)
        #render the gif
        (
            ffmpeg
            .input(input_files_wildcard, pattern_type='glob', framerate=output_framerate)
            .output(output_file_fullpath)
            .run()
        )
        #add the rendered image name to output['rendered_image']
        subsequence['rendered_image'] = fw.get_url_for_file_path(output_file_fullpath)
        return Response({'subsequence': subsequence})

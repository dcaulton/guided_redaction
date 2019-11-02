from django.views.decorators.csrf import csrf_exempt
import uuid
from django.http import HttpResponse, JsonResponse
import json
import os
from parse.classes.MovieParser import MovieParser
from django.shortcuts import render
from django.conf import settings
import requests

def convert_to_urls(frames, unique_frames):
    file_base_url = settings.FILE_BASE_URL
    new_frames = []
    for frame in frames:
        (x_part, file_part) = os.path.split(frame)
        (y_part, uuid_part) = os.path.split(x_part)
        new_frame = '/'.join([file_base_url, uuid_part, file_part])
        new_frames.append(new_frame)

    new_unique_frames = {}
    for uf in unique_frames.keys():
        new_unique_frames[uf] = {}
        url_list = []
        for frame in unique_frames[uf]:
            (x_part, file_part) = os.path.split(frame)
            (y_part, uuid_part) = os.path.split(x_part)
            new_frame = '/'.join([file_base_url, uuid_part, file_part])
            url_list.append(new_frame)
        new_unique_frames[uf]['images'] = url_list

    return (new_frames, new_unique_frames)


@csrf_exempt
def index(request):
    if request.method == 'POST':
        request_data = json.loads(request.body)
        movie_url = request_data.get('movie_url')
        if movie_url:
            parser = MovieParser({
              'working_dir': settings.FILE_STORAGE_DIR,
              'debug': settings.DEBUG,
              'ifps': 1,
              'ofps': 1,
              'scan_method': 'unzip',
              'movie_url': movie_url,
            })
            frames = parser.split_movie()
            unique_frames = parser.load_and_hash_frames(frames)

            (new_frames, new_unique_frames) = convert_to_urls(frames, unique_frames)

            wrap = {
                'frames': new_frames,
                'unique_frames': new_unique_frames,
            }
            return JsonResponse(wrap)
        else:
            return HttpResponse('couldnt read movie data', status=422)
    else:
        return HttpResponse("You're at the parse index.  You're gonna want to do a post though")

@csrf_exempt
def make_url(request):
    file_base_url = settings.FILE_BASE_URL
    if request.method == 'POST' and 'file' in request.FILES:
        file_obj = request.FILES['file']
        file_basename = request.FILES.get('file').name
        if file_obj:
            the_uuid = str(uuid.uuid4())
            workdir = os.path.join(settings.FILE_STORAGE_DIR, the_uuid)
            os.mkdir(workdir)
            outfilename = os.path.join(workdir, file_basename)
            fh = open(outfilename, 'wb')
            for chunk in file_obj.chunks():
              fh.write(chunk)
            fh.close()
            (x_part, file_part) = os.path.split(outfilename)
            (y_part, uuid_part) = os.path.split(x_part)
            file_url = '/'.join([file_base_url, uuid_part, file_part])

            return HttpResponse(file_url, status=200)

@csrf_exempt
def zip_movie(request):
    image_urls = json.loads(request.body)['image_urls']
    settings.FILE_STORAGE_DIR
    image_files = []
    uuid_part = ''
    for image_url in image_urls:
        (x_part, file_part) = os.path.split(image_url)
        (y_part, uuid_part) = os.path.split(x_part)
        file_path = os.path.join(settings.FILE_STORAGE_DIR, uuid_part, file_part)
        image_files.append(file_path)
    print('zipping', image_files)
    output_filename = 'mongo.mp4'
    output_fullpath = os.path.join(settings.FILE_STORAGE_DIR, uuid_part, output_filename)
    print('saving to ', output_fullpath)
    output_url = '/'.join([settings.FILE_BASE_URL, uuid_part, output_filename])
    parser = MovieParser({
      'working_dir': settings.FILE_STORAGE_DIR,
      'debug': settings.DEBUG,
      'ifps': 1,
      'ofps': 1,
    })
    parser.zip_movie(image_files, output_fullpath)
    return HttpResponse(output_url, status=200)
from django.views.decorators.csrf import csrf_exempt
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

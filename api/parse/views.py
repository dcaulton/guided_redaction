from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
import json
from parse.classes.MovieParser import MovieParser
from django.shortcuts import render
from django.conf import settings
import requests

@csrf_exempt
def index(request):
    if request.method == 'POST':
        request_data = json.loads(request.body)
        movie_url = request_data.get('movie_url')
        if movie_url:
            parser = MovieParser({
              'working_dir': settings.MOVIE_ZIPPER_DIR,
              'debug': settings.DEBUG,
              'ifps': 1,
              'ofps': 1,
              'scan_method': 'unzip',
              'movie_url': movie_url,
            })
            frames = parser.split_movie()
            unique_frames = parser.load_and_hash_frames(frames)

            wrap = {
                'frames': frames,
                'unique_frames': unique_frames,
            }
            return JsonResponse(wrap)
        else:
            return HttpResponse('couldnt read movie data', status=422)
    else:
        return HttpResponse("You're at the parse index.  You're gonna want to do a post though")

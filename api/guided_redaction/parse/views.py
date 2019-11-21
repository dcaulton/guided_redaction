from django.views.decorators.csrf import csrf_exempt
import uuid
from guided_redaction.parse.models import ImageBlob
from django.http import HttpResponse, JsonResponse
import json
import os
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
        new_unique_frames[uf]['images'] = url_list

    return (new_frames, new_unique_frames)


@csrf_exempt
def index(request):
    if request.method == 'POST':
        request_data = json.loads(request.body)
        if not request_data.get('movie_url'):
            return HttpResponse('movie_url is required', status=400)
        movie_url = request_data.get('movie_url')
        if movie_url:
            if settings.USE_IMAGEBLOB_STORAGE:
                the_base_url = request.build_absolute_uri(settings.FILE_BASE_URL)
            else:
                the_base_url = settings.FILE_BASE_URL
            fw = FileWriter(working_dir=settings.FILE_STORAGE_DIR,
                base_url=the_base_url,
                use_image_blob_storage=settings.USE_IMAGEBLOB_STORAGE)
            parser = MovieParser({
              'debug': settings.DEBUG,
              'ifps': 1,
              'ofps': 1,
              'scan_method': 'unzip',
              'movie_url': movie_url,
              'file_writer': fw,
            })
            frames = parser.split_movie()
            unique_frames = parser.load_and_hash_frames(frames)
            (new_frames, new_unique_frames) = collate_image_urls(frames, unique_frames)

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
    request_data = json.loads(request.body)
    if not request_data.get('image_urls'):
        return HttpResponse('image_urls is required', status=400)
    if not request_data.get('movie_name'):
        return HttpResponse('movie_name is required', status=400)
    image_urls = request_data['image_urls']
    movie_name = request_data['movie_name']
    print('saving to ', movie_name)
    if settings.USE_IMAGEBLOB_STORAGE:
        the_base_url = request.build_absolute_uri(settings.FILE_BASE_URL)
    else:
        the_base_url = settings.FILE_BASE_URL
    fw = FileWriter(working_dir=settings.FILE_STORAGE_DIR,
        base_url=the_base_url,
        use_image_blob_storage=settings.USE_IMAGEBLOB_STORAGE)
    parser = MovieParser({
      'debug': settings.DEBUG,
      'ifps': 1,
      'ofps': 1,
      'file_writer': fw,
    })
    output_url = parser.zip_movie(image_urls, movie_name)
    print('output url is ', output_url)
    wrap = {
        'movie_url': output_url,
    }
    return JsonResponse(wrap)

@csrf_exempt
def ping(request):
    return JsonResponse({'response': 'pong'})

@csrf_exempt
def fetch_image(request, the_uuid, the_image_name):
    ib_list = ImageBlob.objects.filter(uuid=the_uuid).filter(file_name=the_image_name)
    if ib_list:
        the_image_blob = ib_list[0]
        response = HttpResponse(content_type=the_image_blob.asset_type)
        response['Content-Disposition'] = 'attachment; filename=' + the_image_name
        response.write(the_image_blob.image_data)
        return response
    return HttpResponse('image not found', status=404)





import uuid
from guided_redaction.parse.models import ImageBlob
from django.http import HttpResponse, JsonResponse
import json
from azure.storage.blob import BlobClient, ContainerClient
import os
from guided_redaction.parse.classes.MovieParser import MovieParser
from guided_redaction.utils.classes.FileWriter import FileWriter
from django.shortcuts import render
from django.conf import settings
import requests
from rest_framework import viewsets


class ParseViewSetSplitMovie(viewsets.ViewSet):
    def create(self, request):
        request_data = json.loads(request.body)

        return_data = {
            'errors_400': [],
            'errors_422': [],
            'response_data': None,
        }

        the_connection_string = ""
        if settings.REDACT_IMAGE_STORAGE == "mysql":
            the_base_url = request.build_absolute_uri(settings.REDACT_MYSQL_BASE_URL)
        elif settings.REDACT_IMAGE_STORAGE == "azure_blob":
            the_base_url = settings.REDACT_AZURE_BASE_URL
            the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
        else:
            the_base_url = settings.REDACT_FILE_BASE_URL

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=the_base_url,
            connection_string=the_connection_string,
            image_storage=settings.REDACT_IMAGE_STORAGE,
        )

        if not request_data.get("movie_url") and not request_data.get("sykes_dev_azure_movie_uuid"):
            return HttpResponse("movie_url or sykes_dev_azure_movie_uuid is required", status=400)
        if request_data.get('movie_url'):
            movie_url = request_data.get("movie_url")
        elif request_data.get('sykes_dev_azure_movie_uuid'):
            movie_url = self.get_movie_url_from_sykes_dev(request_data.get('sykes_dev_azure_movie_uuid'), fw)
        if not movie_url:
            return HttpResponse("couldn't read movie data", status=422)

        parser = MovieParser(
            {
                "debug": settings.DEBUG,
                "ifps": 1,
                "ofps": 1,
                "scan_method": "unzip",
                "movie_url": movie_url,
                "file_writer": fw,
            }
        )
        frames = parser.split_movie()

        return JsonResponse(
            {
                "frames": frames,
            }
        )

    def get_movie_url_from_sykes_dev(self, the_uuid, file_writer):
        blob_name = ''
        container = ContainerClient.from_connection_string(
            conn_str=settings.REDACT_SYKES_DEV_AZURE_BLOB_CONNECTION_STRING,
            container_name=settings.REDACT_SYKES_DEV_AZURE_BLOB_CONTAINER_NAME
        )
        blob_list = container.list_blobs()
        for blob in blob_list:
            (x_part, file_part) = os.path.split(blob.name)
            (y_part, uuid_part) = os.path.split(x_part)
            if uuid_part == the_uuid:
                blob_name = blob.name    # this is in uuid_directory/filename format
        if blob_name: 
            blob = BlobClient.from_connection_string(
                conn_str=settings.REDACT_SYKES_DEV_AZURE_BLOB_CONNECTION_STRING,
                container_name=settings.REDACT_SYKES_DEV_AZURE_BLOB_CONTAINER_NAME,
                blob_name=blob_name,
            )
            temp_video_filename = '/tmp/'+file_part
            with open(temp_video_filename, 'wb') as my_blob:
                blob_data = blob.download_blob()
                blob_data.readinto(my_blob)
                workdir = file_writer.create_unique_directory(the_uuid)
                outfilename = os.path.join(workdir, file_part)
                file_url = file_writer.write_video_to_url(temp_video_filename, outfilename)
                return file_url


class ParseViewSetSplitAndHashMovie(viewsets.ViewSet):
    def process_create_request(self, request_data):
        return_data = {
            'errors_400': [],
            'errors_422': [],
            'response_data': None,
        }
        if not request_data.get("movie_url"):
            return_data['errors_400'].append("movie_url is required")
        if return_data['errors_400']:
            return return_data
        movie_url = request_data.get("movie_url")
        if not movie_url:
            return_data['errors_422'].append("couldn't read movie data")
            return return_data

        the_connection_string = ""
        if settings.REDACT_IMAGE_STORAGE == "mysql":
            the_base_url = request.build_absolute_uri(settings.REDACT_MYSQL_BASE_URL)
        elif settings.REDACT_IMAGE_STORAGE == "azure_blob":
            the_base_url = settings.REDACT_AZURE_BASE_URL
            the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
        else:
            the_base_url = settings.REDACT_FILE_BASE_URL
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=the_base_url,
            connection_string=the_connection_string,
            image_storage=settings.REDACT_IMAGE_STORAGE,
        )
        parser = MovieParser(
            {
                "debug": settings.DEBUG,
                "ifps": 1,
                "ofps": 1,
                "scan_method": "unzip",
                "movie_url": movie_url,
                "file_writer": fw,
            }
        )
        frames = parser.split_movie()
        unique_frames = parser.load_and_hash_frames(frames)
        (new_frames, new_unique_frames) = self.collate_image_urls(
            frames, unique_frames
        )

        return_data['response_data'] = {
            "frames": new_frames,
            "unique_frames": new_unique_frames,
        }
        return return_data

    def create(self, request):
        request_data = json.loads(request.body)
        resp_data = self.process_create_request(request_data)
        if resp_data['errors_400']:
            return HttpResponse(str(resp_data['errors_400']), status=400)
        if resp_data['errors_422']:
            return HttpResponse(str(resp_data['errors_422']), status=422)
        return JsonResponse(
            {
                "frames": resp_data['response_data']['frames'],
                "unique_frames": resp_data['response_data']['unique_frames'],
            }
        )


    def collate_image_urls(self, frames, unique_frames):
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


class ParseViewSetMakeUrl(viewsets.ViewSet):
    def create(self, request):
        file_base_url = settings.REDACT_FILE_BASE_URL
        if request.method == "POST" and "file" in request.FILES:
            file_obj = request.FILES["file"]
            file_basename = request.FILES.get("file").name
            if file_obj:
                the_uuid = str(uuid.uuid4())
                workdir = os.path.join(settings.REDACT_FILE_STORAGE_DIR, the_uuid)
                os.mkdir(workdir)
                outfilename = os.path.join(workdir, file_basename)
                fh = open(outfilename, "wb")
                for chunk in file_obj.chunks():
                    fh.write(chunk)
                fh.close()
                (x_part, file_part) = os.path.split(outfilename)
                (y_part, uuid_part) = os.path.split(x_part)
                file_url = "/".join([file_base_url, uuid_part, file_part])

                return HttpResponse(file_url, status=200)


class ParseViewSetZipMovie(viewsets.ViewSet):
    def create(self, request):
        request_data = json.loads(request.body)
        if not request_data.get("image_urls"):
            return HttpResponse("image_urls is required", status=400)
        if not request_data.get("movie_name"):
            return HttpResponse("movie_name is required", status=400)
        image_urls = request_data["image_urls"]
        movie_name = request_data["movie_name"]
        print("saving to ", movie_name)
        the_connection_string = ""
        if settings.REDACT_IMAGE_STORAGE == "mysql":
            the_base_url = request.build_absolute_uri(settings.REDACT_MYSQL_BASE_URL)
        elif settings.REDACT_IMAGE_STORAGE == "azure_blob":
            the_base_url = settings.REDACT_AZURE_BASE_URL
            the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
        else:
            the_base_url = settings.REDACT_FILE_BASE_URL
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=the_base_url,
            connection_string=the_connection_string,
            image_storage=settings.REDACT_IMAGE_STORAGE,
        )
        parser = MovieParser(
            {"debug": settings.DEBUG, "ifps": 1, "ofps": 1, "file_writer": fw,}
        )
        output_url = parser.zip_movie(image_urls, movie_name)
        print("output url is ", output_url)
        wrap = {
            "movie_url": output_url,
        }
        return JsonResponse(wrap)


class ParseViewSetPing(viewsets.ViewSet):
    def list(self, request):
        return JsonResponse({"response": "pong"})


class ParseViewSetFetchImage(viewsets.ViewSet):
    def retrieve(self, request, the_uuid, the_image_name):
        ib_list = ImageBlob.objects.filter(uuid=the_uuid).filter(
            file_name=the_image_name
        )
        if ib_list:
            the_image_blob = ib_list[0]
            response = HttpResponse(content_type=the_image_blob.asset_type)
            response["Content-Disposition"] = "attachment; filename=" + the_image_name
            response.write(the_image_blob.image_data)
            return response
        return HttpResponse("image not found", status=404)

import cv2
from urllib.parse import urlsplit
import uuid
import os
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.TelemetryAnalyzer import TelemetryAnalyzer
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from django.http import HttpResponse, JsonResponse
import json
import base64
import numpy as np
from django.conf import settings
from django.shortcuts import render
import re
import requests
from base import viewsets
from rest_framework.response import Response
from guided_redaction.utils.classes.FileWriter import FileWriter


class AnalyzeViewSetEastTess(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return HttpResponse("image_url is required", status=400)
        if not request_data.get("roi_start_x"):
            return HttpResponse("roi_start_x is required", status=400)
        if not request_data.get("roi_start_y"):
            return HttpResponse("roi_start_y is required", status=400)
        if not request_data.get("roi_end_x"):
            return HttpResponse("roi_end_x is required", status=400)
        if not request_data.get("roi_end_y"):
            return HttpResponse("roi_end_y is required", status=400)
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if image:
            roi_start_x = int(request_data["roi_start_x"])
            roi_start_y = int(request_data["roi_start_y"])
            roi_end_x = int(request_data["roi_end_x"])
            roi_end_y = int(request_data["roi_end_y"])
            roi_start = (roi_start_x, roi_start_y)
            roi_end = (roi_end_x, roi_end_y)

            analyzer = EastPlusTessGuidedAnalyzer()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            recognized_text_areas = analyzer.analyze_text(
                cv2_image, [roi_start, roi_end]
            )

            return Response({'recognized_text_areas': recognized_text_areas})
        else:
            return self.error("couldnt read image data", status_code=422)


class AnalyzeViewSetScanTemplate(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def get_match_image_for_anchor(self, anchor):
        if 'image_bytes_png_base64' in anchor:
            img_base64 = anchor['image_bytes_png_base64']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2_image
        else:
            pic_response = requests.get(
              anchor["image"],
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            image = pic_response.content
            if not image:
                return self.error("couldn't read source image data", status_code=422)

            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            start = anchor.get("start")
            end = anchor.get("end")
            match_image = cv2_image[start[1] : end[1], start[0] : end[0]]
            return match_image

    def process_create_request(self, request_data):
        matches = {}
        if not request_data.get("template"):
            return self.error("template is required")
        if not request_data.get("source_image_url"):
            return self.error("source_image_url is required")
        if not request_data.get("target_movies") and not request_data.get(
            "target_image"
        ):
            return self.error("target_movies OR a target_image is required")
        template_matcher = TemplateMatcher(request_data.get('template'))
        template = request_data.get('template')
        for anchor in template.get("anchors"):
            match_image = self.get_match_image_for_anchor(anchor)
            start = anchor.get("start")
            end = anchor.get("end")
            size = (end[0] - start[0], end[1] - start[1])
            anchor_id = anchor.get("id")
            targets = request_data.get("target_movies")
            for movie_name in targets.keys():
                framesets = targets[movie_name]["framesets"]
                for frameset_hash in framesets.keys():
                    frameset = framesets[frameset_hash]
                    one_image_url = frameset["images"][0]
                    oi_response = requests.get(
                      one_image_url,
                      verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
                    )
                    one_image = oi_response.content
                    if one_image:
                        oi_nparr = np.fromstring(one_image, np.uint8)
                        target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                        match_results = template_matcher.get_template_coords(
                            target_image, match_image
                        )
                        if match_results:
                            (temp_coords, temp_scale) = match_results
                            if movie_name not in matches:
                                matches[movie_name] = {}
                            if frameset_hash not in matches[movie_name]:
                                matches[movie_name][frameset_hash] = {}
                            matches[movie_name][frameset_hash][anchor_id] = {}
                            matches[movie_name][frameset_hash][anchor_id][
                                "location"
                            ] = temp_coords
                            matches[movie_name][frameset_hash][anchor_id][
                                "size"
                            ] = size
                            matches[movie_name][frameset_hash][anchor_id][
                                "scale"
                            ] = temp_scale
            # TODO it looks like this whole branch isn't used any more, remove it?
            #   We do redact single images via the gui but we package them as 1 frame movies
            if request_data.get("image"):
                image_name = request_data.get("image")
                oi_response = requests.get(
                  image_name,
                  verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
                )
                one_image = oi_response.content
                if one_image:
                    oi_nparr = np.fromstring(one_image, np.uint8)
                    target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                    (temp_coords, temp_scale) = template_matcher.get_template_coords(
                        target_image, match_image
                    )
                    if temp_coords:
                        if image_name not in matches:
                            matches[image_name] = {}
                        matches[image_name][anchor_id] = {}
                        matches[image_name][anchor_id]["location"] = temp_coords
                        # TODO why is the next line hard coded?  I don't think we get here 
                        matches[image_name][anchor_id]["size"] = (76, 276)
                        matches[image_name][anchor_id]["scale"] = temp_scale
        return Response({'matches': matches})


class AnalyzeViewSetFloodFill(viewsets.ViewSet):
    def create(self, request):
        regions = (
            []
        )  # response will be a list of rectangles.  These are screen grabs; this should be fine
        if not request.data.get("source_image_url"):
            return self.error("source_image_url is required")
        if not request.data.get("selected_point"):
            return self.error("selected_point is required")
        selected_point = request.data.get("selected_point")
        tolerance = request.data.get("tolerance")
        image = requests.get(
          request.data["source_image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            finder = ExtentsFinder()
            regions = finder.determine_flood_fill_area(
                cv2_image, selected_point, tolerance
            )
            return Response({"flood_fill_regions": regions})
        else:
            return self.error("couldnt read image data", status_code=422)


class AnalyzeViewSetArrowFill(viewsets.ViewSet):
    def create(self, request):
        regions = (
            []
        )  # response will be a list of rectangles.  These are screen grabs; this should be fine
        if not request.data.get("source_image_url"):
            return self.error("source_image_url is required")
        if not request.data.get("selected_point"):
            return self.error("selected_point is required")
        selected_point = request.data.get("selected_point")
        tolerance = request.data.get("tolerance")
        image = requests.get(
          request.data["source_image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            finder = ExtentsFinder()
            regions = finder.determine_arrow_fill_area(
                cv2_image, selected_point, tolerance
            )
            return Response({"arrow_fill_regions": regions})
        else:
            return self.error("couldnt read image data", status_code=422)

class AnalyzeViewSetFilter(viewsets.ViewSet):
    def create_file_writer(self):
        the_connection_string = ""
        if settings.REDACT_IMAGE_STORAGE == "azure_blob":
            the_base_url = settings.REDACT_AZURE_BASE_URL
            the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
        else:
            the_base_url = settings.REDACT_FILE_BASE_URL
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=the_base_url,
            connection_string=the_connection_string,
            image_storage=settings.REDACT_IMAGE_STORAGE,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        return fw

    def build_result_file_name(self, image_url):
        inbound_filename = (urlsplit(image_url)[2]).split("/")[-1]
        (file_basename, file_extension) = os.path.splitext(inbound_filename)
        new_filename = file_basename + "_filtered" + file_extension
        return new_filename

    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        response_movies = {}
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("filter_parameters"):
            return self.error("filter_parameters is required")

        fw = self.create_file_writer()
        for movie_url in request_data.get("movies"):
            response_movies[movie_url] = {
                'framesets': {},
            }
            movie = request_data.get('movies')[movie_url]
            frames = movie['frames']
            framesets = movie['framesets']

            ordered_hashes = self.get_frameset_hashes_in_order(frames, framesets)
            workdir_uuid = str(uuid.uuid4())
            workdir = fw.create_unique_directory(workdir_uuid)
            for index, frameset_hash in enumerate(ordered_hashes):
                if index > 0:
                    cur_image_url = framesets[frameset_hash]['images'][0]
                    cur_img_bin = requests.get(cur_image_url).content
                    if not cur_img_bin:
                        return self.error("couldn't read source image data: ".cur_image_url, status_code=422)
                    nparr = np.fromstring(cur_img_bin, np.uint8)
                    cur_image_cv2 = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    cur_image_cv2 = cv2.cvtColor(cur_image_cv2, cv2.COLOR_BGR2GRAY)

                    prev_hash = ordered_hashes[index-1]
                    prev_image_url = framesets[prev_hash]['images'][0]
                    prev_img_bin = requests.get(prev_image_url).content
                    if not prev_img_bin:
                        return self.error("couldn't read source image data: ".prev_image_url, status_code=422)
                    nparr = np.fromstring(prev_img_bin, np.uint8)
                    prev_image_cv2 = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    prev_image_cv2 = cv2.cvtColor(prev_image_cv2, cv2.COLOR_BGR2GRAY)

                    filtered_image_cv2= cv2.subtract(prev_image_cv2, cur_image_cv2)
                    new_file_name = self.build_result_file_name(cur_image_url)
                    outfilename = os.path.join(workdir, new_file_name)
                    file_url = fw.write_cv2_image_to_url(filtered_image_cv2, outfilename)
                    response_movies[movie_url]['framesets'][frameset_hash] = file_url

        return Response({'movies': response_movies})

    def get_frameset_hash_for_frame(self, frame, framesets):
        for frameset_hash in framesets:
            if frame in framesets[frameset_hash]['images']:
                return frameset_hash

    def get_frameset_hashes_in_order(self, frames, framesets):
        ret_arr = []
        for frame in frames:
            frameset_hash = self.get_frameset_hash_for_frame(frame, framesets)
            if frameset_hash and frameset_hash not in ret_arr:
                ret_arr.append(frameset_hash)
        return ret_arr

class AnalyzeViewSetTelemetry(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return HttpResponse("movies is required", status=400)
        if not request_data.get("telemetry_data"):
            return HttpResponse("telemetry_data is required", status=400)
        if not request_data.get("telemetry_rule"):
            return HttpResponse("telemetry_rule is required", status=400)
        movies = request_data["movies"]
        telemetry_rule = request_data["telemetry_rule"]
        telemetry_data = request_data["telemetry_data"]
        if 'raw_data_url' not in telemetry_data.keys():
            return HttpResponse("telemetry raw data is required", status=400)
        if 'movie_mappings' not in telemetry_data.keys():
            return HttpResponse("telemetry movie mappings is required", status=400)
        movie_mappings = telemetry_data['movie_mappings']
        analyzer = TelemetryAnalyzer()
        matching_frames = {}

        telemetry_raw_data = requests.get(
          telemetry_data['raw_data_url'],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).text
        telemetry_data = telemetry_raw_data.split('\n')
        if telemetry_data:
            for movie_url in movies.keys():
                matching_frames_for_movie = []
                movie_filename = movie_url.split('/')[-1]
                movie_id = movie_filename.split('.')[0]
                if movie_id not in movie_mappings:
                    print('cannot find recording id for movie url ' + movie_url + ', ' + movie_id)
                    print(movie_mappings.keys())
                    continue
                movie = movies[movie_url]
                recording_id = movie_mappings[movie_id]
                relevant_telemetry_rows = self.get_relevant_telemetry_rows(recording_id, telemetry_data)
                if relevant_telemetry_rows:
                    matching_frames_for_movie = analyzer.find_matching_frames(
                        movie_url=movie_url,
                        recording_id=recording_id,
                        movie=movie, 
                        telemetry_data=relevant_telemetry_rows, 
                        telemetry_rule=telemetry_rule
                    )
                matching_frames[movie_url] = matching_frames_for_movie

        return Response({'matching_frames': matching_frames})

    def get_relevant_telemetry_rows(self, recording_id, telemetry_data):
        matching_rows = []
        regex = re.compile(recording_id.upper())
        for row in telemetry_data:
            if regex.search(row):
                matching_rows.append(row)
        return matching_rows


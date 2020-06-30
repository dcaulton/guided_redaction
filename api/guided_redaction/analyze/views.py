import cv2
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from django.http import HttpResponse, JsonResponse
import json
import numpy as np
from django.shortcuts import render
import requests
from rest_framework import viewsets


class AnalyzeViewSetEastTess(viewsets.ModelViewSet):
    def create(self, request):
        if request.method == "POST":
            if not request.data.get("image_url"):
                return HttpResponse("image_url is required", status=400)
            if not request.data.get("roi_start_x"):
                return HttpResponse("roi_start_x is required", status=400)
            if not request.data.get("roi_start_y"):
                return HttpResponse("roi_start_y is required", status=400)
            if not request.data.get("roi_end_x"):
                return HttpResponse("roi_end_x is required", status=400)
            if not request.data.get("roi_end_y"):
                return HttpResponse("roi_end_y is required", status=400)
            pic_response = requests.get(request.data["image_url"])
            image = pic_response.content
            if image:
                roi_start_x = int(request.data["roi_start_x"])
                roi_start_y = int(request.data["roi_start_y"])
                roi_end_x = int(request.data["roi_end_x"])
                roi_end_y = int(request.data["roi_end_y"])
                roi_start = (roi_start_x, roi_start_y)
                roi_end = (roi_end_x, roi_end_y)

                analyzer = EastPlusTessGuidedAnalyzer()
                nparr = np.fromstring(image, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                recognized_text_areas = analyzer.analyze_text(
                    cv2_image, [roi_start, roi_end]
                )

                wrap = {"recognized_text_areas": recognized_text_areas}
                return JsonResponse(wrap)
            else:
                return HttpResponse("couldnt read image data", status=422)
        else:
            return HttpResponse(
                "You're at the analyze index.  You're gonna want to do a post though"
            )


class AnalyzeViewSetScanTemplate(viewsets.ModelViewSet):
    def process_create_request(self, request_data):
        return_data = {
            'errors_400': [],
            'errors_422': [],
            'response_data': None,
        }
        matches = {}
        template_matcher = TemplateMatcher()
        if not request_data.get("template"):
            return_data['errors_400'].append("template is required")
        if not request_data.get("source_image_url"):
            return_data['errors_400'].append("source_image_url is required")
        if not request_data.get("target_movies") and not request_data.get(
            "target_image"
        ):
            return_data['errors_400'].append(
                "target_movies OR a target_image is required"
            )
        if return_data['errors_400']:
            return return_data
        pic_response = requests.get(request_data["source_image_url"])
        image = pic_response.content
        if not image:
            return_data['errors_422'] = ['couldnt read source image data']
            return return_data

        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        template = request_data.get('template')
        for anchor in template.get("anchors"):
            start = anchor.get("start")
            end = anchor.get("end")
            size = (end[0] - start[0], end[1] - start[1])
            anchor_id = anchor.get("id")
            match_image = cv2_image[start[1] : end[1], start[0] : end[0]]
            targets = request_data.get("target_movies")
            for movie_name in targets.keys():
                framesets = targets[movie_name]["framesets"]
                for frameset_hash in framesets.keys():
                    frameset = framesets[frameset_hash]
                    one_image_url = frameset["images"][0]
                    oi_response = requests.get(one_image_url)
                    one_image = oi_response.content
                    if one_image:
                        oi_nparr = np.fromstring(one_image, np.uint8)
                        target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                        temp_coords = template_matcher.get_template_coords(
                            target_image, match_image
                        )
                        if temp_coords:
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
            if request_data.get("image"):
                image_name = request_data.get("image")
                oi_response = requests.get(image_name)
                one_image = oi_response.content
                if one_image:
                    oi_nparr = np.fromstring(one_image, np.uint8)
                    target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                    temp_coords = template_matcher.get_template_coords(
                        target_image, match_image
                    )
                    if temp_coords:
                        if image_name not in matches:
                            matches[image_name] = {}
                        matches[image_name][anchor_id] = {}
                        matches[image_name][anchor_id]["location"] = temp_coords
                        matches[image_name][anchor_id]["size"] = (76, 276)
        return_data['response_data'] = matches
        return return_data

    def create(self, request):
        resp_data = self.process_create_request(request.data)
        if resp_data['errors_400']:
            return HttpResponse(str(resp_data['errors_400']), status=400)
        if resp_data['errors_422']:
            return HttpResponse(str(resp_data['errors_422']), status=422)
        return JsonResponse({"matches": resp_data['response_data']})


class AnalyzeViewSetFloodFill(viewsets.ModelViewSet):
    def create(self, request):
        regions = (
            []
        )  # response will be a list of rectangles.  These are screen grabs; this should be fine
        if request.method == "POST":
            if not request.data.get("source_image_url"):
                return HttpResponse("source_image_url is required", status=400)
            if not request.data.get("selected_point"):
                return HttpResponse("selected_point is required", status=400)
            selected_point = request.data.get("selected_point")
            tolerance = request.data.get("tolerance")
            image = requests.get(request.data["source_image_url"]).content
            if image:
                nparr = np.fromstring(image, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                finder = ExtentsFinder()
                regions = finder.determine_flood_fill_area(
                    cv2_image, selected_point, tolerance
                )
                return JsonResponse({"flood_fill_regions": regions})
            else:
                return HttpResponse("couldnt read image data", status=422)
        return HttpResponse("Gotta do a POST, smart guy", status=400)


class AnalyzeViewSetArrowFill(viewsets.ModelViewSet):
    def create(self, request):
        regions = (
            []
        )  # response will be a list of rectangles.  These are screen grabs; this should be fine
        if request.method == "POST":
            if not request.data.get("source_image_url"):
                return HttpResponse("source_image_url is required", status=400)
            if not request.data.get("selected_point"):
                return HttpResponse("selected_point is required", status=400)
            selected_point = request.data.get("selected_point")
            tolerance = request.data.get("tolerance")
            image = requests.get(request.data["source_image_url"]).content
            if image:
                nparr = np.fromstring(image, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                finder = ExtentsFinder()
                regions = finder.determine_arrow_fill_area(
                    cv2_image, selected_point, tolerance
                )
                wrapper = {"arrow_fill_regions": regions}
                return JsonResponse(wrapper)
            else:
                return HttpResponse("couldnt read image data", status=422)
        return HttpResponse("Gotta do a POST, smart guy", status=400)
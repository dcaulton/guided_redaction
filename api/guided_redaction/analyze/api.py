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
#from rest_framework import viewsets
from base import viewsets
from rest_framework.response import Response


class AnalyzeViewSetEastTess(viewsets.ViewSet):
    def create(self, request):
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

            return Response({'recognized_text_areas': recognized_text_areas})
        else:
            return self.error("couldnt read image data", status_code=422)


class AnalyzeViewSetScanTemplate(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        matches = {}
        template_matcher = TemplateMatcher()
        if not request_data.get("template"):
            return self.error("template is required")
        if not request_data.get("source_image_url"):
            return self.error("source_image_url is required")
        if not request_data.get("target_movies") and not request_data.get(
            "target_image"
        ):
            return self.error("target_movies OR a target_image is required")
        pic_response = requests.get(request_data["source_image_url"])
        image = pic_response.content
        if not image:
            return self.error("couldn't read source image data", status_code=422)

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
        image = requests.get(request.data["source_image_url"]).content
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
        image = requests.get(request.data["source_image_url"]).content
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

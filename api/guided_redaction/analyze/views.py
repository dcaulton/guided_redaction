import cv2
from django.views.decorators.csrf import csrf_exempt
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import EastPlusTessGuidedAnalyzer
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from django.http import HttpResponse, JsonResponse
import json
import numpy as np
from django.shortcuts import render
import requests

@csrf_exempt
def index(request):
    if request.method == 'POST':
        request_data = json.loads(request.body)
        if not request_data.get('image_url'):
            return HttpResponse('image_url is required', status=400)
        if not request_data.get('roi_start_x'):
            return HttpResponse('roi_start_x is required', status=400)
        if not request_data.get('roi_start_y'):
            return HttpResponse('roi_start_y is required', status=400)
        if not request_data.get('roi_end_x'):
            return HttpResponse('roi_end_x is required', status=400)
        if not request_data.get('roi_end_y'):
            return HttpResponse('roi_end_y is required', status=400)
        pic_response = requests.get(request_data['image_url'])
        image = pic_response.content
        if image:
            roi_start_x = int(request_data['roi_start_x'])
            roi_start_y = int(request_data['roi_start_y'])
            roi_end_x = int(request_data['roi_end_x'])
            roi_end_y = int(request_data['roi_end_y'])
            roi_start = (roi_start_x, roi_start_y)
            roi_end = (roi_end_x, roi_end_y)

            analyzer = EastPlusTessGuidedAnalyzer()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            recognized_text_areas = analyzer.analyze_text(cv2_image, [roi_start, roi_end])

            wrap = {'recognized_text_areas': recognized_text_areas}
            return JsonResponse(wrap)
        else:
            return HttpResponse('couldnt read image data', status=422)
    else:
        return HttpResponse("You're at the analyze index.  You're gonna want to do a post though")

@csrf_exempt
def scan_subimage(request):
    matches = {}
    template_matcher = TemplateMatcher()
    if request.method == 'POST':
        request_data = json.loads(request.body)
        if request_data.get('subimage_start') == [0,0] and request_data.get('subimage_end') == [0,0]:
            return HttpResponse('nonzero subimage_start and subimage_end are required', status=400)
        if not request_data.get('source_image_url'):
            return HttpResponse('source_image_url is required', status=400)
        if not request_data.get('roi_id'):
            return HttpResponse('roi_id is required', status=400)
        pic_response = requests.get(request_data['source_image_url'])
        image = pic_response.content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            start = request_data.get('subimage_start')
            end = request_data.get('subimage_end')
            roi_id = request_data.get('roi_id')
            match_image = cv2_image[start[1]:end[1], start[0]:end[0]]
            targets = request_data.get('targets')
            for movie_name in targets.keys():
                print('----------looking at movie ', movie_name)
                framesets = targets[movie_name]['framesets']
                for frameset_hash in framesets.keys():
                    frameset = framesets[frameset_hash]
                    one_image_url = frameset['images'][0]
                    oi_response = requests.get(one_image_url)
                    one_image = oi_response.content
                    if one_image:
                        oi_nparr = np.fromstring(one_image, np.uint8)
                        target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                        temp_coords = template_matcher.get_template_coords(target_image, match_image)
                        if temp_coords:
                            if movie_name not in matches: 
                                matches[movie_name] = {}
                            matches[movie_name][frameset_hash] = {}
                            matches[movie_name][frameset_hash][roi_id] = {}
                            matches[movie_name][frameset_hash][roi_id]['location'] = temp_coords
        else:
            return HttpResponse('couldnt read image data', status=422)
        return JsonResponse({'matches': matches})
    return HttpResponse('Gotta do a POST, smart guy', status=400)

@csrf_exempt
def flood_fill(request):
    regions = [] # response will be a list of rectangles.  These are screen grabs; this should be fine
    if request.method == 'POST':
        request_data = json.loads(request.body)
        if not request_data.get('source_image_url'):
            return HttpResponse('source_image_url is required', status=400)
        if not request_data.get('selected_point'):
            return HttpResponse('selected_point is required', status=400)
        selected_point = request_data.get('selected_point')
        tolerance = request_data.get('tolerance')
        image = requests.get(request_data['source_image_url']).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            finder = ExtentsFinder()
            regions = finder.determine_flood_fill_area(cv2_image, selected_point, tolerance)
            return JsonResponse({'flood_fill_regions': regions})
        else:
            return HttpResponse('couldnt read image data', status=422)
    return HttpResponse('Gotta do a POST, smart guy', status=400)

@csrf_exempt
def arrow_fill(request):
    regions = [] # response will be a list of rectangles.  These are screen grabs; this should be fine
    if request.method == 'POST':
        request_data = json.loads(request.body)
        if not request_data.get('source_image_url'):
            return HttpResponse('source_image_url is required', status=400)
        if not request_data.get('selected_point'):
            return HttpResponse('selected_point is required', status=400)
        selected_point = request_data.get('selected_point')
        tolerance = request_data.get('tolerance')
        image = requests.get(request_data['source_image_url']).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            finder = ExtentsFinder()
            regions = finder.determine_arrow_fill_area(cv2_image, selected_point, tolerance)
            wrapper = {'arrow_fill_regions': regions}
            return JsonResponse(wrapper)
        else:
            return HttpResponse('couldnt read image data', status=422)
    return HttpResponse('Gotta do a POST, smart guy', status=400)

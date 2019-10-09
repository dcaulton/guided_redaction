import cv2
from django.views.decorators.csrf import csrf_exempt
from analyze.classes.EastPlusTessGuidedAnalyzer import EastPlusTessGuidedAnalyzer
from django import forms
from django.http import HttpResponse, JsonResponse
import json
import numpy as np
from django.shortcuts import render

class ValidationForm(forms.Form):
    roi_start_x = forms.IntegerField()
    roi_start_y = forms.IntegerField()
    roi_end_x = forms.IntegerField()
    roi_end_y = forms.IntegerField()

@csrf_exempt
def index(request):
    # requires a form data payload like this:
    # 
    # image: the image file to analyze, png format preferred
    # roi_start_x: 123  # integer for the region of interest start x coordinate
    # roi_start_y: 123
    # roi_end_x: 234
    # roi_end_y: 234
    #
    if request.method == 'POST':
        uploaded_file= request.FILES.get('image')
        if uploaded_file:
            image = uploaded_file.read()
            form = ValidationForm(request.POST, request.FILES)
            if not form.is_valid():
                return HttpResponse(form.as_p(), status='422')
            roi_start_x = int(request.POST.get('roi_start_x'))
            roi_start_y = int(request.POST.get('roi_start_y'))
            roi_end_x = int(request.POST.get('roi_end_x'))
            roi_end_y = int(request.POST.get('roi_end_y'))
            roi_start = (roi_start_x, roi_start_y)
            roi_end = (roi_end_x, roi_end_y)

            analyzer = EastPlusTessGuidedAnalyzer()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            recognized_text_areas = analyzer.analyze_text(cv2_image, [roi_start, roi_end])

            wrap = {'recognized_text_areas': recognized_text_areas}
            return JsonResponse(wrap)
        else:
            return HttpResponse('Upload an image as formdata, use key name of "image"', status=422)
    else:
        return HttpResponse("You're at the analyze index.  You're gonna want to do a post though")

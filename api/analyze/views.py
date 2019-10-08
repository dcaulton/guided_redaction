from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django import forms
import json

class ValidationForm(forms.Form):
    roi_start_x = forms.IntegerField()
    roi_start_y = forms.IntegerField()
    roi_end_x = forms.IntegerField()
    roi_end_y = forms.IntegerField()

@csrf_exempt
def index(request):
    if request.method == 'POST':
        text_areas = {"gorilla": "state"}
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

            from analyze.classes.EastScanner import EastScanner
            from analyze.classes.EastPlusTessScanner import EastPlusTessScanner
            from analyze.classes.EastPlusTessGuidedAnalyzer import EastPlusTessGuidedAnalyzer
            import numpy as np
            import cv2
            analyzer = EastPlusTessGuidedAnalyzer()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            recognized_text_areas = analyzer.analyze_text(cv2_image, [roi_start, roi_end])

            wrap = {'recognized_text_areas': recognized_text_areas}
            return JsonResponse(wrap)
        else:
            return HttpResponse('upload a file and call it image', status=422)
    else:
        return HttpResponse("Hello, world. You're at the analyze index.  You're gonna want to do a post though")

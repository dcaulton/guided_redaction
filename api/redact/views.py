import cv2
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from redact.classes.ImageMasker import ImageMasker
import json
import numpy as np


@csrf_exempt
def index(request):
    if request.method == 'POST':
        uploaded_file= request.FILES.get('image')
        if uploaded_file:
            image = uploaded_file.read()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            data = json.loads(request.POST.get('data'))
            areas_to_redact_from_json = data.get('areas_to_redact', [])
            mask_info = data.get('mask_info', {"method": "black_rectangle"})
            areas_to_redact = []
            for a2r in areas_to_redact_from_json:
                areas_to_redact.append([tuple(a2r[0]), tuple(a2r[1])])

            image_masker = ImageMasker()
            masked_image = image_masker.mask_all_regions(cv2_image, areas_to_redact, mask_info)
            
            #TODO stream an image back to the caller 
            cv2.imwrite('/Users/dcaulton/Desktop/howboutthat.png', masked_image)

            wrap = {'yippie': 'ki yay'}
            return JsonResponse(wrap)
        else:
            return HttpResponse('upload a file and call it image', status=422)
    else:
        return HttpResponse("Hello, world. You're at the analyze index.  You're gonna want to do a post though")

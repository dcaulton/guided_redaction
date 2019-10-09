import cv2
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from redact.classes.ImageMasker import ImageMasker
import json
import numpy as np
import uuid


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
            image_bytes = cv2.imencode('.png', masked_image)[1].tostring()
            
            response = HttpResponse(content_type='image/png')
            new_name = 'image_' + str(uuid.uuid4()) + '.png'
            response['Content-Disposition'] = 'attachment; filename=' + new_name
            response.write(image_bytes)
            return response
        else:
            return HttpResponse('Upload an image as formdata, use key name of "image"', status=422)
    else:
        return HttpResponse("You're at the redact index.  You're gonna want to do a post though")

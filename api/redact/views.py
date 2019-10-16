import cv2
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from redact.classes.ImageMasker import ImageMasker
import json
import numpy as np
import uuid


@csrf_exempt
def index(request):
    # requires a form data payload like this:
    #
    # image: the file to mask, preferably in png format
    # data: {    
    #     "areas_to_redact": [
    #         [[start_x, start_y], [end_x, end_y]]
    #      ],
    #     "mask_info": {
    #         "method": "blur_7x7"   # or green_outline, or black_rectangle (default)
    #      }
    # }
    #
    #  note: data is a JSON-formatted object
    #        the output from analyze is suitable here, even though it has 
    #        more info in its array after those two coordinates that data will be ignored
    if request.method == 'POST':
        uploaded_file= request.FILES.get('image')
        if uploaded_file:
            image = uploaded_file.read()
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            areas_to_redact_inbound = request.POST.get('areas_to_redact')
            areas_to_redact_inbound = json.loads(areas_to_redact_inbound)
            print('areas_to_redact_inbound', areas_to_redact_inbound)

            mask_method = request.POST.get('mask_method', 'blur_7x7')
            areas_to_redact = []
            for a2r in areas_to_redact_inbound:
                coords_dict = {
                    'start': tuple(a2r[0]), 
                    'end': tuple(a2r[1])
                }
                areas_to_redact.append(coords_dict)

            image_masker = ImageMasker()
            masked_image = image_masker.mask_all_regions(cv2_image, areas_to_redact, mask_method)
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

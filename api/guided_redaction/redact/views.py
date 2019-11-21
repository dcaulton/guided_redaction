import cv2
from urllib.parse import urlsplit
import os
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from django.http import HttpResponse, JsonResponse
from guided_redaction.redact.classes.ImageMasker import ImageMasker
import json
import numpy as np
import requests
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
        request_data = json.loads(request.body)
        if not request_data.get('image_url'):
            return HttpResponse('image_url is required', status=400)
        if not request_data.get('areas_to_redact'):
            return HttpResponse('areas_to_redact is required', status=400)
        pic_response = requests.get(request_data['image_url'])
        image = pic_response.content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            areas_to_redact_inbound = json.loads(request.body)['areas_to_redact']
            mask_method = json.loads(request.body).get('mask_method', 'blur_7x7')
            blur_foreground_background= json.loads(request.body).get('blur_foreground_background', 'foreground')

            areas_to_redact = []
            for a2r in areas_to_redact_inbound:
                coords_dict = {
                    'start': tuple(a2r[0]), 
                    'end': tuple(a2r[1])
                }
                areas_to_redact.append(coords_dict)

            image_masker = ImageMasker()
            masked_image = image_masker.mask_all_regions(
                cv2_image, areas_to_redact, mask_method, blur_foreground_background)
            image_bytes = cv2.imencode('.png', masked_image)[1].tostring()

            
            return_type = json.loads(request.body).get('return_type', 'inline')
            if return_type == 'inline':
                response = HttpResponse(content_type='image/png')
                new_name = 'image_' + str(uuid.uuid4()) + '.png'
                response['Content-Disposition'] = 'attachment; filename=' + new_name
                response.write(image_bytes)
                return response
            else:
                image_hash = str(uuid.uuid4())
                inbound_image_url = request_data['image_url']
                inbound_filename = (urlsplit(inbound_image_url)[2]).split('/')[-1]
                (file_basename, file_extension) = os.path.splitext(inbound_filename)
                new_filename = file_basename + '_redacted' + file_extension
                the_url = save_image_to_disk(masked_image, new_filename, image_hash)
                wrap = {
                  'redacted_image_url': the_url,
                  'original_image_url': request_data['image_url'],
                } 
                return JsonResponse(wrap)
        else:
            return HttpResponse('Upload an image as formdata, use key name of "image"', status=422)
    else:
        return HttpResponse("You're at the redact index.  You're gonna want to do a post though")

def save_image_to_disk(cv2_image, image_name, the_uuid):
    fw = FileWriter(working_dir=settings.FILE_STORAGE_DIR,
        base_url=settings.FILE_BASE_URL,
        use_image_blob_storage=settings.USE_IMAGEBLOB_STORAGE)
    workdir = fw.create_unique_directory(the_uuid)
    outfilename = os.path.join(workdir, image_name)
    file_url = fw.write_cv2_image_to_url(cv2_image, outfilename)
    return file_url

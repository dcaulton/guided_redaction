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
from rest_framework import viewsets
from rest_framework import viewsets
import requests
import uuid


class RedactViewSetRedactImage(viewsets.ViewSet):
    def create(self, request):
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
        if request.method == "POST":
            if not request.data.get("image_url"):
                return HttpResponse("image_url is required", status=400)
            if not request.data.get("areas_to_redact"):
                return HttpResponse("areas_to_redact is required", status=400)
            pic_response = requests.get(request.data["image_url"])
            image = pic_response.content
            if image:
                nparr = np.fromstring(image, np.uint8)
                cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                areas_to_redact_inbound = request.data['areas_to_redact']
                mask_method = request.data.get("mask_method", "blur_7x7")
                blur_foreground_background = request.data.get(
                    "blur_foreground_background", "foreground"
                )

                areas_to_redact = []
                for a2r in areas_to_redact_inbound:
                    coords_dict = {"start": tuple(a2r[0]), "end": tuple(a2r[1])}
                    areas_to_redact.append(coords_dict)

                image_masker = ImageMasker()
                masked_image = image_masker.mask_all_regions(
                    cv2_image, areas_to_redact, mask_method, blur_foreground_background
                )
                image_bytes = cv2.imencode(".png", masked_image)[1].tostring()

                return_type = request.data.get("return_type", "inline")
                if return_type == "inline":
                    response = HttpResponse(content_type="image/png")
                    new_name = "image_" + str(uuid.uuid4()) + ".png"
                    response["Content-Disposition"] = "attachment; filename=" + new_name
                    response.write(image_bytes)
                    return response
                else:
                    image_hash = str(uuid.uuid4())
                    inbound_image_url = request.data["image_url"]
                    inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
                    (file_basename, file_extension) = os.path.splitext(inbound_filename)
                    new_filename = file_basename + "_redacted" + file_extension
                    the_url = self.save_image_to_disk(
                        masked_image, new_filename, image_hash, request
                    )
                    wrap = {
                        "redacted_image_url": the_url,
                        "original_image_url": request.data["image_url"],
                    }
                    return JsonResponse(wrap)
            else:
                return HttpResponse(
                    'Upload an image as formdata, use key name of "image"', status=422
                )
        else:
            return HttpResponse(
                "You're at the redact index.  You're gonna want to do a post though"
            )

    def save_image_to_disk(self, cv2_image, image_name, the_uuid, request):
        the_connection_string = ""
        if settings.REDACT_IMAGE_STORAGE == "mysql":
            the_base_url = request.build_absolute_uri(settings.REDACT_MYSQL_BASE_URL)
        elif settings.REDACT_IMAGE_STORAGE == "azure_blob":
            the_base_url = settings.REDACT_AZURE_BASE_URL
            the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
        else:
            the_base_url = settings.REDACT_FILE_BASE_URL
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=the_base_url,
            connection_string=the_connection_string,
            image_storage=settings.REDACT_IMAGE_STORAGE,
        )
        workdir = fw.create_unique_directory(the_uuid)
        outfilename = os.path.join(workdir, image_name)
        file_url = fw.write_cv2_image_to_url(cv2_image, outfilename)
        return file_url

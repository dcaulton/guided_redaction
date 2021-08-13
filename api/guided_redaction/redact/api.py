import os
import requests
from traceback import format_exc
from urllib.parse import urlsplit
import uuid

import cv2
from django.conf import settings
from django.http import HttpResponse
import numpy as np
from rest_framework.response import Response

from base import viewsets
from guided_redaction.redact.classes.DataSynthesizer import DataSynthesizer
from guided_redaction.redact.classes.ImageIllustrator import ImageIllustrator
from guided_redaction.redact.classes.ImageMasker import ImageMasker
from guided_redaction.redact.classes.TextEraser import TextEraser
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_movie import RedactMovieController
from .controller_illustrate import IllustrateController


requests.packages.urllib3.disable_warnings()

def save_image_to_cache(cv2_image, image_name, the_uuid):
    fw = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=settings.REDACT_FILE_BASE_URL,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    workdir = fw.create_unique_directory(the_uuid)
    outfilename = os.path.join(workdir, image_name)
    file_url = fw.write_cv2_image_to_filepath(cv2_image, outfilename)
    return file_url

def get_uuid_from_url(the_url):
    (x_part, file_part) = os.path.split(the_url)
    (y_part, uuid_part) = os.path.split(x_part)
    return uuid_part


class RedactViewSetRedactT1Movie(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movie_url"):
            return self.error("movie_url is required")
        if not request_data.get("movie"):
            return self.error("movie is required")
        if not request_data.get("source_movie"):
            return self.error("source_movie is required")
        if not request_data.get("redact_rule"):
            return self.error("redact_rule is required")
        if 'mask_method' not in request_data['redact_rule']:
            return self.error("mask_method is required")

        worker = RedactMovieController()
        redacted_movie = worker.redact_movie(request_data)

        return Response(redacted_movie)

class RedactViewSetRedactImage(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required")
        if not request_data.get("areas_to_redact"):
            return self.error("areas_to_redact is required")
        if not request_data.get("redact_rule"):
            return self.error("redact_rule is required")
        if 'mask_method' not in request_data['redact_rule']:
            return self.error("mask_method is required")
        try:
            pic_response = requests.get(
              request_data["image_url"],
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            image = pic_response.content
            if not image:
                return self.error(
                    'Upload an image as formdata, use key name of "image"', 
                    status_code=422
                )
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            areas_to_redact_inbound = request_data['areas_to_redact']
            areas_to_redact = []
            for a2r in areas_to_redact_inbound:
                if 'start' in a2r and 'end' in a2r:
                    coords_dict = {
                        "start": tuple(a2r['start']), 
                        "end": tuple(a2r['end']),
                    }
                elif 'location' in a2r and 'size' in a2r:
                    coords_dict = {
                        "start": tuple(a2r['location']), 
                        "end": tuple((
                            a2r['location'][0] + a2r['size'][0],
                            a2r['location'][1] + a2r['size'][1]
                        ))
                    }
                areas_to_redact.append(coords_dict)


            if request_data['redact_rule']['mask_method'] == 'text_eraser':
                masker = TextEraser(request_data['redact_rule'])
                masked_image = masker.mask_all_regions(
                    cv2_image, areas_to_redact
                )
            elif request_data['redact_rule']['mask_method'] == 'data_synthesizer':
                synthesizer = DataSynthesizer(request_data['redact_rule'])
                masked_image = synthesizer.synthesize_data(
                    cv2_image, 
                    request_data['areas_to_redact']
                )
            else:
                image_masker = ImageMasker()
                masked_image = image_masker.mask_all_regions(
                    cv2_image, areas_to_redact, request_data['redact_rule']['mask_method']
                )

            if 'return_type' in request_data['meta']:
                return_type = request_data['meta']['return_type']
            else:
                return_type = 'inline'
            if return_type == "inline":
                image_bytes = cv2.imencode(".png", masked_image)[1].tostring()
                #TODO FIX THIS WHEN THE REST OF THE API IS STABLE AND WE CAN RESEARCH
                response = HttpResponse(content_type="image/png")
                new_name = "image_" + str(uuid.uuid4()) + ".png"
                response["Content-Disposition"] = "attachment; filename=" + new_name
                response.write(image_bytes)
                return response
            else:
                image_hash = str(uuid.uuid4())
                if ('preserve_working_dir_across_batch' in request_data['meta'] and
                        request_data['meta']['preserve_working_dir_across_batch']):
                    image_hash = get_uuid_from_url(request_data['image_url'])
                inbound_image_url = request_data["image_url"]
                inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
                (file_basename, file_extension) = os.path.splitext(inbound_filename)
                new_filename = file_basename + "_redacted" + file_extension
                the_url = save_image_to_cache(
                    masked_image, new_filename, image_hash
                )
                return Response({
                    "redacted_image_url": the_url,
                    "original_image_url": request_data["image_url"],
                })
        except Exception as err:
            print(format_exc())
            return self.error('exception occurred while redacting image')


class RedactViewSetIllustrateImage(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required")
        if not request_data.get("illustration_data"):
            return self.error("illustration_data is required")

        worker = IllustrateController()
        response_data = worker.illustrate_image(request_data)
        return Response(response_data)

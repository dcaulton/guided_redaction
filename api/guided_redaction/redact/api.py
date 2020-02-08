import cv2
from urllib.parse import urlsplit
import os
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.redact.classes.ImageMasker import ImageMasker
import numpy as np
from base import viewsets
from rest_framework.response import Response
import requests
import uuid


def save_image_to_disk(cv2_image, image_name, the_uuid):
    the_connection_string = ""
    if settings.REDACT_IMAGE_STORAGE == "azure_blob":
        the_base_url = settings.REDACT_AZURE_BASE_URL
        the_connection_string = settings.REDACT_AZURE_BLOB_CONNECTION_STRING
    else:
        the_base_url = settings.REDACT_FILE_BASE_URL
    fw = FileWriter(
        working_dir=settings.REDACT_FILE_STORAGE_DIR,
        base_url=the_base_url,
        connection_string=the_connection_string,
        image_storage=settings.REDACT_IMAGE_STORAGE,
        image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
    )
    workdir = fw.create_unique_directory(the_uuid)
    outfilename = os.path.join(workdir, image_name)
    file_url = fw.write_cv2_image_to_url(cv2_image, outfilename)
    return file_url

class RedactViewSetRedactImage(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required")
        if not request_data.get("areas_to_redact"):
            return self.error("areas_to_redact is required")
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            areas_to_redact_inbound = request_data['areas_to_redact']
            mask_method = request_data.get("mask_method", "blur_7x7")
            blur_foreground_background = request_data.get(
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

            return_type = request_data.get("return_type", "inline")
            if return_type == "inline":
                image_bytes = cv2.imencode(".png", masked_image)[1].tostring()
                #TODO FIX THIS WHEN THE REST OF THE API IS STABLE AND WE CAN RESEARCH
                from django.http import HttpResponse
                response = HttpResponse(content_type="image/png")
                new_name = "image_" + str(uuid.uuid4()) + ".png"
                response["Content-Disposition"] = "attachment; filename=" + new_name
                response.write(image_bytes)
                return response
            else:
                image_hash = str(uuid.uuid4())
                if ('preserve_working_dir_across_batch' in request_data and
                        request_data['preserve_working_dir_across_batch'] == 'true' and
                        request_data['working_dir']):
                    image_hash = request_data['working_dir']
                inbound_image_url = request_data["image_url"]
                inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
                (file_basename, file_extension) = os.path.splitext(inbound_filename)
                new_filename = file_basename + "_redacted" + file_extension
                the_url = save_image_to_disk(
                    masked_image, new_filename, image_hash
                )
                return Response({
                    "redacted_image_url": the_url,
                    "original_image_url": request_data["image_url"],
                })
        else:
            return self.error(
                'Upload an image as formdata, use key name of "image"', status_code=422
            )


class RedactViewSetIllustrateImage(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required")
        if not request_data.get("illustration_data"):
            return self.error("illustration_data is required")
        inbound_image_url = request_data["image_url"]
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            ill_data = request_data.get('illustration_data')
            ill_type = ill_data.get('type')
            color_in = ill_data.get('color', '#00FF00')
            color_red = int('0x' + color_in[5:7], 16)
            color_green = int('0x' + color_in[3:5], 16)
            color_blue = int('0x' + color_in[1:3], 16)
            color = (color_red, color_green, color_blue)
            shade_outside = ill_data.get('shade_outside', False)
            line_width = int(ill_data.get('line_width', 5))
            background_darken_ratio = float(ill_data.get('background_darken_ratio', .5))
            beta = float(1.0 - background_darken_ratio)
            if ill_type == 'oval':
                center = ill_data.get('center')
                radius_x = ill_data.get('radius_x')
                radius_y = ill_data.get('radius_y')
                (centerX, centerY) = (int(center[0]), int(center[1]))
                (axesX, axesY) = (int(radius_x), int(radius_y))
                illustrated_image = cv2_image.copy()
                if shade_outside:
                    overlay = np.zeros(cv2_image.shape, dtype='uint8')
                    cv2.ellipse(overlay, (centerX, centerY), (axesX, axesY), 0.0, 0.0, 360.0, (255, 255, 255), -1)
                    highlighted_region_only = cv2.bitwise_and(overlay, illustrated_image)
                    illustrated_image = cv2.addWeighted(
                        highlighted_region_only, 
                        background_darken_ratio, 
                        illustrated_image, 
                        beta, 
                        0, 
                        illustrated_image
                    )
                illustrated_image = cv2.ellipse(
                    illustrated_image, 
                    (centerX, centerY), 
                    (axesX, axesY), 
                    0.0, 
                    0.0, 
                    360.0, 
                    color, 
                    line_width
                )

            elif ill_type == 'box':
                start = ill_data.get('start')
                end = ill_data.get('end')
                (startX, startY) = (int(start[0]), int(start[1]))
                (endX, endY) = (int(end[0]), int(end[1]))
                illustrated_image = cv2_image.copy()
                if shade_outside:
                    overlay = np.zeros(cv2_image.shape, dtype='uint8')
                    cv2.rectangle(overlay, (startX, startY), (endX, endY), (255, 255, 255), -1)
                    highlighted_region_only = cv2.bitwise_and(overlay, illustrated_image)
                    illustrated_image = cv2.addWeighted(
                        highlighted_region_only, 
                        background_darken_ratio, 
                        illustrated_image, 
                        beta, 
                        0, 
                        illustrated_image
                    )
                illustrated_image = cv2.rectangle(
                    illustrated_image, 
                    (startX, startY), 
                    (endX, endY), 
                    color, 
                    line_width
                )

            else:
                print('unknown illustration type')
                illustrated_image = cv2_image

            return_type = request_data.get("return_type", "not_inline")
            if return_type == "inline":
                image_bytes = cv2.imencode(".png", illustrated_image)[1].tostring()
                #TODO FIX THIS WHEN THE REST OF THE API IS STABLE AND WE CAN RESEARCH
                from django.http import HttpResponse
                response = HttpResponse(content_type="image/png")
                new_name = "image_" + str(uuid.uuid4()) + ".png"
                response["Content-Disposition"] = "attachment; filename=" + new_name
                response.write(image_bytes)
                return response
            else:
                image_hash = str(uuid.uuid4())
                if ('preserve_working_dir_across_batch' in request_data and
                        request_data['preserve_working_dir_across_batch'] == 'true' and
                        request_data['working_dir']):
                    image_hash = request_data['working_dir']
                inbound_filename = (urlsplit(inbound_image_url)[2]).split("/")[-1]
                (file_basename, file_extension) = os.path.splitext(inbound_filename)
                new_filename = file_basename + "_illustrated" + file_extension
                the_url = save_image_to_disk(illustrated_image, new_filename, image_hash)
                return Response({
                    "illustrated_image_url": the_url,
                    "original_image_url": request_data["image_url"],
                })
        else:
            return self.error(
                'unable to retrieve image specified by inbound image_url', 
                status_code=422
            )

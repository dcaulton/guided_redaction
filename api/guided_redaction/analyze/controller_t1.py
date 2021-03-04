import base64
import os
import cv2
import numpy as np
import requests
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter


class T1Controller:

    max_num_regions_before_mask_is_smarter = 5

    def get_cv2_image_from_url(self, image_url, file_writer=None):
        cv2_image = None
        if not file_writer:
            file_writer = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
        file_fullpath = file_writer.get_file_path_for_url(image_url)
        if os.path.exists(file_fullpath):
            image = file_writer.read_binary_data_from_filepath(file_fullpath)
        else:
            image = requests.get(
              image_url,
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            ).content
        if image:
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2_image

    def get_frameset_hash_for_frame(self, frame, framesets):
        for frameset_hash in framesets:
            if frameset_hash not in framesets or 'images' not in framesets[frameset_hash]:
                return
            if frame in framesets[frameset_hash]['images']:
                return frameset_hash

    def get_frameset_hashes_in_order(self, frames, framesets):
        ret_arr = []
        for frame in frames:
            frameset_hash = self.get_frameset_hash_for_frame(frame, framesets)
            if frameset_hash and frameset_hash not in ret_arr:
                ret_arr.append(frameset_hash)
        return ret_arr

    def adjust_start_end_origin_for_t1(self, coords_in, tier_1_frameset, ocr_rule):
        adjusted_coords = {}
        adjusted_coords['start'] = coords_in['start']
        adjusted_coords['end'] = coords_in['end']
        adjusted_coords['origin'] = coords_in['origin']
        if 'images' in tier_1_frameset: # its just a virgin frameset, not t1 output
            return adjusted_coords
        match_app_id = ''
        if 'app_id' in ocr_rule['attributes']:
            match_app_id = ocr_rule['attributes']['app_id']
        for subscanner_key in tier_1_frameset:
            if match_app_id and 'app_id' in tier_1_frameset[subscanner_key] and \
                tier_1_frameset[subscanner_key]['app_id'] != match_app_id:
                continue
            subscanner = tier_1_frameset[subscanner_key]
            if subscanner['scanner_type'] == 'selected_area':
                if 'location' in subscanner and 'size' in subscanner:
                    print('adjusting ocr coords by sa location for {}'.format(subscanner_key))
                    adjusted_coords['start'] = subscanner['location']
                    adjusted_coords['end'] = [
                        subscanner['location'][0] + subscanner['size'][0],
                        subscanner['location'][1] + subscanner['size'][1]
                    ]
                return adjusted_coords
            if 'location' in subscanner and 'origin' in coords_in:
                disp_x = subscanner['location'][0] - coords_in['origin'][0]
                disp_y = subscanner['location'][1] - coords_in['origin'][1]
                if abs(disp_x) or abs(disp_y):
                    print('adjusting ocr coords by non sa location {}, {}'.format(disp_x, disp_y))
                    adjusted_coords['start'] = [
                        adjusted_coords['start'][0] + disp_x,
                        adjusted_coords['start'][1] + disp_y
                    ]
                    adjusted_coords['end'] = [
                        adjusted_coords['end'][0] + disp_x,
                        adjusted_coords['end'][1] + disp_y
                    ]
                    adjusted_coords['origin'] = [
                        adjusted_coords['origin'][0] + disp_x,
                        adjusted_coords['origin'][1] + disp_y 
                    ]
                return adjusted_coords
            # TODO this seems redundant if we don't limit above to SA
            if 'start' in subscanner and 'end' in subscanner:
                print('adjusting ocr coords by non sa start end')
                adjusted_coords['start'] = subscanner['start']
                adjusted_coords['end'] = subscanner['end']
                return adjusted_coords
        return adjusted_coords

    def get_base64_image_string(self, cv2_image):
        image_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
        image_base64 = base64.b64encode(image_bytes)
        image_base64_string = image_base64.decode('utf-8')
        return image_base64_string

    def get_cv2_image_from_base64_string(self, img_base64):
        img_bytes = base64.b64decode(img_base64)
        nparr = np.fromstring(img_bytes, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2_image

    def we_should_use_a_mask(self, scanner_meta, num_regions):
        # if the regions are complicated enough, or a mask has been requested, return True
        if scanner_meta['masks_always']:
            return True
        if num_regions > self.max_num_regions_before_mask_is_smarter:
            return True

    def apply_t1_limits_to_source_image(self, cv2_image, t1_frameset_data):
        for mo_id in t1_frameset_data:
            match_obj = t1_frameset_data[mo_id]
            if 'mask' in match_obj:
                mask_image = self.get_cv2_image_from_base64_string(match_obj['mask'])
                cv2_image = cv2.bitwise_and(cv2_image, mask_image)
            else:
                mask_image = np.zeros(cv2_image.shape, dtype='uint8')
                zone_start = zone_end = None
                if 'location' in match_obj:
                    zone_start = tuple(match_obj['location'])
                    zone_end = (
                        match_obj['location'][0] + match_obj['size'][0],
                        match_obj['location'][1] + match_obj['size'][1]
                    )
                elif 'start' in match_obj:
                    zone_start = tuple(match_obj['start'])
                    zone_end = tuple(match_obj['end'])
                if zone_start and zone_end:
                    cv2.rectangle(
                        mask_image,
                        zone_start,
                        zone_end,
                        255,
                        -1
                    )
                    cv2_image = cv2.bitwise_and(cv2_image, mask_image)
        return cv2_image

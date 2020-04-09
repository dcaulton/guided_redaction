import cv2
import random
import math
import datetime
from urllib.parse import urlsplit
import uuid
import os
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.TelemetryAnalyzer import TelemetryAnalyzer
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
import json
import base64
import numpy as np
from django.conf import settings
from django.shortcuts import render
import re
import requests
from base import viewsets
from rest_framework.response import Response
from guided_redaction.utils.classes.FileWriter import FileWriter


def adjust_start_end_origin_for_t1(coords_in, tier_1_frameset):
    adjusted_coords = {}
    adjusted_coords['start'] = coords_in['start']
    adjusted_coords['end'] = coords_in['end']
    adjusted_coords['origin'] = coords_in['origin']
    if 'images' in tier_1_frameset: # its just a virgin frameset, not t1 output
        return adjusted_coords
    for subscanner_key in tier_1_frameset:
        subscanner = tier_1_frameset[subscanner_key]
        if subscanner['scanner_type'] == 'selected_area':
            print('adjusting coords by sa location')
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
        if 'start' in subscanner and 'end' in subscanner:
            print('adjusting ocr coords by non sa start end')
            adjusted_coords['start'] = subscanner['start']
            adjusted_coords['end'] = subscanner['end']
            return adjusted_coords
    return adjusted_coords

class AnalyzeViewSetOcr(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required", status_code=400)
        if not request_data.get("ocr_rule"):
            return self.error("ocr_rule is required", status_code=400)
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return self.error("couldnt read image data", status_code=422)
        ocr_rule = request_data['ocr_rule']

        analyzer = EastPlusTessGuidedAnalyzer()
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        box_coords = {
            'start': ocr_rule['start'],
            'end': ocr_rule['end'],
            'origin': ocr_rule['origin_entity_location'],
        }
        adjusted_coords = adjust_start_end_origin_for_t1(box_coords, request_data.get('tier_1_data'))
        start = adjusted_coords['start']
        end = adjusted_coords['end']
        origin = adjusted_coords['origin']
        if ocr_rule['skip_east']:
            tight_image = cv2_image[
                start[1]:end[1], 
                start[0]:end[0]
            ]
            gray = cv2.cvtColor(tight_image, cv2.COLOR_BGR2GRAY)
            bg_color = gray[1,1]
            if bg_color < 100:  # its light text on dark bg, invert
                gray = cv2.bitwise_not(gray)
            raw_recognized_text_areas = analyzer.analyze_text(
                gray, 
                [start, end],
                processing_mode='tess_only'
            )
        else:
            raw_recognized_text_areas = analyzer.analyze_text(
                cv2_image, [start, end]
            )

        recognized_text_areas = {}
        for raw_rta in raw_recognized_text_areas:
            the_id = 'rta_' + str(random.randint(100000000, 999000000))
            
            if 'start' in raw_rta and 'end' in raw_rta:
                # we used east, so coords come with the ocr results
                size = [
                    raw_rta['end'][0]-raw_rta['start'][0], 
                    raw_rta['end'][1]-raw_rta['start'][1] 
                ]
                returned_start_coords = raw_rta['start']
            else:
                # 'skip east' requested, use adjusted box coords
                size = [
                    end[0] - start[0],
                    end[1] - start[1]
                ]
                returned_start_coords = start
                
            recognized_text_areas[the_id] = {
                'source': raw_rta['source'],
                'location': returned_start_coords,
                'size': size,
                'origin': adjusted_coords['origin'],
                'scale': 1,
                'scanner_type': 'ocr',
                'text': raw_rta['text']
            }

        return Response(recognized_text_areas)


class AnalyzeViewSetScanTemplate(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def get_match_image_for_anchor(self, anchor):
        if 'cropped_image_bytes' in anchor:
            img_base64 = anchor['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2_image
        else:
            pic_response = requests.get(
              anchor["image"],
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            image = pic_response.content
            if not image:
                return self.error("couldn't read source image data", status_code=422)

            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            start = anchor.get("start")
            end = anchor.get("end")
            match_image = cv2_image[start[1] : end[1], start[0] : end[0]]
            return match_image

    def process_create_request(self, request_data):
        matches = {}
        if not request_data.get("templates"):
            return self.error("templates is required")
        if not request_data.get("movies"):
            return self.error("movies is required")
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
          source_movies = movies['source']
          del movies['source']
        template_id = list(request_data.get('templates').keys())[0]
        template = request_data.get('templates')[template_id]
        template_matcher = TemplateMatcher(template)
        match_statistics = {}
        for anchor in template.get("anchors"):
            match_image = self.get_match_image_for_anchor(anchor)
            start = anchor.get("start")
            end = anchor.get("end")
            size = (end[0] - start[0], end[1] - start[1])
            anchor_id = anchor.get("id")
            match_statistics[anchor_id] = {'movies': {}}
            for movie_url in movies:
                movie = movies[movie_url]
                if not movie:
                    print('no movie error for {}'.format(movie_url))
                    continue
                match_statistics[anchor_id]['movies'][movie_url] = {'framesets': {}}
                framesets = movie["framesets"]
                for frameset_hash in framesets:
                    frameset = framesets[frameset_hash]
                    match_statistics[anchor_id]['movies'][movie_url]['framesets'][frameset_hash] = {}
                    if 'images' in frameset:
                        one_image_url = frameset["images"][0]
                    else:
                        one_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
                    oi_response = requests.get(
                      one_image_url,
                      verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
                    )
                    one_image = oi_response.content
                    if one_image:
                        oi_nparr = np.fromstring(one_image, np.uint8)
                        target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                        target_image = self.trim_target_image_to_t1_inputs(target_image, frameset)
                        match_obj = template_matcher.get_template_coords(
                            target_image, match_image
                        )
                        if 'save_match_statistics' in template and template['save_match_statistics']:
                            match_statistics[anchor_id]['movies'][movie_url]['framesets'][frameset_hash] = match_obj['match_metadata']

                        if match_obj['match_found']:
                            (temp_coords, temp_scale) = match_obj['match_coords']
                            if 'movies' not in matches:
                                matches['movies'] = {}
                            if movie_url not in matches['movies']:
                                matches['movies'][movie_url] = {}
                                matches['movies'][movie_url]['framesets'] = {}
                            if frameset_hash not in matches['movies'][movie_url]['framesets']:
                                matches['movies'][movie_url]['framesets'][frameset_hash] = {}
                            matches['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = {}
                            matches_for_anchor = \
                                matches['movies'][movie_url]['framesets'][frameset_hash][anchor_id]
                            matches_for_anchor['location'] = temp_coords
                            matches_for_anchor['size'] = size
                            matches_for_anchor['scale'] = temp_scale
                            matches_for_anchor['scanner_type'] = 'template'
        if 'save_match_statistics' in template and template['save_match_statistics']:
            matches['statistics'] = match_statistics
        return Response(matches)

    #TODO make sure this works, a unit test would be nice
    def trim_target_image_to_t1_inputs(self, target_image, tier_1_record):
        if len(tier_1_record.keys()) == 1 and list(tier_1_record.keys())[0] == 'image':
            return target_image # it's a virgin frameset, not t1
        for t1_subscanner_id in tier_1_record:
            t1_subscanner = tier_1_record[t1_subscanner_id]
            if 'location' in t1_subscanner  \
                and 'size' in t1_subscanner \
                and t1_subscanner['scanner_type'] == 'selected_area':
                start = t1_subscanner['location']
                end = [
                    t1_subscanner['location'][0] + t1_subscanner['size'][0],
                    t1_subscanner['location'][1] + t1_subscanner['size'][1],
                ]
                height = target_image.shape[0]
                width = target_image.shape[1]
                cv2.rectangle(
                    target_image,
                    (0,0),
                    (start[0], height),
                    (0, 0, 0),
                    -1,
                )
                cv2.rectangle(
                    target_image,
                    (end[0],0),
                    (width, height),
                    (0, 0, 0),
                    -1,
                )
                cv2.rectangle(
                    target_image,
                    (0,0),
                    (width, start[1]),
                    (0, 0, 0),
                    -1,
                )
                cv2.rectangle(
                    target_image,
                    (start[0],end[1]),
                    (end[0], height),
                    (0, 0, 0),
                    -1,
                )
                return target_image
        return target_image


class AnalyzeViewSetSelectedArea(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        response_movies = {}
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("selected_area_meta"):
            return self.error("selected_area_meta is required")

        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
          source_movies = movies['source']
          del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]

        selected_area_meta = request_data["selected_area_meta"]
        finder = ExtentsFinder()
        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        for frameset_hash in movie['framesets']:
            frameset = movie['framesets'][frameset_hash]
            if 'images' in frameset:
                image_url = frameset['images'][0]
            else:
                image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            image = requests.get(
              image_url,
              verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            ).content
            if not image:
                return self.error("couldnt read image data", status_code=422)
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            regions_for_image = {'regions': [], 'origin': [0,0]}
            offset = self.get_offset_for_t1(selected_area_meta, frameset)
            if self.frameset_is_t1_output(frameset):
                regions_for_image = self.process_t1_results(
                    frameset, 
                    cv2_image, 
                    selected_area_meta, 
                    finder, 
                    offset
                )
            else:
                regions_for_image = self.process_virgin_image(
                    frameset, 
                    cv2_image, 
                    selected_area_meta, 
                    finder, 
                    offset
                )
            regions_as_hashes = {}
            if regions_for_image and regions_for_image[0]['regions']:
                if selected_area_meta['interior_or_exterior'] == 'exterior':
                    regions_for_image = \
                        self.transform_interior_selection_to_exterior(
                            regions_for_image, 
                            cv2_image
                        )
                for region in regions_for_image:
                    size = [
                        region['regions'][1][0] - region['regions'][0][0], 
                        region['regions'][1][1] - region['regions'][0][1]
                    ]
                    region_hash = {
                        'location': region['regions'][0],
                        'origin': region['origin'],
                        'scale': 1,
                        'size': size,
                        "scanner_type": "selected_area",
                    }
                    regions_as_hashes[region['sam_area_id']] = region_hash
            if 'minimum_zones' in selected_area_meta and selected_area_meta['minimum_zones']:
                regions_as_hashes = self.append_min_zones(selected_area_meta, regions_as_hashes, offset)
            if regions_as_hashes:
                response_movies[movie_url]['framesets'][frameset_hash] = regions_as_hashes
        return Response({"movies": response_movies})

    def append_min_zones(self, selected_area_meta, regions_as_hashes, offset):
        for minimum_zone in selected_area_meta['minimum_zones']:
            size_arr =[
                minimum_zone['end'][0] - minimum_zone['start'][0],
                minimum_zone['end'][1] - minimum_zone['start'][1],
            ]
            location = [
                minimum_zone['start'][0] + offset[0],
                minimum_zone['start'][1] + offset[1]
            ]
            region_hash = {
                'location': location,
                'scale': 1,
                'size': size_arr,
                "scanner_type": "selected_area",
            }
            regions_as_hashes[minimum_zone['id']] = region_hash
        return regions_as_hashes
            

    def process_t1_results(self, frameset, cv2_image, selected_area_meta, finder, offset):
        regions_for_image = []
        tolerance = int(selected_area_meta['tolerance'])
        for scanner_matcher_id in frameset:
            match_data = {}
            regions_for_image = []
            if selected_area_meta['origin_entity_type'] == 'template_anchor':
                if selected_area_meta['origin_entity_id'] == scanner_matcher_id:
                    match_data = frameset[scanner_matcher_id]
            else:
                match_data = frameset[scanner_matcher_id]
            if 'location' in match_data:
                found_location = match_data['location']
            for area in selected_area_meta['areas']:
                selected_point = area['center']
                offset = self.get_offset_for_t1(selected_area_meta, frameset)
                selected_point = [
                    selected_point[0] + offset[0],
                    selected_point[1] + offset[1]
                ]
                if selected_area_meta['select_type'] == 'arrow':
                    regions = finder.determine_arrow_fill_area(
                        cv2_image, selected_point, tolerance
                    )
                    regions_for_image.append({
                        'regions': regions, 
                        'origin': selected_point,
                        'sam_area_id': area['id'],
                    })
                if selected_area_meta['select_type'] == 'flood':
                    regions = finder.determine_flood_fill_area(
                        cv2_image, selected_point, tolerance
                    )
                    regions_for_image.append(regions)
                    regions_for_image.append({
                        'regions': regions, 
                        'origin': selected_point,
                        'sam_area_id': area['id'],
                    })
        return regions_for_image

    def process_virgin_image(self, frameset, cv2_image, selected_area_meta, finder, offset):
        regions_for_image = []
        tolerance = int(selected_area_meta['tolerance'])
        for area in selected_area_meta['areas']:
            selected_point = area['center']
            if selected_area_meta['select_type'] == 'arrow':
                regions = finder.determine_arrow_fill_area(
                    cv2_image, selected_point, tolerance
                )
                regions_for_image.append({
                    'regions': regions, 
                    'origin': selected_point,
                    'sam_area_id': area['id'],
                })
            if selected_area_meta['select_type'] == 'flood':
                regions = finder.determine_flood_fill_area(
                    cv2_image, selected_point, tolerance
                )
                regions_for_image.append(regions)
                regions_for_image.append({
                    'regions': regions, 
                    'origin': selected_point,
                    'sam_area_id': area['id'],
                })
        return regions_for_image

    def frameset_is_t1_output(self, frameset):
        if 'images' in frameset:
            return False
        return True

    def get_offset_for_t1(self, selected_area_meta, frameset):
        if 'origin_entity_location' in selected_area_meta:
            for anchor_id in frameset:
                anchor = frameset[anchor_id]
                if 'location' in anchor:
                    disp_x = anchor['location'][0] - selected_area_meta['origin_entity_location'][0]
                    disp_y = anchor['location'][1] - selected_area_meta['origin_entity_location'][1]
                    return [disp_x, disp_y]
        return [0, 0]

    def transform_interior_selection_to_exterior(self, regions_for_image, cv2_image):
        if len(regions_for_image) == 1:
            start_x = min(regions_for_image['regions'][0][0][0], regions_for_image['regions'][0][1][0])
            end_x = max(regions_for_image['regions'][0][0][0], regions_for_image['regions'][0][1][0])
            start_y = min(regions_for_image['regions'][0][0][1], regions_for_image['regions'][0][1][1])
            end_y = max(regions_for_image['regions'][0][0][1], regions_for_image['regions'][0][1][1])
            new_regions = {
              'regions': [],
              'origin': regions_for_image['origin'],
            }
            height = cv2_image.shape[0]
            width = cv2_image.shape[1]
            r1 = [[0,0], [width,start_y]]
            r2 = [[0,start_y], [start_x,end_y]]
            r3 = [[end_x,start_y], [width,end_y]]
            r4 = [[0,end_y], [width,height]]
            new_regions['regions'].append(r1)
            new_regions['regions'].append(r2)
            new_regions['regions'].append(r3)
            new_regions['regions'].append(r4)
            return new_regions
        return regions_for_image


class AnalyzeViewSetFilter(viewsets.ViewSet):
    def build_result_file_name(self, image_url):
        inbound_filename = (urlsplit(image_url)[2]).split("/")[-1]
        (file_basename, file_extension) = os.path.splitext(inbound_filename)
        new_filename = file_basename + "_filtered" + file_extension
        return new_filename

    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        response_movies = {}
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("filter_parameters"):
            return self.error("filter_parameters is required")

        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        for movie_url in request_data.get("movies"):
            response_movies[movie_url] = {
                'framesets': {},
            }
            movie = request_data.get('movies')[movie_url]
            frames = movie['frames']
            framesets = movie['framesets']

            ordered_hashes = self.get_frameset_hashes_in_order(frames, framesets)
            workdir_uuid = str(uuid.uuid4())
            workdir = fw.create_unique_directory(workdir_uuid)
            for index, frameset_hash in enumerate(ordered_hashes):
                if index > 0:
                    cur_image_url = framesets[frameset_hash]['images'][0]
                    cur_img_bin = requests.get(cur_image_url).content
                    if not cur_img_bin:
                        return self.error("couldn't read source image data: ".cur_image_url, status_code=422)
                    nparr = np.fromstring(cur_img_bin, np.uint8)
                    cur_image_cv2 = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    cur_image_cv2 = cv2.cvtColor(cur_image_cv2, cv2.COLOR_BGR2GRAY)

                    prev_hash = ordered_hashes[index-1]
                    prev_image_url = framesets[prev_hash]['images'][0]
                    prev_img_bin = requests.get(prev_image_url).content
                    if not prev_img_bin:
                        return self.error("couldn't read source image data: ".prev_image_url, status_code=422)
                    nparr = np.fromstring(prev_img_bin, np.uint8)
                    prev_image_cv2 = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    prev_image_cv2 = cv2.cvtColor(prev_image_cv2, cv2.COLOR_BGR2GRAY)

                    filtered_image_cv2= cv2.subtract(prev_image_cv2, cur_image_cv2)
                    new_file_name = self.build_result_file_name(cur_image_url)
                    outfilename = os.path.join(workdir, new_file_name)
                    file_url = fw.write_cv2_image_to_filepath(filtered_image_cv2, outfilename)
                    response_movies[movie_url]['framesets'][frameset_hash] = file_url

        return Response({'movies': response_movies})

    def get_frameset_hash_for_frame(self, frame, framesets):
        for frameset_hash in framesets:
            if frame in framesets[frameset_hash]['images']:
                return frameset_hash

    def get_frameset_hashes_in_order(self, frames, framesets):
        ret_arr = []
        for frame in frames:
            frameset_hash = self.get_frameset_hash_for_frame(frame, framesets)
            if frameset_hash and frameset_hash not in ret_arr:
                ret_arr.append(frameset_hash)
        return ret_arr

class AnalyzeViewSetTelemetry(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("telemetry_data"):
            return self.error("telemetry_data is required")
        if not request_data.get("telemetry_rule"):
            return self.error("telemetry_rule is required")
        movies = request_data["movies"]
        telemetry_rule = request_data["telemetry_rule"]
        telemetry_data = request_data["telemetry_data"]
        if 'raw_data_url' not in telemetry_data.keys():
            return self.error("telemetry raw data is required")
        if 'movie_mappings' not in telemetry_data.keys():
            return self.error("telemetry movie mappings is required")
        movie_mappings = telemetry_data['movie_mappings']
        analyzer = TelemetryAnalyzer()
        matching_frames = {}
        matching_frames['movies'] = {}

        telemetry_raw_data = requests.get(
          telemetry_data['raw_data_url'],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).text
        telemetry_data = telemetry_raw_data.split('\n')
        if telemetry_data:
            for movie_url in movies.keys():
                print('scanning telemetry data for movie {}'.format(movie_url))
                matching_frames_for_movie = []
                movie_filename = movie_url.split('/')[-1]
                movie_id = movie_filename.split('.')[0]
                if movie_id not in movie_mappings:
                    print('cannot find recording id for movie url {}, {}, skipping'.format(movie_url, movie_id ))
                    continue
                movie = movies[movie_url]
                transaction_id = movie_mappings[movie_id]
                relevant_telemetry_rows = self.get_relevant_telemetry_rows(transaction_id, telemetry_data)
                if relevant_telemetry_rows:
                    matching_frames_for_movie = analyzer.find_matching_frames(
                        movie_url=movie_url,
                        movie=movie, 
                        telemetry_data=relevant_telemetry_rows, 
                        telemetry_rule=telemetry_rule
                    )
                matching_frames['movies'][movie_url] = matching_frames_for_movie

        return Response(matching_frames)

    def get_relevant_telemetry_rows(self, transaction_id, telemetry_data):
        matching_rows = []
        regex = re.compile(transaction_id.upper())
        for row in telemetry_data:
            if regex.search(row):
                matching_rows.append(row)
        return matching_rows

class AnalyzeViewSetTimestamp(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        response_obj = {}
        analyzer = EastPlusTessGuidedAnalyzer(debug=False)
        movies = request_data.get('movies')
        for movie_url in movies:
            response_obj[movie_url] = {}
            if 'frames' not in movies[movie_url]:
                print('movie {} was not already split into frames'.format(movie_url))
                continue
            blue_screen_timestamp = self.get_timestamp_from_blue_screen(movies[movie_url], analyzer)
            if blue_screen_timestamp:
                response_obj[movie_url] = blue_screen_timestamp
            else:
                taskbar_timestamp = self.get_timestamp_from_task_bar(movies[movie_url], analyzer)
                if taskbar_timestamp:
                    response_obj[movie_url] = taskbar_timestamp
        return Response(response_obj)

    def get_timestamp_from_blue_screen(self, movie, analyzer):
        image_url = movie['frames'][0]
        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return self.error('could not retrieve the first frame for '+movie_url)
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if not self.screen_is_blue_screen(cv2_image):
          return
        print('looking for timestamp from blue screen')
        recognized_text_areas = analyzer.analyze_text(
            cv2_image,
            [(0, 0), (cv2_image.shape[1], cv2_image.shape[0])]
        )
        for rta in recognized_text_areas:
            blue_screen_regex = re.compile('(\d+):(\d+):(\d+) ([A|P])M')
            match = blue_screen_regex.search(rta['text'])
            if match:
                print('got a hit on the blue screen')
                the_hour = match.group(1)
                the_minute = match.group(2)
                the_second = match.group(3)
                the_am_pm = match.group(4)
                time_result = {
                    'hour': the_hour,
                    'minute': the_minute,
                    'second': the_second,
                    'am_pm': the_am_pm + 'M',
                }
                return time_result

    def screen_is_blue_screen(self, cv2_image): 
        dim_y, dim_x = cv2_image.shape[:2]
        if dim_y < 100 or dim_x < 100:
            return False
        swatch = cv2_image[dim_y-20:dim_y, dim_x-20: dim_x]

        for i in range(10):
            rand_x = random.randint(0, 19)
            rand_y = random.randint(0, 19)
            if swatch[rand_y,rand_x][0] != 227 or swatch[rand_y,rand_x][1] != 154 or swatch[rand_y,rand_x][2] != 3:
                return False
        return True

    def get_timestamp_from_task_bar(self, movie, analyzer):
        print('looking for timestamp from taskbar')
        prev_minute = None
        cur_minute = None
        known_minute_at_offset = {}
        minute_change_at_offset = {}
        for cur_index, image_url in enumerate(movie['frames']):
            print('advancing to frame at offset {}'.format(cur_index))
            prev_minute = cur_minute
            cur_minute = self.fetch_minute_from_image_task_bar(image_url, analyzer, cur_index)
            if cur_minute and prev_minute:
                print('comparing cur {} to prev {} at index {}'.format(cur_minute, prev_minute, cur_index))
                if (cur_minute == prev_minute + 1)  or  (cur_minute == 0 and prev_minute == 59):
                    print('========= just saw the minute change')
                    cur_minute_offset = math.floor(cur_index / 60)
                    cur_second_offset = cur_index % 60
                    minute_change_at_offset = {
                        'cur_minute': cur_minute,
                        'prev_minute': prev_minute,
                        'cur_minute_offset': cur_minute_offset,
                        'cur_second_offset': cur_second_offset,
                        'cur_offset': cur_index,
                    }
                    break
        print('========== SUMMARY')
        print('minute change at offset')
        print(minute_change_at_offset)
        if  minute_change_at_offset:
            cur_datetime = datetime.datetime(
                year=2020,
                month=1,
                day=2,
                hour=10,
                minute=minute_change_at_offset['cur_minute'],
                second=0
            )
            start_time  = cur_datetime - datetime.timedelta(seconds=minute_change_at_offset['cur_offset'])
            start_time_obj = {
              'minute': start_time.minute,
              'second': start_time.second,
            }
            print('computed start time: {}:{}'.format(start_time_obj['minute'], start_time_obj['second']))
            return start_time_obj

    def fetch_minute_from_image_task_bar(self, image_url, analyzer, cur_index):
        print('fetching minutes from {}'.format(image_url))
        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return 
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        dim_x = cv2_image.shape[1]
        dim_y = cv2_image.shape[0]

        time_region_image = cv2_image[dim_y-40:dim_y-20, dim_x-75:dim_x]
        gray = cv2.cvtColor(time_region_image, cv2.COLOR_BGR2GRAY)
        bg_color = gray[1,1]
        if bg_color < 100:  # its light text on dark bg, invert
            gray = cv2.bitwise_not(gray)
        recognized_text_areas = analyzer.analyze_text(
            gray,
            '',
            processing_mode='tess_only'
        )

        for rta in recognized_text_areas:
            text = rta['text']
            text_codes = [ord(x) for x in text]
            print('text in **{}** {}'.format(text, text_codes))
            text = self.cast_probably_numbers(text)
            text_codes = [ord(x) for x in text]
            print('--transformed to **{}** {}'.format(text, text_codes))
            match = re.search('(\w*)(:?)(\d\d)(\s*)(\S)M', text)
            if match:
                the_minute = int(match.group(3))
                return the_minute

    def cast_probably_numbers(self, text):
        text = text.replace('l', '1')
        text = text.replace('I', '1')
        text = text.replace('[', '1')
        text = text.replace(']', '1')
        text = text.replace('i', '1')
        text = text.replace('|', '1')
        text = text.replace('{', '1')
        text = text.replace('}', '1')
        text = text.replace('O', '0')
        text = text.replace('.', ':')
        return text

    def get_timestamp_from_blue_screen_png_bytes(self, image):
        # a stand alone method to help Scott with something
        # let Scott know if it's moving locations
        analyzer = EastPlusTessGuidedAnalyzer(debug=False)
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        time_region_image = cv2_image[169:208, 91:465]
        gray = cv2.cvtColor(time_region_image, cv2.COLOR_BGR2GRAY)
        bg_color = gray[1,1]
        if bg_color < 100:  # its light text on dark bg, invert
            gray = cv2.bitwise_not(gray)
        recognized_text_areas = analyzer.analyze_text(
            gray,
            '',
            processing_mode='tess_only'
        )
        time_result = {}
        date_result = {}
        found_datetime = None
        time_regex = re.compile('(\d+):(\d+):(\d+) ([A|P])M')
        date_regex = re.compile('(\d+)/(\d+)/(\d+)\s* ')
        for rta in recognized_text_areas:
            text = rta['text']
            text = self.cast_probably_numbers(text)
            match = time_regex.search(text)
            if match:
                the_hour = match.group(1)
                the_minute = match.group(2)
                the_second = match.group(3)
                the_am_pm = match.group(4)
                time_result = {
                    'hour': int(the_hour),
                    'minute': int(the_minute),
                    'second': int(the_second),
                    'am_pm': the_am_pm + 'M',
                }
            match = date_regex.search(text)
            if match:
                the_month = match.group(1)
                the_day = match.group(2)
                the_year = match.group(3)
                date_result = {
                    'day': int(the_day),
                    'month': int(the_month),
                    'year': int(the_year),
                }
        if date_result and time_result:
            if time_result['am_pm'] == 'PM':
                time_result['hour'] += 12
            found_datetime = datetime.datetime(
                date_result['year'],
                date_result['month'],
                date_result['day'],
                time_result['hour'],
                time_result['minute'],
                time_result['second']
            )
        return found_datetime

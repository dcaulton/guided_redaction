import cv2
import math
import numpy as np
import random
from django.conf import settings
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from .controller_t1 import T1Controller
from guided_redaction.utils.classes.FileWriter import FileWriter


class SelectedAreaController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.max_num_regions_before_mask_is_smarter = 5

    def build_manual_selected_areas(self, selected_area_meta):
        man_zones = selected_area_meta['manual_zones']
        resp_movies = {}
        for movie_url in man_zones:
            resp_movies[movie_url] = {'framesets': {}}
            for frameset_hash in man_zones[movie_url]['framesets']:
                resp_movies[movie_url]['framesets'][frameset_hash] = {}
                for area_key in man_zones[movie_url]['framesets'][frameset_hash]:
                    man_zone = man_zones[movie_url]['framesets'][frameset_hash][area_key]
                    size = [
                        man_zone['end'][0] - man_zone['start'][0],   
                        man_zone['end'][1] - man_zone['start'][1]
                    ]
                    build_obj = {
                        'location': man_zone['start'],
                        'size': size,
                        'scanner_type': 'selected_area',
                        'origin': [0, 0],
                        'scale': 1,
                    }
                    resp_movies[movie_url]['framesets'][frameset_hash][area_key] = build_obj
        return resp_movies


    def build_selected_areas(self, request_data):
        response_movies = {}

        sam_id = list(request_data['tier_1_scanners']['selected_area'].keys())[0]
        selected_area_meta = request_data['tier_1_scanners']['selected_area'][sam_id]

        if selected_area_meta['select_type'] == 'manual':
            return self.build_manual_selected_areas(selected_area_meta)
            
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]

        finder = ExtentsFinder()
        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        for frameset_hash in movie['framesets']:
            frameset = movie['framesets'][frameset_hash]
            cv2_image = self.get_cv2_image_from_movies(
                frameset, source_movies, movie_url, frameset_hash
            ) 
            if type(cv2_image) == type(None):
                print('error getting image for selected area')
                continue
            regions_for_image = self.build_sa_regions(frameset, cv2_image, selected_area_meta, finder)
            regions_as_hashes = {}
            if regions_for_image:
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
                    if 'mask' in region:
                        region_hash['mask'] = self.get_base64_image_string(region['mask'])
                    regions_as_hashes[region['sam_area_id']] = region_hash
            # TODO: GET TEMPLATE ANCHOR OFFSET HERE IF NEEDED
            #   it prolly makes sense to return it from process_t1_results
            if regions_as_hashes:
                response_movies[movie_url]['framesets'][frameset_hash] = regions_as_hashes
        return response_movies

    def build_sa_regions(self, frameset, cv2_image, selected_area_meta, finder):
        if self.frameset_is_t1_output(frameset):
            regions_for_image = self.process_t1_results(
                frameset, 
                cv2_image, 
                selected_area_meta, 
                finder
            )
        else:
            regions_for_image = self.process_virgin_image(
                cv2_image, 
                selected_area_meta, 
                finder
            )

        self.append_min_zones(
            selected_area_meta, 
            regions_for_image,
            frameset
        )

        if selected_area_meta['merge'] == 'yes':
            regions_for_image = self.merge_regions(regions_for_image)

        if selected_area_meta['interior_or_exterior'] == 'exterior':
            regions_for_image = \
                self.transform_interior_selection_to_exterior(
                    regions_for_image, 
                    cv2_image
                )

        self.enforce_max_zones(
            selected_area_meta, 
            regions_for_image,
            frameset
        )

        return regions_for_image

    def merge_regions(self, regions_for_image):
        if not regions_for_image:
            return
        all_start = list(regions_for_image[0]['regions'][0])
        all_end = list(regions_for_image[0]['regions'][1])
        accum_mask = None
        for region in regions_for_image:
            if 'mask' in region:
                if type(accum_mask) == type(None):
                    accum_mask = region['mask']
                accum_mask = cv2.bitwise_or(accum_mask, region['mask'])
            r_start = region['regions'][0]
            r_end = region['regions'][1]
            if r_start[0] < all_start[0]:
                all_start[0] = r_start[0]
            if r_start[1] < all_start[1]:
                all_start[1] = r_start[1]
            if r_end[0] > all_end[0]:
                all_end[0] = r_end[0]
            if r_end[1] > all_end[1]:
                all_end[1] = r_end[1]
        new_id = 'merged_' + str(random.randint(9999, 99999999))
        new_region = {
          'regions': (all_start, all_end),
          'origin': (0, 0),
          'sam_area_id': new_id,
        }
        if type(accum_mask) != type(None):
            new_region['mask'] = accum_mask
        return [new_region]

    def get_cv2_image_from_movies(self, frameset, source_movies, movie_url, frameset_hash):
        if 'images' in frameset:
            image_url = frameset['images'][0]
        else:
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]

        return self.get_cv2_image_from_url(image_url, self.file_writer)

    def enforce_max_zones(self, selected_area_meta, regions, source_frameset):
        if 'maximum_zones' not in selected_area_meta or not selected_area_meta['maximum_zones']:
            return
        if not len(regions):
            return

        # looks like regions is always gonna be a one element array for now at least
        region = regions[0]
        build_regions = []
        match_element = {}
        for region in regions:
            for maximum_zone in selected_area_meta['maximum_zones']:
                for scanner_matcher_id in source_frameset:
                    one_match_obj = source_frameset[scanner_matcher_id]
                    if selected_area_meta['origin_entity_type'] == 'template_anchor' and \
                          'anchor_id' in one_match_obj and \
                          selected_area_meta['origin_entity_id'] == one_match_obj['anchor_id']:
                        match_element = one_match_obj
                        break
                if selected_area_meta['origin_entity_id'] and not match_element:
                    print('error in enforce_max_zones, cannot find entity data for sam_oe_id')
                    return

                r_start = region['regions'][0]
                r_end = region['regions'][1]
                mz_start = maximum_zone['start']
                mz_start = self.scale_selected_point(
                    match_element, selected_area_meta, mz_start, True
                )
                mz_size = [
                    maximum_zone['end'][0] - maximum_zone['start'][0],
                    maximum_zone['end'][1] - maximum_zone['start'][1]
                ]
                if 'scale' in match_element and match_element['scale'] != 1:
                    mz_size = [
                        math.floor(mz_size[0] / match_element['scale']),
                        math.floor(mz_size[1] / match_element['scale']),
                    ]
                mz_end = [
                    mz_start[0] + mz_size[0],
                    mz_start[1] + mz_size[1]
                ]
                # if min zone has at least one pixel overlapping:
                if (r_start[0] < mz_end[0] and r_start[1] < mz_end[0]) and\
                    (r_end[0] > mz_start[0] and r_end[1] > mz_start[1]):
                    # enforce max x
                    if r_end[0] > mz_end[0]:
                        r_end[0] = mz_end[0]
                    # enforce min x
                    if r_start[0] < mz_start[0]:
                        r_start[0] = mz_start[0]
                    # enforce max y
                    if r_end[1] > mz_end[1]:
                        r_end[1] = mz_end[1]
                    # enforce min y
                    if r_start[1] < mz_start[1]:
                        r_start[1] = mz_start[1]
                    region['regions'] = ((r_start, r_end))
                    if 'mask' in region:
                        self.draw_max_zone_on_mask(region['mask'], r_start, r_end)
            build_regions.append(region)
        return build_regions

    def draw_max_zone_on_mask(self, mask, r_start, r_end):
        cv2.rectangle(
            mask,
            (0, 0),
            (mask.shape[1], r_start[1]),
            0,
            -1
        )
        cv2.rectangle(
            mask,
            (0, 0),
            (r_start[0], mask.shape[0]),
            0,
            -1
        )
        cv2.rectangle(
            mask,
            (0, r_end[1]),
            (mask.shape[1], mask.shape[0]),
            0,
            -1
        )
        cv2.rectangle(
            mask,
            (r_end[0], r_start[1]),
            (mask.shape[1], mask.shape[0]),
            0,
            -1
        )

    def append_min_zones(self, selected_area_meta, regions, source_frameset):
        if 'minimum_zones' not in selected_area_meta or not selected_area_meta['minimum_zones']:
            return
        mask = None
        if 'mask' in regions:
            mask = regions['mask']
        for minimum_zone in selected_area_meta['minimum_zones']:
            size_arr =[
                minimum_zone['end'][0] - minimum_zone['start'][0],
                minimum_zone['end'][1] - minimum_zone['start'][1],
            ]
            if self.frameset_is_t1_output(source_frameset):
                for scanner_matcher_id in source_frameset:
                    match_element = source_frameset[scanner_matcher_id]

                    location = self.scale_selected_point(
                        match_element, selected_area_meta, minimum_zone['start']
                    )

                    if 'scale' in match_element and match_element['scale'] != 1:
                        scale = match_element['scale']
                        size_arr = [
                            size_arr[0] / scale,
                            size_arr[1] / scale
                        ]
                    end = (
                        location[0] + size_arr[0],
                        location[1] + size_arr[1]
                    )
                    regions.append({
                        'regions': (location, end),
                        'origin': location,
                        'sam_area_id': scanner_matcher_id,
                    })
                    if mask:
                        cv2.rectangle(
                            mask,
                            location,
                            end,
                            255,
                            -1
                        )
            else:
                regions.append({
                    'regions': (minimum_zone['start'], minimum_zone['end']),
                    'origin': (0, 0),
                    'sam_area_id': minimum_zone['id'],
                })
                if mask:
                    cv2.rectangle(
                        mask,
                        minimum_zone['start'],
                        minimum_zone['end'],
                        255,
                        -1
                    )
            

    def scale_selected_point(self, match_element, selected_area_meta, selected_point, verbose=False):
        offset = self.get_offset_for_t1(selected_area_meta, match_element)
        # scale the offset by the scale of the t1 results
        if 'scale' in match_element and match_element['scale'] != 1:
            origin = selected_area_meta['origin_entity_location']
            scale = 1
            if match_element and 'scale' in match_element:
                scale = match_element['scale']
            new_sp_offset = [
                (selected_point[0] - origin[0]) / scale,
                (selected_point[1] - origin[1]) / scale
            ]
            new_selected_point = [
                math.floor(origin[0] + new_sp_offset[0]),
                math.floor(origin[1] + new_sp_offset[1])
            ]
            selected_point = new_selected_point

        selected_point = [
            selected_point[0] + offset[0],
            selected_point[1] + offset[1]
        ]
        return selected_point

    def process_t1_results(self, frameset, cv2_image, selected_area_meta, finder):
        match_app_id = ''
        if 'app_id' in selected_area_meta['attributes']:
            match_app_id = selected_area_meta['attributes']['app_id']
        tolerance = int(selected_area_meta['tolerance'])
        regions_for_image = []
        for scanner_matcher_id in frameset:
            match_rec = frameset[scanner_matcher_id]
            if match_app_id and 'app_id' in match_rec and match_rec['app_id'] != match_app_id:
                continue
            match_data = {}
            if selected_area_meta['origin_entity_type'] == 'template_anchor' and \
                'origin_entity_id' in selected_area_meta and \
                'anchor_id' in match_rec and \
                match_rec['anchor_id'] == selected_area_meta['origin_entity_id']:
                    match_data = frameset[scanner_matcher_id]
            else:
                match_data = frameset[scanner_matcher_id]

            if selected_area_meta['everything_direction']:
                regions_for_image = self.get_everything_fill_for_t1(
                    match_data, cv2_image, selected_area_meta
                )
                return regions_for_image

            for area in selected_area_meta['areas']:
                area_scanner_key = area['id'] + '-' + scanner_matcher_id
                selected_point = area['center']
                match_element = frameset[scanner_matcher_id]
                selected_point = self.scale_selected_point(
                    match_element, selected_area_meta, selected_point
                )
                if selected_area_meta['select_type'] == 'arrow':
                    region, mask = finder.determine_arrow_fill_area(
                        cv2_image, selected_point, tolerance
                    )
                    build_region = {
                        'regions': region, 
                        'origin': selected_point,
                        'sam_area_id': area_scanner_key,
                    }
                    if self.we_should_use_a_mask(selected_area_meta, region):
                        build_region['mask'] = mask
                    regions_for_image.append(build_region)
                if selected_area_meta['select_type'] == 'flood':
                    region, mask = finder.determine_flood_fill_area(
                        cv2_image, selected_point, tolerance
                    )
                    build_region = {
                        'regions': region, 
                        'origin': selected_point,
                        'sam_area_id': area_scanner_key,
                    }
                    if self.we_should_use_a_mask(selected_area_meta, region):
                        build_region['mask'] = mask
                    regions_for_image.append(build_region)
        return regions_for_image

    def we_should_use_a_mask(self, selected_area_meta, regions):
        # if the regions are complicated enough, or a mask has been requested, return True
        if selected_area_meta['masks_always'] == 'yes':
            return True
        if len(regions) > self.max_num_regions_before_mask_is_smarter:
            return True

    def get_everything_fill_for_t1(self, match_data, cv2_image, selected_area_meta):
        direction = selected_area_meta['everything_direction']
        respect_source = selected_area_meta['respect_source_dimensions']
        if 'location' in match_data:
            start = match_data['location']
            end = [
                match_data['location'][0] + match_data['size'][0],
                match_data['location'][1] + match_data['size'][1]
            ]
        if 'start' in match_data:
            start = match_data['start']
            end = match_data['end']

        start_point = start
        if direction in ['south', 'east']:
            start_point = end

        if direction == 'north':
            if respect_source:
                new_start = [
                    start[0],
                    0
                ]
                new_end = [
                    end[0],
                    start[1]
                ]
            else:
                new_start = [0, 0]
                new_end = [
                    cv2_image.shape[1],
                    start_point[1]
                ]
        elif direction == 'south':
            if respect_source:
                new_start = [
                    start[0],
                    end[1]
                ]
                new_end = [
                    end[0],
                    cv2_image.shape[0]
                ]
            else:
                new_start = [
                    0,
                    start_point[1]
                ]
                new_end = [
                    cv2_image.shape[1],
                    cv2_image.shape[0]
                ]
        elif direction == 'east':
            if respect_source:
                new_start = [
                    end[0],
                    start[1]
                ]
                new_end = [
                    cv2_image.shape[1],
                    end[1]
                ]
            else:
                new_start = [
                    start_point[0],
                    0
                ]
                new_end = [
                    cv2_image.shape[1],
                    cv2_image.shape[0]
                ]
        elif direction == 'west':
            if respect_source:
                new_start = [
                    0,
                    start[1]
                ]
                new_end = [
                    start[0],
                    end[1]
                ]
            else:
                new_start = [
                    0,
                    0
                ]
                new_end = [
                    start_point[0],
                    cv2_image.shape[0]
                ]

        regions_for_image = []
        if new_end[0] != new_start[0] and new_end[1] != new_start[1]:
            build_region = {
                'regions': (new_start, new_end), 
                'origin': start_point,
                'sam_area_id': 'everything_' + str(random.randint(9999, 99999999)),
            }
            if self.we_should_use_a_mask(selected_area_meta, (new_start, new_end)):
                return_mask = np.zeros(cv2_image.shape[:2])
                cv2.rectangle(
                    return_mask,
                    new_start,
                    new_end,
                    255,
                    -1
                )
                build_region['mask'] = return_mask
            regions_for_image.append(build_region)

        return regions_for_image

    def process_virgin_image(self, cv2_image, selected_area_meta, finder):
        regions_for_image = []
        tolerance = int(selected_area_meta['tolerance'])
        for area in selected_area_meta['areas']:
            selected_point = area['center']
            if selected_area_meta['select_type'] == 'arrow':
                region, mask = finder.determine_arrow_fill_area(
                    cv2_image, selected_point, tolerance
                )
                build_region = {
                    'regions': region, 
                    'origin': selected_point,
                    'sam_area_id': area['id'],
                }
                if self.we_should_use_a_mask(selected_area_meta, region):
                    build_region['mask'] = mask
                regions_for_image.append(build_region)
            if selected_area_meta['select_type'] == 'flood':
                region, mask = finder.determine_flood_fill_area(
                    cv2_image, selected_point, tolerance
                )
                build_region = {
                    'regions': region, 
                    'origin': selected_point,
                    'sam_area_id': area['id'],
                }
                if self.we_should_use_a_mask(selected_area_meta, region):
                    build_region['mask'] = mask
                regions_for_image.append(build_region)
        return regions_for_image

    def frameset_is_t1_output(self, frameset):
        if 'images' in frameset:
            return False
        return True

    def get_offset_for_t1(self, selected_area_meta, match_element):
        if 'origin_entity_location' in selected_area_meta:
            if 'location' in match_element:
                disp_x = match_element['location'][0] - selected_area_meta['origin_entity_location'][0]
                disp_y = match_element['location'][1] - selected_area_meta['origin_entity_location'][1]
                return [disp_x, disp_y]
            if 'start' in match_element:
                disp_x = match_element['start'][0] - selected_area_meta['origin_entity_location'][0]
                disp_y = match_element['start'][1] - selected_area_meta['origin_entity_location'][1]
                return [disp_x, disp_y]
        return [0, 0]

    def transform_interior_selection_to_exterior(self, regions_for_image, cv2_image):
        if 'mask' in regions_for_image:
            regions_for_image['mask'] = cv2.bitwise_not(regions_for_image['mask'])

        if len(regions_for_image) == 1:
            start_x = min(regions_for_image[0]['regions'][0][0], regions_for_image[0]['regions'][1][0])
            end_x = max(regions_for_image[0]['regions'][0][0], regions_for_image[0]['regions'][1][0])
            start_y = min(regions_for_image[0]['regions'][0][1], regions_for_image[0]['regions'][1][1])
            end_y = max(regions_for_image[0]['regions'][0][1], regions_for_image[0]['regions'][1][1])
            height = cv2_image.shape[0]
            width = cv2_image.shape[1]
            new_regions = []
            new_regions.append({
              'regions': [[0,0], [width,start_y]],
              'origin': regions_for_image[0]['origin'],
              'sam_area_id': 'reversed_1',
            })
            new_regions.append({
              'regions': [[0,start_y], [start_x,end_y]],
              'origin': regions_for_image[0]['origin'],
              'sam_area_id': 'reversed_2',
            })
            new_regions.append({
              'regions': [[end_x,start_y], [width,end_y]],
              'origin': regions_for_image[0]['origin'],
              'sam_area_id': 'reversed_3',
            })
            new_regions.append({
              'regions': [[0,end_y], [width,height]],
              'origin': regions_for_image[0]['origin'],
              'sam_area_id': 'reversed_4',
            })

            return new_regions

        return regions_for_image

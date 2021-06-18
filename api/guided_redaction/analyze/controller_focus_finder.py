import json
import os
import random
import math
from matplotlib import pyplot as plt
import uuid
import cv2
import numpy as np
from django.conf import settings
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.FocusFinder import FocusFinder
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder
from guided_redaction.analyze.classes.GetScreens import GetScreens


class FocusFinderController(T1Controller):

    def __init__(self):
        self.debug = True
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.debug = True
        self.image_uuid = str(uuid.uuid4())
        self.image_directory = self.file_writer.create_unique_directory(self.image_uuid)
        self.num_histogram_bins = 8
        self.hotspot_min_pixels = 100
        self.top_trough_min_ratio = 3
        self.hotspot_data_type = np.uint16
        self.hotspot_max_allowed_value = 2**16-1
        # for debugging, knocks all other frameset hashes out of the response
        self.debugging_frameset_hash = ''
#        self.debugging_frameset_hash = '6179022026561607781936378558488872309785506353468273592312'
        get_screens_meta = {}
        self.get_screens_worker = GetScreens(get_screens_meta, self.file_writer)


    def find_focus(self, request_data):
        ocr_job_results = {'movies': {}}
        source_movie_only = False

        response_obj = {
            'movies': {},
            'statistics': {'movies': {}},
        }
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
        else:
            source_movies = movies
            source_movie_only = True
        movie_url = list(source_movies.keys())[0]
        source_movie = source_movies[movie_url]
        movie = movies[movie_url]

        scanner_id = list(request_data["tier_1_scanners"]['focus_finder'].keys())[0]
        focus_finder_meta = request_data["tier_1_scanners"]['focus_finder'][scanner_id]

        ocr_job_results = {'movies': {}}
        if focus_finder_meta.get('ocr_job_id'):
            ocr_job = Job.objects.get(pk=focus_finder_meta.get('ocr_job_id'))
            ocr_job_results = json.loads(ocr_job.response_data)

        self.focus_finder = FocusFinder(focus_finder_meta)

        response_obj['movies'][movie_url] = {}
        response_obj['movies'][movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        response_obj['statistics'] = {'movies': {}}
        response_obj['statistics']['movies'][movie_url] = {'framesets': {}, 'screens': {}}

        cv2_image = None
        prev_cv2_image = None
        prev_ocr_matches_in = {}
        ocr_matches_in = {}
        for index, frameset_hash in enumerate(ordered_hashes):
            other_t1_matches_in = {}
            image_url = source_movie['framesets'][frameset_hash]['images'][0]
            image_name = image_url.split('/')[-1]
            if not source_movie_only and frameset_hash not in movie['framesets']:
                print('passing on sift of image {}'.format(image_name))
                continue
            if not source_movie_only and frameset_hash in movie['framesets']:
                other_t1_matches_in = movie['framesets'][frameset_hash]
            if 'movies' in ocr_job_results and \
                movie_url in ocr_job_results['movies'] and \
                frameset_hash in ocr_job_results['movies'][movie_url]['framesets']:
                prev_ocr_matches_in = ocr_matches_in
                ocr_matches_in = ocr_job_results['movies'][movie_url]['framesets'][frameset_hash]

            if type(cv2_image) != type(None):
                prev_cv2_image = cv2_image
            cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)

            if index == 0:
                print('bypassing first frame')
                continue
            print('finding focus for {}'.format(image_url.split('/')[-1]))
            if type(cv2_image) == type(None):
                print('error fetching image {} for focus finder'.format(image_url))
                continue
            match_obj, match_stats, masks = self.focus_finder.find_focus(
                cv2_image, prev_cv2_image, ocr_matches_in, prev_ocr_matches_in, other_t1_matches_in
            )
            if match_obj:
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = match_obj

            screens_for_frame = self.get_screens_worker.get_screens(cv2_image)
            response_obj['statistics']['movies'][movie_url]['screens'][frameset_hash] = screens_for_frame['screen_bounding_boxes']

            response_obj['statistics']['movies'][movie_url]['framesets'][frameset_hash] = match_stats

        if focus_finder_meta.get('ignore_hotspots'):
            self.trim_hotspots(response_obj, source_movies)

        self.trim_to_single_screen(response_obj, movie_url, image_name, focus_finder_meta)

        if self.debugging_frameset_hash:
            self.limit_response_to_frameset_hash(response_obj, movie_url, self.debugging_frameset_hash)

        if focus_finder_meta.get('return_type') in ['app_effective', 'app_effective_fields']:
            self.add_app_effective_windows(response_obj, movie_url)

        if focus_finder_meta.get('return_type') in ['app_flood', 'app_flood_fields']:
            self.add_app_flood_windows(response_obj, movie_url, cv2_image)

        if focus_finder_meta.get('return_type') not in ['screen_fields', 'app_effective_fields', 'app_flood_fields']:
            self.remove_field_objects(response_obj, movie_url)

        return response_obj

    def remove_field_objects(self, response_obj, movie_url):
        build_movie = {'framesets': {}}
        for frameset_hash in response_obj['movies'][movie_url]['framesets']:
            for match_obj_id in response_obj['movies'][movie_url]['framesets'][frameset_hash]:
                match_obj = response_obj['movies'][movie_url]['framesets'][frameset_hash][match_obj_id]
                if match_obj.get('focus_object_type') != 'field':
                    if frameset_hash not in build_movie['framesets']:
                        build_movie['framesets'][frameset_hash] = {}
                    build_movie['framesets'][frameset_hash][match_obj['id']] = match_obj
        response_obj['movies'][movie_url] = build_movie

    def trim_to_single_screen(self, response_obj, movie_url, image_name, focus_finder_meta):
        for frameset_hash in response_obj['statistics']['movies'][movie_url]['screens']:
            build_response_obj = {}
            if frameset_hash not in response_obj['movies'][movie_url]['framesets']:
                continue
            frameset_screens = response_obj['statistics']['movies'][movie_url]['screens'][frameset_hash]
            frameset_matches = response_obj['movies'][movie_url]['framesets'][frameset_hash]
            # for each field
            # add to the tally for that screen in the hash
            # hash with the highest value wins
            screen_members = {}
            for screen_number, screen_bounding_box in enumerate(frameset_screens):
                screen_members[screen_number] = []
                for match_obj_id in frameset_matches:
                    match_object = frameset_matches[match_obj_id]
                    if self.object_contains_object(screen_bounding_box, match_object):
                        screen_members[screen_number].append(match_obj_id)
            most_popular_screen_index = -1
            most_popular_screen_value = -1
            other_values_exist = 0
            for screen_num in screen_members:
                if len(screen_members[screen_num]) > most_popular_screen_value:
                    most_popular_screen_index = screen_num
                    most_popular_screen_value = len(screen_members[screen_num])
            for screen_num in screen_members:
                if screen_num != most_popular_screen_index:
                    if len(screen_members[screen_num]):
                        other_values_exist += 1
            if other_values_exist:
                for match_obj_id in screen_members[most_popular_screen_index]:
                    build_response_obj[match_obj_id] = frameset_matches[match_obj_id]
                if self.debug:
                    print('retaining {} on-screen elements for image {}'.format(len(build_response_obj), image_name))
                    for match_obj_id in frameset_matches:
                        if match_obj_id not in build_response_obj:
                            print('trimming off-screen elements for image {}: {}'.format(image_name, frameset_matches[match_obj_id]))
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = build_response_obj

            if focus_finder_meta.get('return_type') in ['screen_fields', 'screen']:
                screen_bounding_box = frameset_screens[most_popular_screen_index]
                the_id = 'ff_' + str(random.randint(100000000, 999000000))
                location = screen_bounding_box['start']
                size = (
                    screen_bounding_box['end'][0] - screen_bounding_box['start'][0],
                    screen_bounding_box['end'][1] - screen_bounding_box['start'][1]
                )
                build_ele = {
                    'id': the_id,
                    'scanner_type': 'focus_finder',
                    'focus_object_type': 'screen',
                    'location': location,
                    'size': size,
                }
                response_obj['movies'][movie_url]['framesets'][frameset_hash][build_ele['id']] = build_ele
                    
    def object_contains_object(self, outer_object, inner_object):
        outer_start_x = outer_object['start'][0]
        outer_start_y = outer_object['start'][1]
        outer_end_x = outer_object['end'][0]
        outer_end_y = outer_object['end'][1]
        inner_center_x = inner_object['location'][0] + math.floor(.5 * inner_object['size'][0])
        inner_center_y = inner_object['location'][1] + math.floor(.5 * inner_object['size'][1])
        if outer_start_x <= inner_center_x <= outer_end_x:
            if outer_start_y <= inner_center_y <= outer_end_y:
                return True

    def limit_response_to_frameset_hash(self, response_obj, movie_url, frameset_hash):
        response_obj['movies'] = {
            movie_url: {
                'framesets': {
                    frameset_hash: response_obj['movies'][movie_url]['framesets'][frameset_hash],
                }
            }
        }
        response_obj['statistics']['movies'] = {
            movie_url: {
                'framesets': {
                    frameset_hash: response_obj['statistics']['movies'][movie_url]['framesets'][frameset_hash],
                }
            }
        }

    def add_app_effective_windows(self, response_obj, movie_url):
        for frameset_hash in response_obj['movies'][movie_url]['framesets']:
            match_objects = response_obj['movies'][movie_url]['framesets'][frameset_hash]
            app_start, app_end = self.focus_finder.get_app_effective_window(match_objects)
            if app_start[0] and app_start[1] and app_end[0]  and app_end[1]:
                the_id = 'ff_' + str(random.randint(100000000, 999000000))
                location = app_start
                size = (
                    app_end[0] - app_start[0],
                    app_end[1] - app_start[1]
                )
                build_ele = {
                    'id': the_id,
                    'scanner_type': 'focus_finder',
                    'focus_object_type': 'app_effective',
                    'location': location,
                    'size': size,
                }
                response_obj['movies'][movie_url]['framesets'][frameset_hash][build_ele['id']] = build_ele


    def trim_hotspots(self, response_obj, source_movies):
        # TODO the below only works up to 255 incidences of a field.  Any more are lost.  So for large movies use
        #   np.uint16 to hold the value
        for movie_url in response_obj['movies']:
            movie = response_obj['movies'][movie_url]
            source_movie = source_movies[movie_url]
            frame_shape = (1, 1, 1)
            if 'frame_dimensions' in source_movie and source_movie['frame_dimensions']:
                frame_shape = (source_movie['frame_dimensions'][1], source_movie['frame_dimensions'][0], 1)
            else:
                first_image_url = source_movie['frames'][0]
                frame_shape = self.get_image_shape(first_image_url)
            hotspot_mask = np.zeros(frame_shape, self.hotspot_data_type)
            ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
            for frameset_hash in ordered_hashes:
                this_frames_mask = np.zeros(frame_shape, self.hotspot_data_type)
                if frameset_hash not in movie['framesets']:
                    continue # either the first frame or some other unchanged frame
                for match_object_id in movie['framesets'][frameset_hash]:
                    match_object = movie['framesets'][frameset_hash][match_object_id]
                    if match_object.get('field_type') not in ['new', 'altered']:
                        continue
                    start = match_object['location']
                    end = (
                        start[0] + match_object['size'][0],
                        start[1] + match_object['size'][1]
                    )
                    cv2.rectangle(
                        this_frames_mask,
                        tuple(start),
                        tuple(end),
                        1,
                        -1
                    )

                hotspot_mask = cv2.add(hotspot_mask, this_frames_mask)

            # scale the hotspot so the hottest area will be full brightness
            (minVal, maxVal, minLoc, maxLoc) = cv2.minMaxLoc(hotspot_mask)
            response_obj['statistics']['movies'][movie_url]['brightest_hotspot_val'] = maxVal
            response_obj['statistics']['movies'][movie_url]['brightest_hotspot_loc'] = maxLoc
            brightness_scale = math.floor((self.hotspot_max_allowed_value) / maxVal)

            hotspot_mask = hotspot_mask * brightness_scale
            hotspot_mask_url = self.save_image_to_workdir(hotspot_mask, 'hotspots.png')
            response_obj['statistics']['movies'][movie_url]['hotspot_mask_url'] = hotspot_mask_url

            hist = cv2.calcHist([hotspot_mask], [0], None, [self.num_histogram_bins], [0, self.hotspot_max_allowed_value+1])
            response_obj['statistics']['movies'][movie_url]['hotspot_histogram'] = str(hist)

            hotspot_brightness_cutoff = self.get_hist_trough_cutoff(hist, response_obj, movie_url)
            if not hotspot_brightness_cutoff:
                continue

            # spin through the results for every page, trim out all items whose centroid falls on a point in the 
            #  hotspot mask where the brightness is over hotspot_brightness_cutoff
            new_response_framesets = {}
            
            for frameset_hash in response_obj['movies'][movie_url]['framesets']:
                frameset_obj = response_obj['movies'][movie_url]['framesets'][frameset_hash]
                ids_to_withhold = []
                for match_obj_id in frameset_obj:
                    match_obj = frameset_obj[match_obj_id]
                    is_a_hotspot = self.is_a_hotspot(match_obj, hotspot_mask, hotspot_brightness_cutoff)
                    if is_a_hotspot:
                        related_ids = self.get_related_ids(frameset_obj, match_obj_id)
                        ids_to_withhold.append(match_obj_id)
                        for rid in related_ids:
                            ids_to_withhold.append(rid)
                 
                if self.debug and ids_to_withhold:
                    if self.debugging_frameset_hash:
                        if frameset_hash == self.debugging_frameset_hash:
                            print('ids to withhold for fsh {} are {}'.format(frameset_hash, ids_to_withhold))
                    else:
                        print('ids to withhold for fsh {} are {}'.format(frameset_hash, ids_to_withhold))

                for match_obj_id in frameset_obj:
                    if match_obj_id in ids_to_withhold:
                        if self.debug:
                            print('knocking out hotspot match for {}'.format(frameset_obj[match_obj_id]))
                        continue

                    if frameset_hash not in new_response_framesets:
                        new_response_framesets[frameset_hash] = {}
                    new_response_framesets[frameset_hash][match_obj_id] = frameset_obj[match_obj_id]
                       
            response_obj['movies'][movie_url]['framesets'] = new_response_framesets

    def get_related_ids(self, frameset_obj, target_id):
        build_arr = []
        for match_obj_id in frameset_obj:
            if 'field_id' in frameset_obj[match_obj_id] and frameset_obj[match_obj_id]['field_id'] == target_id:
                build_arr.append(match_obj_id)
        return build_arr

    def is_a_hotspot(self, match_obj, hotspot_mask, hotspot_brightness_cutoff):
        centroid_x = match_obj['location'][0] + math.floor(.5 * match_obj['size'][0])
        centroid_y = match_obj['location'][1] + math.floor(.5 * match_obj['size'][1])
        brightness = hotspot_mask[centroid_y,centroid_x]
        is_a_hotspot = brightness >= hotspot_brightness_cutoff
        return is_a_hotspot
                

    def get_hist_trough_cutoff(self, hist, response_obj, movie_url):
        top_value = hist[self.num_histogram_bins-1][0]
        if top_value < self.hotspot_min_pixels:
            print('not enough hotspot area')
            return
        trough_indices = []
        for i in range(self.num_histogram_bins-2, 0, -1):
            ratio = top_value / hist[i][0]
            if ratio > self.top_trough_min_ratio:
                trough_indices.append(i)
            else:
                break

        if self.debug:
            response_obj['statistics']['movies'][movie_url]['hotspot_trough_indices'] = str(trough_indices)
            response_obj['statistics']['movies'][movie_url]['hotspot_trough_top_value'] = str(top_value)

        if trough_indices:
            trough_top_index = trough_indices[0]
            brightness_per_bin =  self.hotspot_max_allowed_value / self.num_histogram_bins
            # the below number represents 'brightness' threshold for the hotspot mask.  When you're at a point
            #  above that level of brightness, you are considered a high frequency / hotspot item.
            brightness_upper_threshold = (trough_top_index+1) * brightness_per_bin
            response_obj['statistics']['movies'][movie_url]['hotspot_brightness_upper_threshold'] = str(brightness_upper_threshold)
            return brightness_upper_threshold

    def save_image_to_workdir(self, cv2_image, file_name):
        file_fullpath = os.path.join(self.image_directory, file_name)
        self.file_writer.write_cv2_image_to_filepath(cv2_image, file_fullpath)
        image_url = self.file_writer.get_url_for_file_path(file_fullpath)
        return image_url

    def get_image_shape(self, image_url):
        cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
        return (
            cv2_image.shape[0],
            cv2_image.shape[1],
            1
        )

    def add_app_flood_windows(self, response_obj, movie_url, cv2_image):
        finder = ExtentsFinder()
        for frameset_hash in response_obj['movies'][movie_url]['framesets']:
            match_objects = response_obj['movies'][movie_url]['framesets'][frameset_hash]
            app_start, app_end = self.focus_finder.get_app_effective_window(match_objects)
            if not app_start[0] or not app_start[1] or not app_end[0] or not app_end[1]:
                continue
            just_before = (
                app_start[0] - 5,
                app_start[1] - 5
            )
            before_start_end, before_mask = finder.determine_flood_fill_area(cv2_image, just_before)
            before_start = before_start_end[0]
            before_end = before_start_end[1]

            just_after = (
                app_end[0] + 5,
                app_end[1] + 5
            )
            after_start_end, after_mask = finder.determine_flood_fill_area(cv2_image, just_after)
            after_start = after_start_end[0]
            after_end = after_start_end[1]
            
            agg_start = list(before_start)
            if agg_start[0] > after_start[0]:
                agg_start[0] = after_start[0]
            if agg_start[1] > after_start[1]:
                agg_start[1] = after_start[1]

            agg_end = list(before_end)
            if agg_end[0] < after_end[0]:
                agg_end[0] = after_end[0]
            if agg_end[1] < after_end[1]:
                agg_end[1] = after_end[1]

            the_id = 'ff_' + str(random.randint(100000000, 999000000))
            location = agg_start
            size = (
                agg_end[0] - agg_start[0],
                agg_end[1] - agg_start[1]
            )
            build_ele = {
                'id': the_id,
                'scanner_type': 'focus_finder',
                'focus_object_type': 'app_flood',
                'location': location,
                'size': size,
            }
            response_obj['movies'][movie_url]['framesets'][frameset_hash][build_ele['id']] = build_ele


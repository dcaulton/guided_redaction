import json
import os
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
        self.hotspot_min_pixels= 100
        self.top_trough_min_ratio = 3
        self.hotspot_data_type = np.uint16
        self.hotspot_max_allowed_value = 2**15-1

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

        focus_finder = FocusFinder(focus_finder_meta)

        response_obj['movies'][movie_url] = {}
        response_obj['movies'][movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        response_obj['statistics'] = {'movies': {}}
        response_obj['statistics']['movies'][movie_url] = {'framesets': {}}

        cv2_image = None
        prev_cv2_image = None
        prev_ocr_matches_in = {}
        ocr_matches_in = {}
        for index, frameset_hash in enumerate(ordered_hashes):
            other_t1_matches_in = {}
            image_url = source_movie['framesets'][frameset_hash]['images'][0]
            if not source_movie_only and frameset_hash not in movie['framesets']:
                print('passing on sift of image {}'.format(image_url.split('/')[-1]))
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
            print('finding focus for frameset {}'.format(image_url.split('/')[-1]))
            if type(cv2_image) == type(None):
                print('error fetching image {} for focus finder'.format(image_url))
                continue
            match_obj, match_stats, masks = focus_finder.find_focus(
                cv2_image, prev_cv2_image, ocr_matches_in, prev_ocr_matches_in, other_t1_matches_in
            )
            if match_obj:
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = match_obj
            response_obj['statistics']['movies'][movie_url]['framesets'][frameset_hash] = match_stats

        if focus_finder_meta.get('ignore_hotspots'):
            self.trim_hotspots(response_obj, source_movies)

        return response_obj

    def get_image_shape(self, image_url):
        cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
        return (
            cv2_image.shape[0],
            cv2_image.shape[1],
            1
        )

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
            print('goober brightest hotspot is {} at {}'.format(maxVal, maxLoc))
            brightness_scale = math.floor((self.hotspot_max_allowed_value) / maxVal)

            hotspot_mask = hotspot_mask * brightness_scale
            hotspot_mask_url = self.save_image_to_workdir(hotspot_mask, 'hotspots.png')
            response_obj['statistics']['movies'][movie_url]['hotspot_mask_url'] = hotspot_mask_url

            hist = cv2.calcHist([hotspot_mask], [0], None, [self.num_histogram_bins], [0, self.hotspot_max_allowed_value+1])
            response_obj['statistics']['movies'][movie_url]['hotspot_histogram'] = str(hist)

            hotspot_brightness_cutoff = self.get_hist_trough_cutoff(hist)
            if hotspot_brightness_cutoff:
                # spin through the results for every page, trim out all items whose centroid falls on a point in the 
                #  hotspot mask where the brightness is over hotspot_brightness_cutoff
                pass
                

    def get_hist_trough_cutoff(self, hist):
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
            response_obj['statistics']['movies'][movie_url]['hotspot_trough_indices'] = trough_indices
            response_obj['statistics']['movies'][movie_url]['hotspot_trough_top_value'] = top_value

        if trough_indices:
            trough_top_index = trough_indices[0]
            brightness_per_bin =  self.hotspot_max_allowed_value / self.num_histogram_bins
            # the below number represents 'brightness' threshold for the hotspot mask.  When you're at a point
            #  above that level of brightness, you are considered a high frequency / hotspot item.
            brightness_upper_threshold = (trough_top_index+1) * brightness_per_bin
            response_obj['statistics']['movies'][movie_url]['hotspot_brightness_upper_threshold'] = brightness_upper_threshold
            return brightness_upper_threshold

    def save_image_to_workdir(self, cv2_image, file_name):
        file_fullpath = os.path.join(self.image_directory, file_name)
        self.file_writer.write_cv2_image_to_filepath(cv2_image, file_fullpath)
        image_url = self.file_writer.get_url_for_file_path(file_fullpath)
        return image_url

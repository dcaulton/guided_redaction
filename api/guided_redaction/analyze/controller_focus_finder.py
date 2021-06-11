import json
import os
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
        self.image_directory = self.file_writer.create_unique_directory(str(uuid.uuid4()))

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
        for movie_url in response_obj['movies']:
            print('considering movie {}'.format(movie_url))
            movie = response_obj['movies'][movie_url]
            source_movie = source_movies[movie_url]
            frame_shape = (1, 1, 1)
            if 'frame_dimensions' in source_movie and source_movie['frame_dimensions']:
                frame_shape = (source_movie['frame_dimensions'][1], source_movie['frame_dimensions'][0], 1)
            else:
                first_image_url = source_movie['frames'][0]
                frame_shape = self.get_image_shape(first_image_url)
            print('minkie frame shape {}'.format(frame_shape))
            # TODO the below only works up to 255 incidences of a field.  Any more are lost.  So for large movies use
            #   np.uint16 to hold the value
            hotspot_mask = np.zeros(frame_shape, np.uint8)
            ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
            for frameset_hash in ordered_hashes:
                print('considering frameset {}'.format(frameset_hash))
                this_frames_mask = np.zeros(frame_shape, np.uint8)
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
                        1,   # DMC FIX THIS
                        -1
                    )

                hotspot_mask = cv2.add(hotspot_mask, this_frames_mask)

                file_fullpath = os.path.join(self.image_directory, 'hotspots.png')
                self.file_writer.write_cv2_image_to_filepath(hotspot_mask, file_fullpath)
                hotspot_mask_url = self.file_writer.get_url_for_file_path(file_fullpath)

                response_obj['statistics']['movies'][movie_url]['hotspot_mask_url'] = hotspot_mask_url

#            cv2.imwrite('/Users/davecaulton/Desktop/tippy.png', hotspot_mask)


#find_focus_hotspots(movie)
#    mask_composite  = black image, dimensions of movie
#    foreach frameset_hash of movie:
#        mask_single  = make a mask of the ocr matches.  give positive ones a grayscale value of 1
#        mask_composite = cv2.add(mask_composite, mask_single).  # actually np.add is what well prolly want, lets us go over 255 frames for a movie
#    when done, mask_composite should have all the areas that are changing.  Brightest are that grayscale values worth of change.


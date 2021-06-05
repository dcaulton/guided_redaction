import json
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
        for index, frameset_hash in enumerate(ordered_hashes):
            other_t1_matches_in = {}
            ocr_matches_in = {}
            prev_ocr_matches_in = {}
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

        return response_obj


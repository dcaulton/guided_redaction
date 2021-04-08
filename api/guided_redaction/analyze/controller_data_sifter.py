import json
from django.conf import settings
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.DataSifter import DataSifter
from guided_redaction.analyze.classes.DataSifterRedactor import DataSifterRedactor


class DataSifterController(T1Controller):

    def __init__(self):
        self.debug = True
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.debug = True

    def sift_data(self, request_data):
        ocr_job_results = {'movies': {}}
        source_movie_only = False

        response_obj = {
            'movies': {},
            'statistics': {},
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

        scanner_id = list(request_data["tier_1_scanners"]['data_sifter'].keys())[0]
        data_sifter_meta = request_data["tier_1_scanners"]['data_sifter'][scanner_id]

        ocr_job_results = {'movies': {}}
        if data_sifter_meta.get('ocr_job_id'):
            ocr_job = Job.objects.get(pk=data_sifter_meta.get('ocr_job_id'))
            ocr_job_results = json.loads(ocr_job.response_data)

        template_job_results = {'movies': {}}
        if data_sifter_meta.get('template_job_id'):
            template_job = Job.objects.get(pk=data_sifter_meta.get('template_job_id'))
            template_job_results = json.loads(template_job.response_data)

        data_sifter = DataSifter(data_sifter_meta)
        if data_sifter_meta['scan_level'] != 'tier_1':
            data_sifter_redactor = DataSifterRedactor(data_sifter_meta)
        synthetic_data = data_sifter.build_all_synthetic_data()

        response_obj['movies'][movie_url] = {}
        response_obj['movies'][movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        response_obj['statistics'] = {'movies': {}}
        response_obj['statistics']['movies'][movie_url] = {'framesets': {}}

        for frameset_hash in ordered_hashes:
            other_t1_matches_in = {}
            ocr_matches_in = {}
            template_matches_in = {}
            image_url = source_movie['framesets'][frameset_hash]['images'][0]
            if not source_movie_only and frameset_hash not in movie['framesets']:
                print('passing on sift of image {}'.format(image_url.split('/')[-1]))
                continue
            if not source_movie_only and frameset_hash in movie['framesets']:
                other_t1_matches_in = movie['framesets'][frameset_hash]
            if 'movies' in template_job_results and \
                movie_url in template_job_results['movies'] and \
                frameset_hash in template_job_results['movies'][movie_url]['framesets']:
                template_matches_in = template_job_results['movies'][movie_url]['framesets'][frameset_hash]
            if 'movies' in ocr_job_results and \
                movie_url in ocr_job_results['movies'] and \
                frameset_hash in ocr_job_results['movies'][movie_url]['framesets']:
                ocr_matches_in = ocr_job_results['movies'][movie_url]['framesets'][frameset_hash]

            print('sifting image {}'.format(image_url.split('/')[-1]))
            cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)

            if type(cv2_image) == type(None):
                print('error fetching image for data_sifter')
                continue
            match_obj, match_stats, mask = data_sifter.sift_data(
                cv2_image, ocr_matches_in, other_t1_matches_in, template_matches_in, synthetic_data
            )
            if match_obj:
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = match_obj
            response_obj['statistics']['movies'][movie_url]['framesets'][frameset_hash] = match_stats

            if data_sifter_meta['scan_level'] != 'tier_1':
                self.redact_or_replace_user_data(response_obj, data_sifter_redactor, movie_url, frameset_hash, cv2_image)

        return response_obj

    def redact_or_replace_user_data(self, data_sifter_redactor, match_obj, cv2_image):
        redacted_image_url = data_sifter_redactor.redact_or_replace(cv2_image, match_obj)
        if redacted_image_url: 
            response_obj['movies'][movie_url]['framesets'][frameset_hash]['redacted_image_url'] = redacted_image_url

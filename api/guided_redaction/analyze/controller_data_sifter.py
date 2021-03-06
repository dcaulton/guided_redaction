from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.DataSifter import DataSifter


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

        response_obj = {
            'movies': {},
            'statistics': {},
        }
        source_movies = {}
        movies = request_data.get('movies')
        source_movies = movies['source']
        movie_url = list(source_movies.keys())[0]
        source_movie = source_movies[movie_url]
        movie = movies[movie_url]

        print('poclkie source movie {} =x=x=x=x=x============================== t1 movie {}'.format(source_movie, movie))
        scanner_id = list(request_data["tier_1_scanners"]['data_sifter'].keys())[0]
        data_sifter_meta = request_data["tier_1_scanners"]['data_sifter'][scanner_id]

        data_sifter = DataSifter(data_sifter_meta)

        response_obj['movies'][movie_url] = {}
        response_obj['movies'][movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        response_obj['statistics'] = {'movies': {}}
        response_obj['statistics']['movies'][movie_url] = {'framesets': {}}

        for frameset_hash in ordered_hashes:
            ocr_matches_in = {}
            other_t1_matches_in = {}
            if frameset_hash in movie['framesets']:
                for match_id in movie['framesets'][frameset_hash]:
                    print('-----------pibble {} '.format(movie['framesets'][frameset_hash][match_id]['scanner_type']))
                    if movie['framesets'][frameset_hash][match_id]['scanner_type'] == 'ocr':
                        ocr_matches_in[match_id] = movie['framesets'][frameset_hash][match_id]
                    else:
                        other_t1_matches_in[match_id] = movie['framesets'][frameset_hash][match_id]
            image_url = source_movie['framesets'][frameset_hash]['images'][0]
            print('sifting image {}'.format(image_url.split('/')[-1]))
            cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)

            if type(cv2_image) == type(None):
                print('error fetching image for data_sifter')
                continue
            match_obj, match_stats, mask = data_sifter.sift_data(cv2_image, ocr_matches_in, other_t1_matches_in)
            if match_obj:
                response_obj['movies'][movie_url]['framesets'][frameset_hash] = match_obj
            response_obj['statistics']['movies'][movie_url]['framesets'][frameset_hash] = match_stats
        return response_obj

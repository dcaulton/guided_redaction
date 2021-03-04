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

    def sift_data(self, request_data):
        response_movies = {}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]
        source_movie = source_movies[movie_url]

        scanner_id = list(request_data["tier_1_scanners"]['data_sifter'].keys())[0]
        data_sifter_meta = request_data["tier_1_scanners"]['data_sifter'][scanner_id]

        data_sifter = DataSifter(data_sifter_meta)

        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        statistics = {'movies': {}}
        statistics['movies'][movie_url] = {'framesets': {}}
        for frameset_hash in ordered_hashes:
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            if self.debug:
                image_name = image_url.split('/')[-1]
                print('sifting image {}'.format(image_name))
            cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
            if type(cv2_image) == type(None):
                print('error fetching image for data_sifter')
                continue
            match_obj, match_stats, mask = sifter.sift_data(
                cv2_image
            )
            if match_obj:
                if self.we_should_use_a_mask(mesh_match_meta, 1):
                    mask_string = self.get_base64_image_string(mask)
                    match_obj['mask'] = mask_string
                response_movies[movie_url]['framesets'][frameset_hash] = {}
                response_movies[movie_url]['framesets'][frameset_hash][match_obj['id']] = match_obj
            statistics['movies'][movie_url]['framesets'][frameset_hash] = match_stats
        return response_movies, statistics

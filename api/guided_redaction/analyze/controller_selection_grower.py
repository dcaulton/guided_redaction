from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.SelectionGrower import SelectionGrower
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher


class SelectionGrowerController(T1Controller):

    def __init__(self):
        self.debug = True
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def process_selection_grower(self, request_data):
        response_movies = {}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]
        source_movie = source_movies[movie_url]

        sg_id = list(request_data["tier_1_scanners"]['selection_grower'].keys())[0]
        sg_meta = request_data["tier_1_scanners"]['selection_grower'][sg_id]

        grower = SelectionGrower(sg_meta)

        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        statistics = {'movies': {}}
        statistics['movies'][movie_url] = {'framesets': {}}
        for frameset_hash in ordered_hashes:
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            if frameset_hash in movies[movie_url]['framesets']:
                if self.debug:
                    image_name = image_url.split('/')[-1]
                    print('selection grower trying image {}'.format(image_name))
                cv2_image = self.get_cv2_image_from_url(image_url)
                if type(cv2_image) == type(None):
                    continue
                t1_match_data = movies[movie_url]['framesets'][frameset_hash]
                if sg_meta['usage_mode'] == 'capture_grid' and \
                        not self.match_data_contains_scanner_type('ocr',          t1_match_data):
                    if sg_meta['skip_if_ocr_needed']:
                        continue
                    self.add_ocr_to_match_data(t1_match_data, cv2_image)
                if sg_meta['usage_mode'] == 'template_capture' and \
                        not self.match_data_contains_scanner_type('template', t1_match_data):
                    self.add_template_to_match_data(t1_match_data, sg_meta['template'], cv2_image)
                    if not self.match_data_contains_scanner_type('template', t1_match_data):
                        continue
                grown_selection, stats = grower.grow_selection(t1_match_data, cv2_image)
                if grown_selection:
                    response_movies[movie_url]['framesets'][frameset_hash] = grown_selection
                statistics['movies'][movie_url]['framesets'][frameset_hash] = stats
        return response_movies, statistics

    def match_data_contains_scanner_type(self, scanner_type, t1_match_data):
        for match_key in t1_match_data:
            if t1_match_data[match_key]['scanner_type'] == scanner_type:
                return True
        return False

    def add_template_to_match_data(self, t1_match_data, template, cv2_image):
        template_matcher = TemplateMatcher(template)
        for anchor in template.get("anchors"):
            match_image = template_matcher.get_match_image_for_anchor(anchor)
            match_obj = template_matcher.get_template_coords(cv2_image, match_image, anchor['id'])
            if match_obj['match_found']:
                print('adding a template scan to selection grower data')
                build_obj = {}
                (temp_coords, temp_scale) = match_obj['match_coords']
                anchor_size = [
                    temp_scale * (anchor['end'][0] - anchor['start'][0]),
                    temp_scale * (anchor['end'][1] - anchor['start'][1])
                ]
                build_obj['location'] = temp_coords
                build_obj['size'] = anchor_size
                build_obj['scale'] = temp_scale
                build_obj['scanner_type'] = 'template'
                t1_match_data[anchor['id']] = build_obj
            else:
                print('no match found for template for sg template capture')

    def add_ocr_to_match_data(self, t1_match_data, cv2_image):
        analyzer = EastPlusTessGuidedAnalyzer()
        start = (0, 0)
        end = (cv2_image.shape[1], cv2_image.shape[0])
        raw_rtas = analyzer.analyze_text(
            cv2_image,
            [start, end]
        )
        for rta in raw_rtas:
            t1_match_data[rta['id']] = rta

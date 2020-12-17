from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.OcrSceneAnalyzer import OcrSceneAnalyzer
from .controller_t1 import T1Controller


class OcrSceneAnalysisController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )

    def scan_scene(self, request_data):
        osa_id = list(request_data.get("tier_1_scanners")['ocr_scene_analysis'].keys())[0]
        osa = request_data.get("tier_1_scanners")['ocr_scene_analysis'][osa_id]
        skip_frames = int(osa['skip_frames'])
        movies = request_data.get("movies")
        source_movies = {}
        if 'source' in movies:
            source_movies = movies['source']
            del(movies['source'])
        build_response_data = {'movies': {}}
        build_statistics = {'movies': {}}
        for movie_url in movies:
            build_response_data['movies'][movie_url] = {'framesets': {}}
            build_statistics['movies'][movie_url] = {'framesets': {}}
            movie = movies[movie_url]
            for index, fs_hash in enumerate(movie['framesets']):
                if skip_frames == 0  or index >= skip_frames:
                    if 'images' in movie['framesets'][fs_hash] and movie['framesets'][fs_hash]['images']:
                        img_url = movie['framesets'][fs_hash]['images'][0]
                    else:
                        if source_movies and \
                            movie_url in source_movies and \
                            source_movies[movie_url] and \
                            'images' in source_movies[movie_url]['framesets'][fs_hash] and \
                            source_movies[movie_url]['framesets'][fs_hash]['images']:
                            img_url = source_movies[movie_url]['framesets'][fs_hash]['images'][0]
                    if not img_url:
                        print('no image found for osa frame {} in {}'.format(fs_hash, movie_url))
                        continue
                    resp_obj = self.analyze_one_frame(
                        img_url, osa, movie['framesets'][fs_hash]
                    )
                    if resp_obj:
                        (response, statistics) = resp_obj
                    for app_name in response:
                        if fs_hash not in build_response_data['movies'][movie_url]['framesets']:
                            build_response_data['movies'][movie_url]['framesets'][fs_hash] = {}
                        build_response_data['movies'][movie_url]['framesets'][fs_hash][app_name] = \
                            response[app_name]
                    build_statistics['movies'][movie_url]['framesets'][fs_hash] = statistics

        build_response_data['statistics'] = build_statistics
        return build_response_data

    def get_image_and_dimensions(self, img_url):
        frame_dimensions = (0, 0)
        cv2_image = self.get_cv2_image_from_url(img_url, self.file_writer)
        if type(cv2_image) == type(None):
            print('could not load image for osa')
        else:
            frame_dimensions = [cv2_image.shape[1], cv2_image.shape[0]]
        return frame_dimensions, cv2_image

    def analyze_one_frame(self, img_url, osa_rule, frameset):
        frameset_has_ocr_output = False
        for match_id in frameset:
            match_obj = frameset[match_id]
            if 'scanner_type' in match_obj and match_obj['scanner_type'] == 'ocr':
                frameset_has_ocr_output = True
            
        frame_dimensions, cv2_image = self.get_image_and_dimensions(img_url)
        raw_recognized_text_areas = []

        if frameset_has_ocr_output:
            for area_key in frameset.keys():
                rta = frameset[area_key]
                if 'scanner_type' not in rta or rta['scanner_type'] != 'ocr':
                    continue
                rta['start'] = rta['location']
                rta['end'] = [
                  rta['location'][0] + rta['size'][0],
                  rta['location'][1] + rta['size'][1]
                ]
                rta['origin'] = [0, 0]
                rta['scale'] = 1
                rta['id'] = area_key
                raw_recognized_text_areas.append(rta)
        else:
            if type(cv2_image) == type(None):
                print('bypassing detecting text, there is no image to work on')
            else:
                analyzer = EastPlusTessGuidedAnalyzer()
                start = (0, 0)
                end = (cv2_image.shape[1], cv2_image.shape[0])
                raw_recognized_text_areas = analyzer.analyze_text(
                    cv2_image, [start, end]
                )

        ocr_scene_analyzer = OcrSceneAnalyzer(raw_recognized_text_areas, osa_rule, frame_dimensions)

        return ocr_scene_analyzer.analyze_scene()



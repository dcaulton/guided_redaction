import cv2
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.OcrSceneAnalyzer import OcrSceneAnalyzer
from .controller_t1 import T1Controller
import numpy as np
from django.conf import settings
import requests

requests.packages.urllib3.disable_warnings()


class OcrSceneAnalysisController(T1Controller):

    def __init__(self):
        pass

    def scan_scene(self, request_data):
        osa = request_data.get("ocr_scene_analysis_meta")
        skip_frames = int(osa['skip_frames'])
        movies = request_data.get("movies")
        build_response_data = {'movies': {}}
        build_statistics = {'movies': {}}
        for movie_url in movies:
            build_response_data['movies'][movie_url] = {'framesets': {}}
            build_statistics['movies'][movie_url] = {'framesets': {}}
            movie = movies[movie_url]
            frames = movie['frames']
            framesets = movie['framesets']
            ordered_hashes = self.get_frameset_hashes_in_order(frames, framesets)
            for index, fs_hash in enumerate(ordered_hashes):
                if index % skip_frames == 0:
                    frameset = movie['framesets'][fs_hash]
                    (response, statistics) = self.analyze_one_frame(frameset, osa)
                    for app_name in response:
                        if fs_hash not in build_response_data['movies'][movie_url]['framesets']:
                            build_response_data['movies'][movie_url]['framesets'][fs_hash] = {}
                        build_response_data['movies'][movie_url]['framesets'][fs_hash][app_name] = \
                            response[app_name]
                    build_statistics['movies'][movie_url]['framesets'][fs_hash] = statistics

        build_response_data['statistics'] = build_statistics
        return build_response_data

    def analyze_one_frame(self, frameset, osa_rule):
        if 'images' not in frameset or not frameset['images']:
            return
        pic_response = requests.get(
          frameset['images'][0],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return 

        analyzer = EastPlusTessGuidedAnalyzer()
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        frame_dimensions = [cv2_image.shape[1], cv2_image.shape[0]]
        start = (0, 0)
        end = (cv2_image.shape[1], cv2_image.shape[0])

        raw_recognized_text_areas = analyzer.analyze_text(
            cv2_image, [start, end]
        )

        ocr_scene_analyzer = OcrSceneAnalyzer(raw_recognized_text_areas, osa_rule, frame_dimensions)

        return ocr_scene_analyzer.analyze_scene()



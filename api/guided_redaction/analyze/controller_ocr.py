import cv2
import json
import random
import os
from fuzzywuzzy import fuzz
from django.conf import settings
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from .controller_t1 import T1Controller


class OcrController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.fuzz_match_threshold = 70

    def scan_ocr_all(self, request_data):
        ocr_rule_id = list(request_data['tier_1_scanners']['ocr'].keys())[0]
        ocr_rule = request_data['tier_1_scanners']['ocr'][ocr_rule_id]
        self.fuzz_match_threshold = int(ocr_rule['match_percent'])

        all_phrases = {}
        if ocr_rule['match_text']:
            for phrase in ocr_rule['match_text']:
                if phrase.strip():
                    all_phrases[phrase.strip()] = {'source': 'ocr_rule_match_text'}

        ds_job_results = {}
        if ocr_rule.get('data_sifter_job_id'):
            ds_job = Job.objects.get(pk=ocr_rule.get('data_sifter_job_id'))
            ds_job_results = json.loads(ds_job.response_data)

        source_ocr_job_results = {}
        if ocr_rule.get('ocr_job_id'):
            so_job = Job.objects.get(pk=ocr_rule.get('ocr_job_id'))
            source_ocr_job_results = json.loads(so_job.response_data)

        response_data = {
            'movies': {},
            'statistics': {},
        }
        movies = request_data['movies']
        source_movies = {}
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']

        number_considered = 0
        if 'skip_frames' in ocr_rule:
            skip_frames = int(ocr_rule['skip_frames'])
        else:
            skip_frames = 0

        for movie_url in movies:
            movie = movies[movie_url]
            new_phrases = self.get_phrases_for_ds_movie(ocr_rule, movie_url, ds_job_results)
            if new_phrases:
                for phrase in new_phrases:
                    all_phrases[phrase] = new_phrases[phrase]
            for frameset_hash in movie['framesets']:
                number_considered += 1
                if skip_frames != 0 and number_considered < skip_frames + 1:
                    print('ocr skipping {}'.format(frameset_hash))
                    continue

                t1_frameset_data = {}
                if 'images' in movie['framesets'][frameset_hash]:
                    image_url = movie['framesets'][frameset_hash]['images'][0]
                else:
                    t1_frameset_data = movie['framesets'][frameset_hash]
                    image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]

                source_ocr_results_this_frame = {}
                if source_ocr_job_results and movie_url in source_ocr_job_results['movies'] and \
                    frameset_hash in source_ocr_job_results['movies'][movie_url]['framesets']:
                    source_ocr_results_this_frame = source_ocr_job_results['movies'][movie_url]['framesets'][frameset_hash]

                found_areas = self.scan_ocr(image_url, ocr_rule, t1_frameset_data, source_ocr_results_this_frame, all_phrases)

                if found_areas:
                    if movie_url not in response_data['movies']:
                        response_data['movies'][movie_url] = {'framesets': {}}
                    response_data['movies'][movie_url]['framesets'][frameset_hash] = found_areas

        return response_data

    def get_phrases_for_ds_movie(self, ocr_rule, movie_url, ds_job_results):
        if not ds_job_results:
            return
        if movie_url not in ds_job_results['movies']:
            return
        new_phrases = {}
        for frameset_hash in ds_job_results['movies'][movie_url]['framesets']:
            for match_id in ds_job_results['movies'][movie_url]['framesets'][frameset_hash]:
                match_obj = ds_job_results['movies'][movie_url]['framesets'][frameset_hash][match_id]
                if 'text' in match_obj and match_obj['text'] not in new_phrases:
                    build_obj = {
                        'source': 'data_sifter',
                        'data_sifter_meta_id': match_obj['data_sifter_meta_id'],
                        'app_id': match_obj['app_id'],
                    }
                    new_phrases[match_obj['text']] = build_obj
        print('phrases for ds movie are {} '.format(new_phrases.keys()))
        return new_phrases

    def phrase_match_found(self, input_text, phrases_to_match):
        found_a_match = False
        for phrase in phrases_to_match:
            ratio = fuzz.ratio(phrase, input_text)
            if ratio > self.fuzz_match_threshold:
                return phrases_to_match[phrase]

    def scan_ocr(self, image_url, ocr_rule, t1_frameset_data, source_ocr_results_this_frame, phrases_to_match):
        recognized_text_areas = {}
        analyzer = EastPlusTessGuidedAnalyzer()
        cv2_image = self.get_cv2_image_from_url(image_url, self.file_writer)
        if type(cv2_image) == type(None):
            print('error fetching image for ocr')
            return {}

        if ocr_rule['start']:
            start = ocr_rule['start']
        else:
            start = (0, 0)

        if ocr_rule['end']:
            end = ocr_rule['end']
        else:
            end = (cv2_image.shape[1], cv2_image.shape[0])

        if source_ocr_results_this_frame:
            for match_id in source_ocr_results_this_frame:
                match_obj = source_ocr_results_this_frame[match_id]
                if phrases_to_match:
                    phrase_match_results = self.phrase_match_found(match_obj['text'], phrases_to_match)
                    if phrase_match_results:
                        if phrase_match_results['source'] == 'data_sifter':
                            match_obj['data_sifter_meta_id'] = phrase_match_results['data_sifter_meta_id']
                            match_obj['app_id'] = phrase_match_results['app_id']
                        recognized_text_areas[match_id] = match_obj
            return recognized_text_areas

        if t1_frameset_data:
            cv2_image = self.apply_t1_limits_to_source_image(cv2_image, t1_frameset_data)

        if ocr_rule['skip_east']:
            tight_image = cv2_image[
                start[1]:end[1], 
                start[0]:end[0]
            ]
            gray = cv2.cvtColor(tight_image, cv2.COLOR_BGR2GRAY)
            bg_color = gray[1,1]
            if bg_color < 100:  # its light text on dark bg, invert
                gray = cv2.bitwise_not(gray)
            raw_recognized_text_areas = analyzer.analyze_text(
                gray, 
                [start, end],
                processing_mode='tess_only'
            )
        else:
            raw_recognized_text_areas = analyzer.analyze_text(
                cv2_image, [start, end]
            )

        for raw_rta in raw_recognized_text_areas:
            the_id = 'rta_' + str(random.randint(100000000, 999000000))
            
            if 'start' in raw_rta and 'end' in raw_rta:
                # we used east, so coords come with the ocr results
                size = [
                    raw_rta['end'][0]-raw_rta['start'][0], 
                    raw_rta['end'][1]-raw_rta['start'][1] 
                ]
                returned_start_coords = raw_rta['start']
            else:
                # 'skip east' requested, use adjusted box coords
                size = [
                    end[0] - start[0],
                    end[1] - start[1]
                ]
                returned_start_coords = start

            if phrases_to_match:
                if not self.phrase_match_found(raw_rta['text'], phrases_to_match):
                    continue

#            if phrases_to_match:
#                found_a_match = False
#                for phrase in phrases_to_match:
#                    ratio = fuzz.ratio(phrase, raw_rta['text'])
#                    if ratio > self.fuzz_match_threshold:
#                        found_a_match = True
#                if not found_a_match:
                    continue
                
            recognized_text_areas[the_id] = {
                'source': raw_rta['source'],
                'location': returned_start_coords,
                'size': size,
                'origin': (0, 0),
                'ocr_window_start': start, 
                'scale': 1,
                'scanner_type': 'ocr',
                'text': raw_rta['text']
            }

        return recognized_text_areas

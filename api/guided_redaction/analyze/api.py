import cv2
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
from guided_redaction.analyze.classes.TelemetryAnalyzer import TelemetryAnalyzer
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ChartMaker import ChartMaker
from guided_redaction.analyze.classes.OcrMovieAnalyzer import OcrMovieAnalyzer
from guided_redaction.analyze.classes.HogScanner import HogScanner
from guided_redaction.analyze.classes.DataSifterCompiler import DataSifterCompiler
from .controller_selected_area import SelectedAreaController
from .controller_ocr import OcrController
from .controller_ocr_scene_analysis import OcrSceneAnalysisController
from .controller_template import TemplateController
from .controller_filter import FilterController
from .controller_timestamp import TimestampController
from .controller_entity_finder import EntityFinderController
import json
import numpy as np
from django.conf import settings
from django.shortcuts import render
import re
import requests
from base import viewsets
from rest_framework.response import Response
from guided_redaction.jobs.models import Job
from guided_redaction.utils.classes.FileWriter import FileWriter


requests.packages.urllib3.disable_warnings()

def get_frameset_hash_for_frame(frame, framesets):
    for frameset_hash in framesets:
        if frame in framesets[frameset_hash]['images']:
            return frameset_hash

def get_frameset_hashes_in_order(frames, framesets):
    ret_arr = []
    for frame in frames:
        frameset_hash = get_frameset_hash_for_frame(frame, framesets)
        if frameset_hash and frameset_hash not in ret_arr:
            ret_arr.append(frameset_hash)
    return ret_arr


def find_any_template_anchor_match_in_image(template, target_image):
    template_matcher = TemplateMatcher(template)
    for anchor in template['anchors']:
        match_image = template_matcher.get_match_image_for_anchor(anchor)
        match_obj = template_matcher.get_template_coords(
            target_image, match_image
        )
        if match_obj['match_found']:
            (temp_coords, temp_scale) = match_obj['match_coords']
            return temp_coords


class AnalyzeViewSetOcr(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required", status_code=400)
        if not request_data.get("ocr_rule"):
            return self.error("ocr_rule is required", status_code=400)
        pic_response = requests.get(
          request_data["image_url"],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return self.error("couldnt read image data", status_code=422)

        worker = OcrController()
        recognized_text_areas = worker.scan_ocr(request_data)

        return Response(recognized_text_areas)


class AnalyzeViewSetScanTemplate(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        matches = {'movies': {}}
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        if not request_data.get("movies"):
            return self.error("movies is required")
        if 'template' not in request_data['tier_1_scanners']:
            return self.error("tier_1_scanners > template is required")

        worker = TemplateController()
        matches = worker.scan_template(request_data)

        return Response(matches)


class AnalyzeViewSetSelectedArea(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        response_movies = {}
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("selected_area_meta"):
            return self.error("selected_area_meta is required")

        worker = SelectedAreaController()
        response_movies = worker.build_selected_areas(request_data)

        return Response({"movies": response_movies})


class AnalyzeViewSetFilter(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("filter_parameters"):
            return self.error("filter_parameters is required")

        worker = FilterController()
        response_movies = worker.run_filter(request_data)

        return Response({'movies': response_movies})


class AnalyzeViewSetTelemetry(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("telemetry_data"):
            return self.error("telemetry_data is required")
        if not request_data.get("telemetry_rule"):
            return self.error("telemetry_rule is required")
        movies = request_data["movies"]
        telemetry_rule = request_data["telemetry_rule"]
        telemetry_data = request_data["telemetry_data"]
        if 'raw_data_url' not in telemetry_data.keys():
            return self.error("telemetry raw data is required")
        if 'movie_mappings' not in telemetry_data.keys():
            return self.error("telemetry movie mappings is required")
        movie_mappings = telemetry_data['movie_mappings']
        analyzer = TelemetryAnalyzer()
        matching_frames = {}
        matching_frames['movies'] = {}

        telemetry_raw_data = requests.get(
          telemetry_data['raw_data_url'],
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        ).text
        telemetry_data = telemetry_raw_data.split('\n')
        if telemetry_data:
            for movie_url in movies.keys():
                print('scanning telemetry data for movie {}'.format(movie_url))
                matching_frames_for_movie = []
                movie_filename = movie_url.split('/')[-1]
                movie_id = movie_filename.split('.')[0]
                if movie_id not in movie_mappings:
                    print('cannot find recording id for movie url {}, {}, skipping'.format(movie_url, movie_id ))
                    continue
                movie = movies[movie_url]
                transaction_id = movie_mappings[movie_id]
                relevant_telemetry_rows = self.get_relevant_telemetry_rows(transaction_id, telemetry_data)
                if relevant_telemetry_rows:
                    matching_frames_for_movie = analyzer.find_matching_frames(
                        movie_url=movie_url,
                        movie=movie, 
                        telemetry_data=relevant_telemetry_rows, 
                        telemetry_rule=telemetry_rule
                    )
                matching_frames['movies'][movie_url] = matching_frames_for_movie

        return Response(matching_frames)

    def get_relevant_telemetry_rows(self, transaction_id, telemetry_data):
        matching_rows = []
        regex = re.compile(transaction_id.upper())
        for row in telemetry_data:
            if regex.search(row):
                matching_rows.append(row)
        return matching_rows


class AnalyzeViewSetTimestamp(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        worker = TimestampController()
        response_obj = worker.scan_timestamp(request_data)

        return Response(response_obj)


class AnalyzeViewSetTemplateMatchChart(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_data"):
            return self.error("job_data is required", status_code=400)
        job_data = request_data.get('job_data')
        chart_info = {
            'chart_type': 'template_match',
        }
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        chart_maker = ChartMaker(
            chart_info, job_data, file_writer, settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS
        )
        charts_obj = chart_maker.make_charts()

        return Response({'movies': charts_obj})


class AnalyzeViewSetOcrMatchChart(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_data"):
            return self.error("job_data is required", status_code=400)
        job_data = request_data.get('job_data')
        chart_info = {
            'chart_type': 'ocr_match',
        }
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        chart_maker = ChartMaker(
            chart_info, job_data, file_writer, settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS
        )
        charts_obj = chart_maker.make_charts()

        return Response({'movies': charts_obj})


class AnalyzeViewSetSelectedAreaChart(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_data"):
            return self.error("job_data is required", status_code=400)
        job_data = request_data.get('job_data')
        chart_info = {
            'chart_type': 'selected_area',
        }
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        chart_maker = ChartMaker(
            chart_info, job_data, file_writer, settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS
        )
        charts_obj = chart_maker.make_charts()

        return Response({'movies': charts_obj})


class AnalyzeViewSetOcrSceneAnalysisChart(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_data"):
            return self.error("job_data is required", status_code=400)
        job_data = request_data.get('job_data')
        chart_info = {
            'chart_type': 'ocr_scene_analysis_match',
        }
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        chart_maker = ChartMaker(
            chart_info, job_data, file_writer, settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS
        )
        charts_obj = chart_maker.make_charts()

        return Response({'movies': charts_obj})


class AnalyzeViewSetOcrSceneAnalysis(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        if not request_data.get("ocr_scene_analysis_meta"):
            return self.error("ocr_scene_analysis_meta is required", status_code=400)
        worker = OcrSceneAnalysisController()
        build_response_data = worker.scan_scene(request_data)

        return Response(build_response_data)


class AnalyzeViewSetOcrMovieAnalysis(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_first_scan(request_data)

    def process_first_scan_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        if not request_data.get("oma_rule"):
            return self.error("oma_rule is required", status_code=400)
        movies = request_data['movies']
        movie_url = list(movies.keys())[0]
        i1 = movie_url.split('/')[-1]
        movie_uuid = i1.split('.')[0]
        frameset_hash = list(movies[movie_url]['framesets'].keys())[0]
        image_url = movies[movie_url]['framesets'][frameset_hash]['images'][0]
        i2 = image_url.split('/')[-1]
        image_name = i2.split('.')[0]
        file_name_fields = {
            'movie_uuid': movie_uuid,
            'image_name': image_name,
        }

        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return self.error('could not open image for frameset')

        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        analyzer = EastPlusTessGuidedAnalyzer(debug=request_data['oma_rule']['debug_level'])
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        start = (0, 0)
        end = (cv2_image.shape[1], cv2_image.shape[0])

        raw_rtas = analyzer.analyze_text(
            cv2_image, [start, end]
        )

        template_ignore_points = []
        for template_id in request_data['oma_rule']['ignore_templates']:
            template = request_data['oma_rule']['ignore_templates'][template_id]
            template_coords = find_any_template_anchor_match_in_image(template, cv2_image)
            if template_coords:
                template_ignore_points.append(template_coords)

        ocr_movie_analyzer = OcrMovieAnalyzer(request_data['oma_rule'], file_writer)
        results = ocr_movie_analyzer.collect_one_frame(
            raw_rtas, 
            cv2_image, 
            file_name_fields, 
            template_ignore_points
        )

        return Response(results)

    def process_condense_all_frames_request(self, request_data):
        if not request_data.get("job_ids"):
            return self.error("job_ids is required", status_code=400)
        job_ids = request_data['job_ids']
        job_data = {}
        for job_id in job_ids:
            if not Job.objects.filter(pk=job_id).exists():
                return self.error('could not fetch job with id {}'.format(job_id))
            child_job = Job.objects.get(pk=job_id)
            child_response_data = json.loads(child_job.response_data)
            child_request_data = json.loads(child_job.request_data)
            job_data[job_id] = {
                'request_data': child_request_data,
                'response_data': child_response_data,
            }
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        ocr_movie_analyzer = OcrMovieAnalyzer(True, file_writer)
        results = ocr_movie_analyzer.condense_all_frames(job_data)

        return Response(results)


class AnalyzeViewSetEntityFinder(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        if not request_data.get("entity_finder_meta"):
            return self.error("entity_finder_meta is required", status_code=400)

        worker = EntityFinderController()
        build_response_data = worker.find_entities(request_data)

        return Response(build_response_data)


class AnalyzeViewSetTrainHog(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required", status_code=400)
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        hog_rule_id = list(request_data['tier_1_scanners']['hog'].keys())[0]
        hog_rule = request_data['tier_1_scanners']['hog'][hog_rule_id]
        movies = request_data['movies']
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        hog_scanner = HogScanner(
            hog_rule,
            movies,
            file_writer
        )
        results = hog_scanner.train_model()

        return Response(results)


class AnalyzeViewSetTestHog(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required", status_code=400)
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        hog_rule_id = list(request_data['tier_1_scanners']['hog'].keys())[0]
        hog_rule = request_data['tier_1_scanners']['hog'][hog_rule_id]
        movies = request_data['movies']
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        hog_scanner = HogScanner(
            hog_rule,
            movies,
            file_writer
        )
        results = hog_scanner.test_model()

        return Response(results)


class AnalyzeViewSetCompileDataSifter(viewsets.ViewSet) :
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required", status_code=400)
        if not request_data.get("movies"):
            return self.error("movies is required", status_code=400)
        response_movies = {}
        t1_scanners = request_data.get('tier_1_scanners')
        first_key = list(t1_scanners['data_sifter'].keys())[0]
        data_sifter = t1_scanners['data_sifter'][first_key]
        movies = request_data.get("movies")
        file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        worker = DataSifterCompiler(data_sifter, movies, file_writer)
        results = worker.compile()

        return Response(results)

import cv2
from guided_redaction.analyze.classes.TelemetryAnalyzer import TelemetryAnalyzer
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ChartMaker import ChartMaker
from guided_redaction.analyze.classes.HogScanner import HogScanner
from guided_redaction.analyze.classes.DataSifterCompiler import DataSifterCompiler
from .controller_selected_area import SelectedAreaController
from .controller_mesh_match import MeshMatchController
from .controller_ocr import OcrController
from .controller_ocr_scene_analysis import OcrSceneAnalysisController
from .controller_template import TemplateController
from .controller_filter import FilterController
from .controller_timestamp import TimestampController
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


class AnalyzeViewSetOcr(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required", status_code=400)
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required", status_code=400)
        t1s = request_data.get("tier_1_scanners")
        if 'ocr' not in t1s:
            return self.error("tier_1_scanners must have an ocr child", status_code=400)
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
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        t1s = request_data.get("tier_1_scanners")
        if 'selected_area' not in t1s:
            return self.error("tier_1_scanners needs to have a selected_area child")

        worker = SelectedAreaController()
        response_movies = worker.build_selected_areas(request_data)

        return Response({"movies": response_movies})


class AnalyzeViewSetMeshMatch(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        response_movies = {}
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        t1s = request_data.get("tier_1_scanners")
        if 'mesh_match' not in t1s:
            return self.error("tier_1_scanners needs to have a mesh_match child")

        worker = MeshMatchController()
        response_movies, response_statistics = worker.process_mesh_match(request_data)

        return Response({
            "movies": response_movies,
            "statistics": response_statistics,
        })


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


class AnalyzeViewSetChart(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_data"):
            return self.error("job_data is required", status_code=400)
        if not request_data.get("chart_info"):
            return self.error("chart_info is required", status_code=400)
        job_data = request_data.get('job_data')
        chart_info = request_data.get('chart_info')
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
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required", status_code=400)
        t1s = request_data.get("tier_1_scanners")
        if 'ocr_scene_analysis' not in t1s:
            return self.error("tier_1_scanners must have an ocr_scene_analysis element", status_code=400)

        worker = OcrSceneAnalysisController()
        build_response_data = worker.scan_scene(request_data)

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

from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.ChartMaker import ChartMaker
from guided_redaction.analyze.classes.HogScanner import HogScanner
from .controller_selected_area import SelectedAreaController
from .controller_mesh_match import MeshMatchController
from .controller_selection_grower import SelectionGrowerController
from .controller_ocr import OcrController
from .controller_template import TemplateController
from .controller_filter import FilterController
from .controller_timestamp import TimestampController
from .controller_intersect import IntersectController
from .controller_get_screens import GetScreensController
from .controller_data_sifter import DataSifterController
from .controller_data_sifter_manual_compile import DataSifterManualCompileController
import json
from django.conf import settings
from django.shortcuts import render
import re
import requests
from base import viewsets
from rest_framework.response import Response
from guided_redaction.utils.classes.FileWriter import FileWriter

requests.packages.urllib3.disable_warnings()


class AnalyzeViewSetOcr(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        if not request_data.get("movies"):
            return self.error("movies is required")
        if 'ocr' not in request_data['tier_1_scanners']:
            return self.error("tier_1_scanners > ocr is required")

        worker = OcrController()
        matches = worker.scan_ocr_all(request_data)

        return Response(matches)


class AnalyzeViewSetScanTemplate(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
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


class AnalyzeViewSetSelectionGrower(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("movies"):
            return self.error("movies is required")
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        t1s = request_data.get("tier_1_scanners")
        if 'selection_grower' not in t1s:
            return self.error("tier_1_scanners needs to have a selection_grower child")

        worker = SelectionGrowerController()
        response_movies, response_statistics = worker.process_selection_grower(request_data)

        return Response({
            "movies": response_movies,
            "statistics": response_statistics,
        })


class AnalyzeViewSetMeshMatch(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
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


class AnalyzeViewSetManualCompileDataSifter(viewsets.ViewSet) :
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        if not request_data.get("movies"):
            return self.error("movies is required")
        if 'data_sifter' not in request_data['tier_1_scanners']:
            return self.error("tier_1_scanners > data_sifter is required")

        worker = DataSifterManualCompileController()
        data_sifter = worker.compile(request_data)

        return Response(data_sifter)

class AnalyzeViewSetIntersect(viewsets.ViewSet) :
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("job_ids"):
            return self.error("job_ids is required", status_code=400)

        worker = IntersectController()
        response_data = worker.intersect_jobs(request_data)

        return Response(response_data)

class AnalyzeViewSetGetScreens(viewsets.ViewSet) :
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("image_url"):
            return self.error("image_url is required", status_code=400)

        worker = GetScreensController()
        response_data = worker.get_screens(request_data)

        return Response(response_data)

class AnalyzeViewSetDataSifter(viewsets.ViewSet):
    def create(self, request):
        request_data = request.data
        return self.process_create_request(request_data)

    def process_create_request(self, request_data):
        if not request_data.get("tier_1_scanners"):
            return self.error("tier_1_scanners is required")
        if not request_data.get("movies"):
            return self.error("movies is required")
        if 'data_sifter' not in request_data['tier_1_scanners']:
            return self.error("tier_1_scanners > data_sifter is required")

        worker = DataSifterController()
        matches = worker.sift_data(request_data)

        return Response(matches)

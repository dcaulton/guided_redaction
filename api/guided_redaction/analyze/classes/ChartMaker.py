import numpy as np


class ChartMaker:

    def __init__(self, chart_info, job_data, file_writer):
        self.chart_info = chart_info
        self.job_data = job_data
        self.file_writer = file_writer

    def make_charts(self):
        response_obj = {}
        if self.chart_info['chart_type'] == 'template_match':
            response_obj['template_match'] = self.make_template_match_chart()
        return response_obj

    def make_template_match_chart(self):
        return 'haha'

import cv2
import re
import datetime
from guided_redaction.analyze.classes.EastPlusTessScanner import EastPlusTessScanner


class TelemetryAnalyzer:
    def __init__(self):
        pass

    def find_matching_frames(self, 
            movie_url='',
            recording_id='',
            movie={},
            telemetry_data=[],
            telemetry_rule=''
        ):

        print('-------------------- telemetry rule----------')
        print(telemetry_rule)

        datetime_regex = '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
        datetime_format_string = '%Y-%m-%d %H:%M:%S'

        # For now, we support a single rule with a single start condition
        winning_times = []
        start_time = datetime.datetime.now()
        start_condition = telemetry_rule['start_conditions'][0]
        split_point = start_condition.find(':')
        if split_point > -1:
            telemetry_app = start_condition[0:split_point]
            rule_string = start_condition[split_point+1:]
        for data_row in telemetry_data:
            hit_time_string = re.findall(datetime_regex, data_row)[0]
            hit_time = datetime.datetime.strptime(hit_time_string, datetime_format_string)
            if hit_time < start_time:
                start_time = hit_time
            if re.findall(rule_string, data_row):
                winning_times.append(hit_time)
        winning_offsets = [(winning_time - start_time).seconds for winning_time in winning_times]
        winning_offsets.sort()

        print('winning offsets are {}'.format(winning_offsets))
        if winning_offsets:
            print('first dirty frame should be {}'.format(movie['frames'][winning_offsets[0]]))
        return winning_offsets


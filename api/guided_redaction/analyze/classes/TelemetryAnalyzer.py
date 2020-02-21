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
        rule_string = telemetry_rule['start_conditions'][0]
        for data_row in telemetry_data:
            hit_time_string = re.findall(datetime_regex, data_row)[0]
            hit_time = datetime.datetime.strptime(hit_time_string, datetime_format_string)
            if hit_time < start_time:
                start_time = hit_time
            if re.findall(rule_string, data_row):
                winning_times.append(hit_time)


        winning_offsets = [(winning_time - start_time).seconds for winning_time in winning_times]
        if winning_offsets:
            if 'start_timestamp' in movie and 'second' in movie['start_timestamp']:
                # this means we ran ocr on the movie taskbar and have a detected start time for the movie
                # These times seem to lag telemetry start time by a varying number of seconds
                # Let's find this number and use it to tweak our offsets 
                # we assume movie start time from ocr will ALWAYS lag telemetry start time
                if movie['start_timestamp']['minute'] > start_time.minute:
                    the_hour = start_time.hour
                elif (movie['start_timestamp']['minute'] == start_time.minute and 
                        movie['start_timestamp']['second'] > start_time.second):
                    the_hour = start_time.hour
                else:
                    the_hour = start_time.hour + 1
                ocr_time = datetime.datetime(
                    start_time.year,
                    start_time.month,
                    start_time.day,
                    the_hour,
                    movie['start_timestamp']['minute'],
                    movie['start_timestamp']['second'],
                )
                ocr_offset = (ocr_time - start_time).seconds
                print('telemetry start time: {}'.format(start_time))
                print('ocr start time: {}'. format(ocr_time))
                print('ocr offset: {}'. format(ocr_offset))
                winning_offsets = [winning_offset - ocr_offset for winning_offset in winning_offsets]
            winning_offsets.sort()

            print('winning offsets: {}'.format(winning_offsets))
            print('num movie frames: {}'.format(len(movie['frames'])))
            print('first dirty frame should be {}'.format(movie['frames'][winning_offsets[0]]))
            return winning_offsets
        return []


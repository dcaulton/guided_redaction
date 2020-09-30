import cv2
import random
import math
import datetime
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import (
    EastPlusTessGuidedAnalyzer,
)
import numpy as np
from django.conf import settings
import re
import requests

requests.packages.urllib3.disable_warnings()


class TimestampController:

    def __init__(self):
        pass

    def scan_timestamp(self, request_data):
        response_obj = {}
        analyzer = EastPlusTessGuidedAnalyzer(debug=False)
        movies = request_data.get('movies')
        for movie_url in movies:
            response_obj[movie_url] = {}
            if 'frames' not in movies[movie_url]:
                print('movie {} was not already split into frames'.format(movie_url))
                continue
            blue_screen_timestamp = self.get_timestamp_from_blue_screen(movies[movie_url], analyzer)
            if blue_screen_timestamp:
                response_obj[movie_url] = blue_screen_timestamp
            else:
                taskbar_timestamp = self.get_timestamp_from_task_bar(movies[movie_url], analyzer)
                if taskbar_timestamp:
                    response_obj[movie_url] = taskbar_timestamp
        return response_obj

    def get_timestamp_from_blue_screen(self, movie, analyzer):
        image_url = movie['frames'][0]
        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return self.error('could not retrieve the first frame for '+movie_url)
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if not self.screen_is_blue_screen(cv2_image):
          return
        print('looking for timestamp from blue screen')
        recognized_text_areas = analyzer.analyze_text(
            cv2_image,
            [(0, 0), (cv2_image.shape[1], cv2_image.shape[0])]
        )
        for rta in recognized_text_areas:
            blue_screen_regex = re.compile('(\d+):(\d+):(\d+) ([A|P])M')
            match = blue_screen_regex.search(rta['text'])
            if match:
                print('got a hit on the blue screen')
                the_hour = match.group(1)
                the_minute = match.group(2)
                the_second = match.group(3)
                the_am_pm = match.group(4)
                time_result = {
                    'hour': the_hour,
                    'minute': the_minute,
                    'second': the_second,
                    'am_pm': the_am_pm + 'M',
                }
                return time_result

    def screen_is_blue_screen(self, cv2_image): 
        dim_y, dim_x = cv2_image.shape[:2]
        if dim_y < 100 or dim_x < 100:
            return False
        swatch = cv2_image[dim_y-20:dim_y, dim_x-20: dim_x]

        for i in range(10):
            rand_x = random.randint(0, 19)
            rand_y = random.randint(0, 19)
            if swatch[rand_y,rand_x][0] != 227 or swatch[rand_y,rand_x][1] != 154 or swatch[rand_y,rand_x][2] != 3:
                return False
        return True

    def get_timestamp_from_task_bar(self, movie, analyzer):
        print('looking for timestamp from taskbar')
        prev_minute = None
        cur_minute = None
        known_minute_at_offset = {}
        minute_change_at_offset = {}
        for cur_index, image_url in enumerate(movie['frames']):
            print('advancing to frame at offset {}'.format(cur_index))
            prev_minute = cur_minute
            cur_minute = self.fetch_minute_from_image_task_bar(image_url, analyzer, cur_index)
            if cur_minute and prev_minute:
                print('comparing cur {} to prev {} at index {}'.format(cur_minute, prev_minute, cur_index))
                if (cur_minute == prev_minute + 1)  or  (cur_minute == 0 and prev_minute == 59):
                    print('========= just saw the minute change')
                    cur_minute_offset = math.floor(cur_index / 60)
                    cur_second_offset = cur_index % 60
                    minute_change_at_offset = {
                        'cur_minute': cur_minute,
                        'prev_minute': prev_minute,
                        'cur_minute_offset': cur_minute_offset,
                        'cur_second_offset': cur_second_offset,
                        'cur_offset': cur_index,
                    }
                    break
        print('========== SUMMARY')
        print('minute change at offset')
        print(minute_change_at_offset)
        if  minute_change_at_offset:
            cur_datetime = datetime.datetime(
                year=2020,
                month=1,
                day=2,
                hour=10,
                minute=minute_change_at_offset['cur_minute'],
                second=0
            )
            start_time  = cur_datetime - datetime.timedelta(seconds=minute_change_at_offset['cur_offset'])
            start_time_obj = {
              'minute': start_time.minute,
              'second': start_time.second,
            }
            print('computed start time: {}:{}'.format(start_time_obj['minute'], start_time_obj['second']))
            return start_time_obj

    def fetch_minute_from_image_task_bar(self, image_url, analyzer, cur_index):
        print('fetching minutes from {}'.format(image_url))
        pic_response = requests.get(
          image_url,
          verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        image = pic_response.content
        if not image:
            return 
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        dim_x = cv2_image.shape[1]
        dim_y = cv2_image.shape[0]

        time_region_image = cv2_image[dim_y-40:dim_y-20, dim_x-75:dim_x]
        gray = cv2.cvtColor(time_region_image, cv2.COLOR_BGR2GRAY)
        bg_color = gray[1,1]
        if bg_color < 100:  # its light text on dark bg, invert
            gray = cv2.bitwise_not(gray)
        recognized_text_areas = analyzer.analyze_text(
            gray,
            '',
            processing_mode='tess_only'
        )

        for rta in recognized_text_areas:
            text = rta['text']
            text_codes = [ord(x) for x in text]
            print('text in **{}** {}'.format(text, text_codes))
            text = self.cast_probably_numbers(text)
            text_codes = [ord(x) for x in text]
            print('--transformed to **{}** {}'.format(text, text_codes))
            match = re.search('(\w*)(:?)(\d\d)(\s*)(\S)M', text)
            if match:
                the_minute = int(match.group(3))
                return the_minute

    def cast_probably_numbers(self, text):
        text = text.replace('l', '1')
        text = text.replace('I', '1')
        text = text.replace('[', '1')
        text = text.replace(']', '1')
        text = text.replace('i', '1')
        text = text.replace('|', '1')
        text = text.replace('{', '1')
        text = text.replace('}', '1')
        text = text.replace('O', '0')
        text = text.replace('.', ':')
        return text

    def get_timestamp_from_blue_screen_png_bytes(self, image):
        # a stand alone method to help Scott with something
        # let Scott know if it's moving locations
        analyzer = EastPlusTessGuidedAnalyzer(debug=False)
        nparr = np.fromstring(image, np.uint8)
        cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        time_region_image = cv2_image[169:208, 91:465]
        gray = cv2.cvtColor(time_region_image, cv2.COLOR_BGR2GRAY)
        bg_color = gray[1,1]
        if bg_color < 100:  # its light text on dark bg, invert
            gray = cv2.bitwise_not(gray)
        recognized_text_areas = analyzer.analyze_text(
            gray,
            '',
            processing_mode='tess_only'
        )
        time_result = {}
        date_result = {}
        found_datetime = None
        time_regex = re.compile('(\d+):(\d+):(\d+) ([A|P])')
        date_regex = re.compile('(\d+)/(\d+)/(\d+)\s* ')
        for rta in recognized_text_areas:
            text = rta['text']
            text = self.cast_probably_numbers(text)
            match = time_regex.search(text)
            if match:
                the_hour = match.group(1)
                the_minute = match.group(2)
                the_second = match.group(3)
                the_am_pm = match.group(4)
                time_result = {
                    'hour': int(the_hour),
                    'minute': int(the_minute),
                    'second': int(the_second),
                    'am_pm': the_am_pm + 'M',
                }
            match = date_regex.search(text)
            if match:
                the_month = match.group(1)
                the_day = match.group(2)
                the_year = match.group(3)
                date_result = {
                    'day': int(the_day),
                    'month': int(the_month),
                    'year': int(the_year),
                }
        if date_result and time_result:
            if time_result['am_pm'] == 'PM' and time_result['hour'] < 12:
                time_result['hour'] += 12
            if time_result['am_pm'] == 'AM' and time_result['hour'] == 12:
                time_result['hours'] = 0
            found_datetime = datetime.datetime(
                date_result['year'],
                date_result['month'],
                date_result['day'],
                time_result['hour'],
                time_result['minute'],
                time_result['second']
            )
        return found_datetime


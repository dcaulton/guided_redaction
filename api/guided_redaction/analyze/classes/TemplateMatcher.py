import base64
import cv2
import imutils
import requests
import numpy as np


class TemplateMatcher:
    debug = False
    use_grayscale_edges = False

    def __init__(self, template_data):
        self.template = template_data
        self.template_match_percent = 0.9
        try:
            mp_in = int(template_data.get('match_percent'))
            if mp_in > 1:
                mp_in /= 100
            self.template_match_percent = mp_in
            if template_data.get('match_percent').find('.') > -1:
                self.template_match_percent = float(template_data.get('match_percent'))
        except Exception as e:
            pass

        scale = template_data.get('scale', '1:1')
        if scale == '+/-25/1':
            self.scales = np.linspace(.75, 1.25, 51)[::-1]
        elif scale == '+/-25/5':
            self.scales = np.linspace(.75, 1.25, 11)[::-1]
        elif scale == '+/-40/1':
            self.scales = np.linspace(.60, 1.40, 81)[::-1]
        elif scale == '+/-40/5':
            self.scales = np.linspace(.60, 1.40, 17)[::-1]
        elif scale == '+/-50/1':
            self.scales = np.linspace(.50, 1.50, 101)[::-1]
        elif scale == '+/-50/5':
            self.scales = np.linspace(.50, 1.50, 21)[::-1]
        elif scale == '+/-50/10':
            self.scales = np.linspace(.50, 1.50, 11)[::-1]
        elif scale == '+/-10/1':
            self.scales = np.linspace(.90, 1.1, 11)[::-1]
        elif scale == '+/-10/5':
            self.scales = np.linspace(.90, 1.1, 5)[::-1]
        elif scale == '+/-20/1':
            self.scales = np.linspace(.80, 1.2, 21)[::-1]
        elif scale == '+/-20/5':
            self.scales = np.linspace(.80, 1.2, 9)[::-1]
        elif scale == '+/-20/10':
            self.scales = np.linspace(.80, 1.2, 5)[::-1]
        else:
            self.scales = [1]

        self.matches = {}
        for anchor in self.template['anchors']:
            self.matches[anchor['id']] = {}

        self.scale_match_threshold_count = 5

    def rearrange_scales(self, anchor_id, movie_url):
        if len(self.scales) == 1:
            return
        ma_matches = self.matches[anchor_id][movie_url]
        for scale in ma_matches:
            if ma_matches[scale] >= self.scale_match_threshold_count:
                self.scales = [scale]
                return
        
    def get_template_coords(self, source, template, anchor_id, movie_url=''):
        # movie url enables the acceleration feature when you match against many movie frames
        #   disabling it by sending in spaces is harmless, and if you're just doing an isolated
        #   single frame template match it's the better choice
        if movie_url not in self.matches[anchor_id]:
            self.matches[anchor_id][movie_url] = {}
        
        if self.use_grayscale_edges:
            tm_template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            tm_template = cv2.Canny(tm_template, 50, 200)
            tm_source = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
            tm_source = cv2.Canny(tm_source, 50, 200)
        else:
            tm_template = template
            tm_source = source

        if 'any' not in dir(tm_source):
            return ()  
            # this means we have an unusable image we're scanning for the template
            # it happens sometimes, I saw it with a large file that was encoded differently
            # from how we do screencap movies, some kind of windows screencast stuff

        found = (0, (-1, -1), 0)
        match_was_found = False
        scaled_match_upper_left = ()
        found_scale = 0

        for scale in self.scales:
            new_width = int(tm_source.shape[1] * scale)
            resized = imutils.resize(tm_source, width=new_width)
            res = cv2.matchTemplate(resized, tm_template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val > found[0]:
                found = (max_val, max_loc, scale)
        match_percent_short = '{0:.4f}'.format(found[0])
        match_scale_short = '{0:.2f}'.format(found[2])
        match_metadata = {
            'scale': match_scale_short,
            'percent': match_percent_short,
        }

        if found[0] > self.template_match_percent:
            match_was_found = True
            template_top_left = found[1]
            found_scale = found[2]
            found_scale = round(found_scale, 4)
            scaled_match_upper_left = (
                int(template_top_left[0] / found_scale), 
                int(template_top_left[1] / found_scale)
            )
            self.update_matches(found_scale, anchor_id, movie_url)
            self.rearrange_scales(anchor_id, movie_url)

        return {
            'match_found': match_was_found,
            'match_coords': (scaled_match_upper_left, found_scale),
            'match_metadata': match_metadata,
        }

    def update_matches(self, found_scale, anchor_id, movie_url):
        if found_scale in self.matches[anchor_id][movie_url]:
            self.matches[anchor_id][movie_url][found_scale] += 1
        else:
            self.matches[anchor_id][movie_url][found_scale] = 1

    def get_match_image_for_anchor(self, anchor):
        if 'cropped_image_bytes' in anchor:
            img_base64 = anchor['cropped_image_bytes']
            img_bytes = base64.b64decode(img_base64)
            nparr = np.fromstring(img_bytes, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2_image

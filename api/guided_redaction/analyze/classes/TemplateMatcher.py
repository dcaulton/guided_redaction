import cv2
import imutils
import numpy as np


class TemplateMatcher:
    debug = False
    use_grayscale_edges = False

    def __init__(self, template_data):
        self.template_match_percent = 0.9
        try:
            mp_in = template_data.get('match_percent')
            if mp_in.__class__.__name__ == 'string':
                mp_in = float(mp_in)
            if mp_in > 1:
                mp_in /= 100
            self.template_match_percent = mp_in
        except Exception as e:
            pass

        scale = template_data.get('scale', '1:1')
        if scale == '+/-25/1':
            self.scales = np.linspace(.75, 1.25, 51)[::-1]
        elif scale == '+/-25/5':
            self.scales = np.linspace(.75, 1.25, 11)[::-1]
        elif scale == '+/40/5':
            self.scales = np.linspace(.60, 1.40, 81)[::-1]
        elif scale == '+/50/5':
            self.scales = np.linspace(.50, 1.50, 21)[::-1]
        elif scale == '+/-10/1':
            self.scales = np.linspace(.90, 1.1, 11)[::-1]
        elif scale == '+/-20/1':
            self.scales = np.linspace(.80, 1.2, 21)[::-1]
        elif scale == '+/-20/5':
            self.scales = np.linspace(.80, 1.2, 9)[::-1]
        else:
            self.scales = [1]

    def get_template_coords(self, source, template):
        if self.use_grayscale_edges:
            tm_template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            tm_template = cv2.Canny(tm_template, 50, 200)
            tm_source = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
            tm_source = cv2.Canny(tm_source, 50, 200)
        else:
            tm_template = template
            tm_source = source

        found = (0, (-1, -1), 0)
        for scale in self.scales:
            resized = imutils.resize(tm_source, width=int(tm_source.shape[1] * scale))
            res = cv2.matchTemplate(resized, tm_template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val > found[0]:
                found = (max_val, max_loc, scale)
        print('max val {} is at scale {}'.format(found[0], found[2]))
        if found[0] > self.template_match_percent:
            template_top_left = found[1]
            found_scale = found[2]
            scaled_match_upper_left = (int(template_top_left[0] / found_scale), int(template_top_left[1] / found_scale))
            return (scaled_match_upper_left, found_scale)
        return False

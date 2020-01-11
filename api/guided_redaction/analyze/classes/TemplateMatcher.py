import cv2
import imutils
import numpy as np


class TemplateMatcher:
    debug = False
    use_grayscale_edges = False
#    use_histogram_match = True

    def __init__(self, template_data):
        self.template_match_percent = 0.9
        try:
            mp_in = template_data.get('match_percent')
            if mp_in.find('.') == -1:
                mp_in /= 100
            mp = float(mp_in)
            self.template_match_percent = mp
        except:
            pass

#        self.histogram_match_percent = 0.7
#        try:
#            hp_in = float(template_data.get('histogram_percent'))
#            if hp_in.find('.') == -1:
#                hp_in /= 100
#            hp = float(hp_in)
#            self.histogram_match_percent = hp
#        except:
#            pass
#
        scale = template_data.get('scale', '1:1')
        if scale == '+/-25/1':
            self.scales = np.linspace(.75, 1.25, 51)[::-1]
        elif scale == '+/-25/5':
            self.scales = np.linspace(.75, 1.25, 11)[::-1]
        elif scale == '+/40/5':
            self.scales = np.linspace(.60, 1.40, 81)[::-1]
        elif scale == '+/-10/1':
            self.scales = np.linspace(.90, 1.1, 11)[::-1]
        elif scale == '+/-20/1':
            self.scales = np.linspace(.80, 1.2, 21)[::-1]
        else:
            self.scales = [1]
        print('template matching scales are ')
        print(self.scales)

#    def histograms_match(self, template, the_source, template_top_left):
#        template_height, template_width, _ = template.shape
#
#        template_copy = template.copy()
#        template_copy = cv2.cvtColor(template_copy, cv2.COLOR_BGR2GRAY)
#        cropped_source = the_source[
#            template_top_left[1] : template_top_left[1] + template_height,
#            template_top_left[0] : template_top_left[0] + template_width,
#        ]
#        cropped_source = cv2.cvtColor(cropped_source, cv2.COLOR_BGR2GRAY)
#
#        template_hist = cv2.calcHist([template_copy], [0], None, [256], [0, 256])
#        source_hist = cv2.calcHist([cropped_source], [0], None, [256], [0, 256])
#
#        res = cv2.compareHist(template_hist, source_hist, cv2.HISTCMP_CORREL)
#        print("histograms compare at "+ str(res))
#        if res > self.histogram_match_percent:
#            return True
#        return False
#
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
        print('  max val {} is at scale {}'.format(found[0], found[2]))
        if found[0] > self.template_match_percent:
            template_top_left = found[1]
            found_scale = found[2]
            scaled_match_upper_left = (int(template_top_left[0] / found_scale), int(template_top_left[1] / found_scale))
            print("high confidence on a positive match")
            # TODO RETURN SCALE AND COORDS, so maybe the bottom right too?
            return (scaled_match_upper_left, found_scale)
        print('no match')
        return False



#        res = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
#        _, max_val, _, max_loc = cv2.minMaxLoc(res)
#        template_top_left = max_loc
#        if max_val > self.template_match_percent:
#            print("high confidence on a positive match")
#            return template_top_left
#        print('no match')
#        return False
#        if self.use_histogram_match:
#            if not self.histograms_match(template, source, template_top_left):
#                print("no match found")
#                return False
#        return template_top_left

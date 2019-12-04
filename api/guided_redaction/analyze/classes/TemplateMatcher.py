import cv2
import logging


class TemplateMatcher:
    debug = False

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def histograms_match(self, template, the_source, template_top_left):
        template_height, template_width, _ = template.shape

        template_copy = template.copy()
        template_copy = cv2.cvtColor(template_copy, cv2.COLOR_BGR2GRAY)
        cropped_source = the_source[
            template_top_left[1] : template_top_left[1] + template_height,
            template_top_left[0] : template_top_left[0] + template_width,
        ]
        cropped_source = cv2.cvtColor(cropped_source, cv2.COLOR_BGR2GRAY)

        template_hist = cv2.calcHist([template_copy], [0], None, [256], [0, 256])
        source_hist = cv2.calcHist([cropped_source], [0], None, [256], [0, 256])

        res = cv2.compareHist(template_hist, source_hist, cv2.HISTCMP_CORREL)
        self.logger.warning("histograms compare at "+ str(res))
        if res > 0.7:
            return True
        return False

    def get_template_coords(self, source, template):
        res = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        template_top_left = max_loc
        if max_val > 0.9:
            self.logger.warning("high confidence on primary matching, secondary matching bypassed")
            return template_top_left
        if not self.histograms_match(template, source, template_top_left):
            self.logger.warning("no match found")
            return False
        return template_top_left

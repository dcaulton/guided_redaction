import cv2
import numpy as np

class ExtentsFinder():
    debug = False

    def __init__(self):
        pass

    def determine_flood_fill_area(self, the_image, fill_center, tolerance=5):
#        template_height, template_width, _ = template.shape
#
#        template_copy = template.copy()
#        template_copy = cv2.cvtColor(template_copy, cv2.COLOR_BGR2GRAY)
#        cropped_source = the_source[template_top_left[1]:template_top_left[1]+template_height,
#                   template_top_left[0]:template_top_left[0]+template_width]
#        cropped_source = cv2.cvtColor(cropped_source, cv2.COLOR_BGR2GRAY)
#        
#        template_hist = cv2.calcHist([template_copy], [0], None, [256], [0, 256])
#        source_hist = cv2.calcHist([cropped_source], [0], None, [256], [0, 256])
#
#        res = cv2.compareHist(template_hist, source_hist, cv2.HISTCMP_CORREL)
#        print('histograms compare at ', res)
#        if res > .7:
#            return True
#        return False
        return ['alligator soup', 'egg lemon soup']

    def determine_arrow_fill_area(self, image, fill_center, tolerance=5):
        x = fill_center[0]
        y = fill_center[1]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        img_height = gray.shape[0]
        img_width = gray.shape[1]
        target_color = gray[y, x]
        row = gray[y:y, x:img_width]
        mask = row < target_color
#        import pdb; pdb.set_trace()
        return mask
#        return ['vichysois', 'ratatouille']

    def get_template_coords(self, source, template):
        res = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        template_top_left = max_loc
        if max_val > .9:
            print('high confidence on primary matching, secondary matching bypassed')
            return template_top_left
        if not self.histograms_match(template, source, template_top_left):
            print('no match found')
            return False
        return template_top_left

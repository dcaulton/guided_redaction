import cv2
from classes.EastPlusTessScanner import EastPlusTessScanner
import utils

class EastPlusTessGuidedAnalyzer(EastPlusTessScanner):

    def __init__(self, args):
        super().__init__(args)

    def analyze_text(self, image, region_of_interest, input_filename):
        detected_text_areas = self.get_text_areas_from_east(image)
        detected_text_areas = self.discard_unneeded_areas(region_of_interest, detected_text_areas)
        detected_contours = self.grow_selections_and_get_contours(image, detected_text_areas, input_filename)
        recognized_text_areas =  self.do_tess_on_contours(image, detected_contours, input_filename)
        return recognized_text_areas

    def discard_unneeded_areas(self, region_of_interest, areas):
        new_areas = []
        for area in areas:
            if utils.point_is_in_box(area[0], region_of_interest[0], region_of_interest[1]) and \
                    utils.point_is_in_box(area[1], region_of_interest[0], region_of_interest[1]):
                new_areas.append(area)
        return new_areas

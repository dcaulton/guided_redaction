import cv2
from analyze.classes.EastPlusTessScanner import EastPlusTessScanner

class EastPlusTessGuidedAnalyzer(EastPlusTessScanner):

    def __init__(self):
        pass

    def analyze_text(self, image, region_of_interest):
        detected_text_areas = self.get_text_areas_from_east(image)
        detected_text_areas = self.discard_unneeded_areas(region_of_interest, detected_text_areas)
        detected_contours = self.grow_selections_and_get_contours(image, detected_text_areas)
        recognized_text_areas =  self.do_tess_on_contours(image, detected_contours)
        return recognized_text_areas

    def discard_unneeded_areas(self, region_of_interest, areas):
        new_areas = []
        for area in areas:
            if self.point_is_in_box(area[0], region_of_interest[0], region_of_interest[1]) and \
                    self.point_is_in_box(area[1], region_of_interest[0], region_of_interest[1]):
                new_areas.append(area)
        return new_areas

    def point_is_in_box(self, point, box_start, box_end):
        if box_start[0] <= point[0] <= box_end[0]:
            if box_start[1] <= point[1] <= box_end[1]:
                return True  

import cv2
import imutils
import numpy as np


class EntityFinder:

    def __init__(self, cv2_image, entity_finder_meta, template_matcher, extents_finder):
        if 'debug' in entity_finder_meta:
            self.debug = entity_finder_meta['debug']
        else:
            self.debug = True
        self.cv2_image = cv2_image
        self.entity_finder_meta = entity_finder_meta
        self.template_matcher = template_matcher
        self.extents_finder = extents_finder

    def find_entities(self):
        print('chonker is looking for entities')
        if self.template_matcher:
            for anchor in self.template_matcher.get_anchors():
                match_image = self.template_matcher.get_match_image_for_anchor(anchor)
                match_obj = self.template_matcher.get_template_coords(
                    self.cv2_image, match_image
                )
                if match_obj['match_found']:
                    (temp_coords, temp_scale) = match_obj['match_coords']
                    print('found a match for {} at {}'.format(anchor['id'], temp_coords))


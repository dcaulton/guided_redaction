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
        print('finding entities BABY')
        pass

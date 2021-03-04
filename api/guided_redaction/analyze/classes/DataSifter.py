import cv2
import random
import math
import imutils
import numpy as np


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = False
        self.template_match_threshold = .9
        self.match_origin_xy_tolerance = 5

    def sift_data(self, cv2_image):
        return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')
        one_zone = {
            'id': 'whatevs', 
            'location': (100, 115), 
            'size': (288, 45),
            'scale': 1,
            'scanner_type': 'data_sifter',
        }
        one_stat = {
            'id': 'whatevs', 
            'match_percent': 97.3,
            'text': 'Bobble Head'
        }
        all_zones = {}
        all_zones[one_zone['id']] = one_zone
        return_stats[one_stat['id']] = one_stat
        return all_zones, return_stats, return_mask

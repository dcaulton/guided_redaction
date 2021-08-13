import cv2
import imutils
import numpy as np


class FeatureFinder:

    def find_features(self, cv2_image, feature_type):
        orb = cv2.ORB_create()
        # find the keypoints with ORB
        kp = orb.detect(cv2_image, None)
        # compute the descriptors with ORB
        kp, des = orb.compute(cv2_image, kp)
        # draw only keypoints location,not size and orientation
        cv2_image_with_keypoints= cv2.drawKeypoints(cv2_image, kp, None, color=(0,255,0), flags=0)

        return kp, des, cv2_image_with_keypoints


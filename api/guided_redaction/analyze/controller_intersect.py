import cv2 
import imutils
from django.conf import settings
import numpy as np
import requests
import json
import random

from guided_redaction.jobs.models import Job


class IntersectController():

    def __init__(self):
        self.debug = True
        self.build_masks = {}

    def intersect_jobs(self, request_data):
        response_movies = {}
        statistics = {'movies': {}}

        job_ids = request_data.get('job_ids')
        first_job = Job.objects.get(pk=job_ids[0])
        first_resp = json.loads(first_job.response_data)

        if 'movies' in first_resp:
            for movie_url in first_resp['movies']:
                movie = first_resp['movies'][movie_url]
                if 'framesets' in movie:
                    for frameset_hash in movie['framesets']:
                        this_frames_mask = self.make_mask(movie['framesets'][frameset_hash])
                        if movie_url not in self.build_masks:
                            self.build_masks[movie_url] = {'framesets': {}}
                        if frameset_hash not in self.build_masks[movie_url]['framesets']:
                            self.build_masks[movie_url]['framesets'][frameset_hash] = this_frames_mask
        for job_index in range(1, len(job_ids)):
            job_id = job_ids[job_index]
            job = Job.objects.get(pk=job_id)
            job_resp = json.loads(job.response_data)
            self.remove_masks_not_in_this_data(job_resp)
            if 'movies' in job_resp:
                for movie_url in job_resp['movies']:
                    movie = job_resp['movies'][movie_url]
                    if 'framesets' in movie:
                        for frameset_hash in movie['framesets']:
                            this_frames_mask = self.make_mask(movie['framesets'][frameset_hash])
                            cur_mask = self.build_masks[movie_url]['framesets'][frameset_hash]
                            new_mask = cv2.bitwise_and(this_frames_mask, cur_mask)
                            self.build_masks[movie_url]['framesets'][frameset_hash] = new_mask

        for movie_url in self.build_masks:
            for frameset_hash in self.build_masks[movie_url]['framesets']:
                mask = self.build_masks[movie_url]['framesets'][frameset_hash]
                cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cnts = imutils.grab_contours(cnts)
                for contour in cnts:
                    (box_x, box_y, box_w, box_h) = cv2.boundingRect(contour)   
                    if movie_url not in response_movies:
                        response_movies[movie_url] = {'framesets': {}}
                    if frameset_hash not in response_movies[movie_url]['framesets']:
                        response_movies[movie_url]['framesets'][frameset_hash] = {}
                    the_id = 'intersect_' + str(random.randint(1, 999999999))
                    build_obj = {
                        'scanner_type': 'intersect',
                        'id': the_id,
                        'scale': 1,
                        'location': (box_x, box_y),
                        'size': (box_w, box_h),
                    }
                    response_movies[movie_url]['framesets'][frameset_hash][the_id] = build_obj
        return {
            'movies': response_movies, 
            'statistics': statistics,
        }

    def remove_masks_not_in_this_data(self, response_data):
        if 'movies' not in response_data:
            self.build_masks = {}
        resp_movies = response_data['movies']
        for movie_url in self.build_masks:
            if movie_url not in response_data['movies']:
                del self.build_masks[movie_url]
            else:
                for frameset_hash in self.build_masks[movie_url]['framesets']:
                    if frameset_hash not in response_data['movies'][movie_url]['framesets']:
                        del self.build_masks[movie_url]['framesets'][frameset_hash]

    def make_mask(self, frameset_data):
        mask = np.zeros((2000, 4000, 1), np.uint8)
        for match_key in frameset_data:
            match_object = frameset_data[match_key]
            if 'location' in match_object:
                start = match_object['location']
                end = [
                    start[0] + match_object['size'][0],
                    start[1] + match_object['size'][1]
                ]
            if 'start' in match_object:
                start = match_object['start']
                end = match_object['end']
            cv2.rectangle(
                mask,
                tuple(start),
                tuple(end),
                255,
                -1
            )
        return mask


import json
import os
import uuid
import numpy as np
import cv2
import imutils
from django.conf import settings
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.analyze.controller_t1 import T1Controller
from guided_redaction.utils.classes.FileWriter import FileWriter


class ScoreBaseController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.file_storage_dir_uuid = str(uuid.uuid4())

    def add_job_and_jeo_to_jrs(self, request_data, jrs):
        job_id = request_data.get('job_id')
        if not Job.objects.filter(id=job_id).exists():
            return {'errors': ['job not found for specified id']}
        jrs.job = Job.objects.get(pk=job_id)

        jeo_id = request_data.get('job_eval_objective_id')
        if not JobEvalObjective.objects.filter(id=jeo_id).exists():
            return {'errors': ['job eval objective not found for specified id']}
        jrs.job_eval_objective = JobEvalObjective.objects.get(pk=jeo_id)

    def build_source_movies(self, job):
        build_source_movies = {}
        req_data = json.loads(job.request_data)
        if 'movies' in req_data:
            if 'source' in req_data['movies']:
                build_source_movies = req_data['movies']['source']
            else:
                for movie_url in req_data['movies']:
                    movie = req_data['movies'][movie_url]
                    if 'frames' in movie and len(movie['frames']) > 0:
                        build_source_movies[movie_url] = movie

        return build_source_movies 

    def draw_job_matches(self, job_frameset_data, frame_dimensions):
        job_matches_img = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
        for match_obj_key in job_frameset_data:
            match_obj = job_frameset_data[match_obj_key]
            if 'start' in match_obj:
                start = match_obj['start']
                end = match_obj['end']
            if 'location' in match_obj:
                start = match_obj['location']
                end = [
                    match_obj['location'][0] + match_obj['size'][0],
                    match_obj['location'][1] + match_obj['size'][1]
                ]
            if start:
                desired_color = 255
                if match_obj.get('positive_or_negative', 'positive') == 'negative':
                    desired_color = 0
                cv2.rectangle(
                    job_matches_img,
                    tuple(start),
                    tuple(end),
                    desired_color,
                    -1
                )
        return job_matches_img

    def draw_and_save_found_image(self, job_frameset_data, frame_dimensions, fsh_prefix, image_type='t_pos'):
        img = self.draw_job_matches(job_frameset_data, frame_dimensions)

        file_name = image_type + '_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        )
        url = self.file_writer.write_cv2_image_to_filepath(img, fullpath)
        return url, img

    def save_supplied_image(self, img, fsh_prefix, image_type='t_pos'):
        file_name = image_type + '_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(img, fullpath)
        return url

    def get_missed_item_count(self, tpos_image, fneg_image):
        missed_zones = 0
        desired_cnts = cv2.findContours(tpos_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        desired_cnts = imutils.grab_contours(desired_cnts)
        for desired_cnt in desired_cnts:
            x,y,w,h = cv2.boundingRect(desired_cnt)
            desired_start = (x, y)
            desired_end = (x+w, y+h)
            start_val = fneg_image[desired_start[1], desired_start[0]]
            end_val = fneg_image[desired_end[1]-1, desired_end[0]-1]
            if start_val == 255 and end_val == 255: # this contour was missed
                missed_zones += 1
        return missed_zones

    def build_counts_from_images(self, tpos_image, fpos_image, fneg_image, frame_dimensions):
        total_pixels = int(frame_dimensions[0] * frame_dimensions[1])
        num_tpos = np.count_nonzero(tpos_image)
        num_tneg = total_pixels - num_tpos
        num_fpos = np.count_nonzero(fpos_image)
        num_fneg = np.count_nonzero(fneg_image)

        missed_item_count = self.get_missed_item_count(tpos_image, fneg_image)
        counts = {
            't_pos': num_tpos,
            't_neg': num_tneg,
            'f_pos': num_fpos,
            'f_neg': num_fneg,
            'missed_item_count': missed_item_count,
        }
        return counts

    def draw_and_save_fall_image(self, fpos_image, fneg_image, fsh_prefix):
        fall_image = cv2.bitwise_or(fpos_image, fneg_image)
        file_name = 'f_all_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(fall_image, fullpath)
        return url, fall_image

    def calc_movie_stats(self, movie_counts_maps, job_eval_objective):
        build_stats = {
            'framesets': {},
        }
        total_t_pos = 0
        total_t_neg = 0
        total_f_pos = 0
        total_f_neg = 0
        failed_frames_count = 0
        jeo_content = json.loads(job_eval_objective.content)
        f_pos_weight = float(jeo_content['weight_false_pos'])
        f_neg_weight = float(jeo_content['weight_false_neg'])
        movie_pass_or_fail = 'pass'
        movie_low_score = 100
        movie_high_score = 0
        score_accum = 0
        for frameset_hash in movie_counts_maps['framesets']:
            frameset_pass_or_fail = 'pass'
            fs_counts = movie_counts_maps['framesets'][frameset_hash]['counts']
            t_pos = fs_counts['t_pos']
            t_neg = fs_counts['t_neg']
            f_pos = fs_counts['f_pos']
            f_neg = fs_counts['f_neg']
            missed_item_count = fs_counts['missed_item_count']
            total_t_pos += t_pos
            total_t_neg += t_neg
            total_f_pos += f_pos
            total_f_neg += f_neg
            tot = t_pos + t_neg
            count_score = 100 - 100*(f_pos_weight * (f_pos/tot)) - 100*(f_neg_weight * (f_neg/tot))
            count_score = max(count_score, 0)
            count_score = round(count_score, 2)
            score_accum += count_score

            if count_score < jeo_content['frame_passing_score']:
                frameset_pass_or_fail = 'fail'
            elif missed_item_count > jeo_content['max_num_missed_entities_single_frameset']:
                frameset_pass_or_fail = 'fail'

            if frameset_pass_or_fail == 'fail':
                failed_frames_count += 1
                if jeo_content['hard_fail_from_any_frame']:
                    movie_pass_or_fail = 'fail'
                if failed_frames_count >= jeo_content['max_num_failed_frames']:
                    movie_pass_or_fail = 'fail'

            if count_score < movie_low_score:
                movie_low_score = count_score
            if count_score > movie_high_score:
                movie_high_score = count_score
                
            build_stats['framesets'][frameset_hash] = {
                'score': count_score,
                'pass_or_fail': frameset_pass_or_fail,
            }

        num_framesets = len(movie_counts_maps['framesets'])
        build_stats['min_frameset_score'] = movie_low_score
        build_stats['max_frameset_score'] = movie_high_score
        movie_score = score_accum / num_framesets
        movie_score = round(movie_score, 2)
        if movie_score < jeo_content['movie_passing_score']:
            movie_pass_or_fail = 'fail'
        build_stats['score'] = movie_score
        build_stats['pass_or_fail'] = movie_pass_or_fail
        
        return build_stats

    def score_frameset_autopass(self, job_frameset_data, frame_dimensions, fsh_prefix):
        counts = {}
        maps = {}

        tpos_url, found_img = self.draw_and_save_found_image(job_frameset_data, frame_dimensions, fsh_prefix, 't_pos')
        maps['t_pos'] = tpos_url

        total_pixels = int(frame_dimensions[0] * frame_dimensions[1])
        num_tpos = np.count_nonzero(found_img)
        num_tneg = total_pixels - num_tpos
        num_fpos = 0
        num_fneg = 0

        counts = {
            't_pos': num_tpos,
            't_neg': num_tneg,
            'f_pos': num_fpos,
            'f_neg': num_fneg,
            'missed_item_count': 0,
        }

        return counts, maps

    def build_job_stats(self, build_stats, wall_clock_run_time=''):
        job_min_score = 100
        job_max_score = 0
        job_score_accum = 0
        job_pass_or_fail = 'pass'
        for movie_url in build_stats['movie_statistics']:
            movie_score = build_stats['movie_statistics'][movie_url]['score']
            job_score_accum += movie_score
            if build_stats['movie_statistics'][movie_url]['pass_or_fail'] == 'fail':
                job_pass_or_fail = 'fail'
            movie_score = build_stats['movie_statistics'][movie_url]['score']
            if movie_score < job_min_score:
                job_min_score = movie_score
            if movie_score > job_max_score:
                job_max_score = movie_score
        job_score = job_score_accum / len(build_stats['movie_statistics'])
        job_score = round(job_score, 2)
        build_stats['min_score'] = job_min_score
        build_stats['max_score'] = job_max_score
        build_stats['score'] =  job_score
        build_stats['pass_or_fail'] = job_pass_or_fail
        if wall_clock_run_time:
            build_stats['wall_clock_run_time'] = wall_clock_run_time



# RETURN DATA STRUCTURE:
#        build_movies = {
#            'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/b147d17b-8d9d-4f48-9464-7c85ffefddec.mp4': {
#                'notes':  [
#                    'looks like it is mising the end of the last name field for hyphenated names'
#                ],
#                'framesets':  {
#                    '13857090227856375814': {
#                        'order': 3, # used to order framesets 
#                        'counts': {
#                            't_pos': 3986,
#                            't_neg': 29700,
#                            'f_pos': 495,
#                            'f_neg': 1112,
#                            'missed_item_count': 0,
#                        },
#                        'maps': {
#                            'f_pos': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075a.png',
#                            'f_neg': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075b.png',
#                            'f_all': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075c.png',
#                            't_pos': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075d.png'
#                        },
#                        'has_job_data': true,
#                        'was_reviewed': true,  # only for manual scorings
#                        'has_perm_standard_data': true, # only for automatic scorings
#                    },
#                },
#            },
#        }
#        build_stats = {
#            'max_score': 100,
#            'min_score': 64,
#            'pass_or_fail': 'pass',
#            'movie_statistics': {
#                'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/b147d17b-8d9d-4f48-9464-7c85ffefddec.mp4': {
#                    'max_frameset_score': 100,
#                    'min_frameset_score': 65,
#                    'score': 96.4,
#                    'pass_or_fail': 'pass',
#                    'framesets': {
#                        '13857090227856375814': {
#                            'score': 87.5,
#                        }
#                    }
#                }
#            }
#        }

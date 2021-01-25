import json
import os
import uuid
import numpy as np
import cv2
from django.conf import settings
from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job
from guided_redaction.job_eval_objectives.models import JobEvalObjective
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.analyze.controller_t1 import T1Controller
from guided_redaction.utils.classes.FileWriter import FileWriter


class ScoreManualController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.file_storage_dir_uuid = str(uuid.uuid4())


    def score_job_run_summary(self, request_data):
        jrs = JobRunSummary()

        self.file_writer.create_unique_directory(self.file_storage_dir_uuid)

        job_id = request_data.get('job_id')
        if not Job.objects.filter(id=job_id).exists():
            return {'errors': ['job not found for specified id']}
        jrs.job = Job.objects.get(pk=job_id)

        jeo_id = request_data.get('job_eval_objective_id')
        if not JobEvalObjective.objects.filter(id=jeo_id).exists():
            return {'errors': ['job eval objective not found for specified id']}
        jrs.job_eval_objective = JobEvalObjective.objects.get(pk=jeo_id)

        jrs_movies = request_data.get('jrs_movies')

        build_source_movies = self.build_source_movies(jrs.job)
        build_movies, build_stats = self.build_movies_and_stats(jrs.job, jrs.job_eval_objective, jrs_movies)

        content_object = {
            'movies': build_movies,
            'source_movies': build_source_movies,
            'statistics': build_stats,
        }
        jrs.summary_type = 'manual'
        jrs.score = 95.2
        jrs.content = json.dumps(content_object)
        jrs.save()

        for movie_url in build_movies: 
            (_, movie_name) = os.path.split(movie_url)
            attribute = Attribute(
                name='jrs_movie_name',
                value=movie_name,
                job_run_summary=jrs,
            )
            attribute.save()

        return jrs

    def draw_job_matches(self, job_frameset_data, frame_dimensions):
        tpos_img = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
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
                cv2.rectangle(
                    tpos_img,
                    tuple(start),
                    tuple(end),
                    255,
                    -1
                )
        return tpos_img
      
    def score_frameset_autopass(self, job_frameset_data, frame_dimensions,fsh_prefix):
        counts = {}
        maps = {}

        tpos_url = self.draw_and_save_tpos_image(job_frameset_data, frame_dimensions, fsh_prefix)
        maps['t_pos'] = tpos_url

        return counts, maps

    def score_frameset(self, job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix):
        counts = {}
        maps = {}

        tpos_url = self.draw_and_save_tpos_image(job_frameset_data, frame_dimensions, fsh_prefix)
        fneg_url = self.draw_and_save_fneg_image(job_frameset_data, frame_dimensions, fsh_prefix)
        fpos_url = self.draw_and_save_fneg_image(job_frameset_data, frame_dimensions, fsh_prefix)
        fall_url = self.draw_and_save_fneg_image(job_frameset_data, frame_dimensions, fsh_prefix)
        maps = {
            't_pos': tpos_url,
            'f_pos': fpos_url,
            'f_neg': fneg_url,
            'f_all': fall_url,
        }

        return counts, maps

    def draw_and_save_fpos_image(self, job_frameset_data, frame_dimensions, fsh_prefix):
        img = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
        cv2.rectangle(
            img,
            (10, 10),
            (30, 300),
            255,
            -1
        )
        file_name = 'f_pos_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(img, fullpath)
        return url

    def draw_and_save_fneg_image(self, job_frameset_data, frame_dimensions, fsh_prefix):
        img = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
        cv2.rectangle(
            img,
            (410, 10),
            (430, 300),
            255,
            -1
        )
        file_name = 'f_neg_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(img, fullpath)
        return url

    def draw_and_save_fall_image(self, job_frameset_data, frame_dimensions, fsh_prefix):
        img = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
        cv2.rectangle(
            img,
            (510, 10),
            (530, 300),
            255,
            -1
        )
        file_name = 'f_all_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(self, img, fullpath)
        return url

    def draw_and_save_tpos_image(self, job_frameset_data, frame_dimensions, fsh_prefix):
        img = self.draw_job_matches(job_frameset_data, frame_dimensions)

        file_name = 't_pos_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(img, fullpath)
        return url

    def build_movies_and_stats(self, job, job_eval_objective, jrs_movies):
        build_movies = {}
        build_stats = {
            'max_score': 0,
            'min_score': 0,
            'pass_or_fail': 'pass',
            'movie_statistics': {}
        }
        req_data = json.loads(job.request_data)
        job_resp_data = json.loads(job.response_data)
        source_movies = {}
        if 'source' in req_data['movies']:
            source_movies = req_data['movies']['source']
            del req_data['movies']['source']
        else:
            source_movies = req_data['movies']
        if 'movies' in job_resp_data:
            for movie_url in job_resp_data['movies']:
                job_movie_data = job_resp_data['movies'][movie_url]
                jrs_movie_data = jrs_movies[movie_url]
                build_movies[movie_url] = {
                    'framesets': {},
                }
                frame_dimensions = ()
                (_, file_name) = os.path.split(movie_url)
                (movie_uuid, file_type) = file_name.split('.')
                if movie_url in source_movies and 'frame_dimensions' in source_movies[movie_url]:
                    frame_dimensions = source_movies[movie_url]['frame_dimensions']
                if not frame_dimensions: 
                    continue
                for frameset_hash in job_movie_data['framesets']:
                    fsh_prefix = movie_uuid + '_' + frameset_hash
                    job_frameset_data = job_movie_data['framesets'][frameset_hash]
                    if frameset_hash in jrs_movie_data['framesets']:
                        jrs_frameset_data = jrs_movie_data['framesets'][frameset_hash]
                        print('scoring frameset '+frameset_hash)
                        fs_counts, fs_maps = self.score_frameset(job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix)
                    else:
                        fs_counts, fs_maps = self.score_frameset_autopass(job_frameset_data, frame_dimensions, fsh_prefix)
                    build_movies[movie_url]['framesets'][frameset_hash] = {
                        'counts': fs_counts,
                        'maps': fs_maps,
                    }

                        
#        build_movies = {
#            'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/b147d17b-8d9d-4f48-9464-7c85ffefddec.mp4': {
#                'notes':  [
#                    'looks like it is mising the end of the last name field for hyphenated names'
#                ],
#                'framesets':  {
#                    '13857090227856375814': {
#                        'counts': {
#                            't_pos': 3986,
#                            't_neg': 29700,
#                            'f_pos': 495,
#                            'f_neg': 1112,
#                            'missed_items': 0,
#                            'miscaptured_items': 0,
#                        },
#                        'maps': {
#                            'f_pos': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075a.png',
#                            'f_neg': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075b.png',
#                            'f_all': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075c.png',
#                            't_pos': 'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/frame_00075d.png'
#                        },
#                    },
#                },
#            },
#        }
        build_stats = {
            'max_score': 100,
            'min_score': 64,
            'pass_or_fail': 'pass',
            'movie_statistics': {
                'http://localhost:8080/2cc72cbe-b909-484f-ac0e-48a48bd0d0f4/b147d17b-8d9d-4f48-9464-7c85ffefddec.mp4': {
                    'max_score': 100,
                    'min_score': 65,
                    'pass_or_fail': 'pass',
                }
            }
        }
        return build_movies, build_stats

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

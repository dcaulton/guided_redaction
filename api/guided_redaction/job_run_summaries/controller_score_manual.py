import json
import os
import uuid
import cv2
import imutils
from guided_redaction.attributes.models import Attribute
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.job_run_summaries.controller_score_base import ScoreBaseController


class ScoreManualController(ScoreBaseController):

    def score_job_run_summary(self, request_data):
        jrs = JobRunSummary()

        ret_val = self.add_job_and_jeo_to_jrs(request_data, jrs)
        if ret_val: return ret_val

        self.file_writer.create_unique_directory(self.file_storage_dir_uuid)

        job_notes = request_data.get('job_comment')

        jrs_movies = request_data.get('jrs_movies')

        build_source_movies = self.build_source_movies(jrs.job)
        build_movies, build_stats = self.build_movies_and_stats(jrs.job, jrs.job_eval_objective, jrs_movies)

        content_object = {
            'movies': build_movies,
            'source_movies': build_source_movies,
            'statistics': build_stats,
        }
        if job_notes: 
            content_object['job_notes'] = job_notes

        jrs.summary_type = 'manual'
        jrs.score = build_stats['score']
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

    def score_frameset_manual_fail(self, job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix):
        fpos_url, fpos_image = self.draw_and_save_found_image(job_frameset_data, frame_dimensions, fsh_prefix, 'f_pos')
        tpos_image = cv2.bitwise_not(fpos_image)
        tpos_url = self.save_supplied_image(tpos_image, fsh_prefix, 't_pos')
        fneg_image = tpos_image
        fneg_url = self.save_supplied_image(fneg_image, fsh_prefix, 'f_neg')
        fall_image = np.ones((frame_dimensions[1], frame_dimensions[0], 1), np.uint8) * 255
        fall_url = self.save_supplied_image(fall_image, fsh_prefix, 'f_all')
        maps = {
            't_pos': tpos_url,
            'f_pos': fpos_url,
            'f_neg': fneg_url,
            'f_all': fall_url,
        }

        counts = self.build_counts_from_images(tpos_image, fpos_image, fneg_image, frame_dimensions)
        return counts, maps

    def score_frameset_manual_pass(self, job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix):
        tpos_url, tpos_image = self.draw_and_save_found_image(job_frameset_data, frame_dimensions, fsh_prefix, 't_pos')
        blank_image = np.zeros((frame_dimensions[1], frame_dimensions[0], 1), np.uint8)
        fpos_image = blank_image
        fneg_image = blank_image
        fall_image = blank_image
        fpos_url = self.save_supplied_image(fpos_image, fsh_prefix, 'f_pos')
        fneg_url = self.save_supplied_image(fneg_image, fsh_prefix, 'f_neg')
        fall_url = self.save_supplied_image(fall_image, fsh_prefix, 'f_all')
        maps = {
            't_pos': tpos_url,
            'f_pos': fpos_url,
            'f_neg': fneg_url,
            'f_all': fall_url,
        }

        counts = self.build_counts_from_images(tpos_image, fpos_image, fneg_image, frame_dimensions)
        return counts, maps

    def score_frameset(self, frameset_hash, job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix):
        if 'pass_or_fail' in jrs_frameset_data and jrs_frameset_data['pass_or_fail'] == 'pass':
            return self.score_frameset_manual_pass(job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix)
        if 'pass_or_fail' in jrs_frameset_data and jrs_frameset_data['pass_or_fail'] == 'fail':
            return self.score_frameset_manual_fail(job_frameset_data, jrs_frameset_data, frame_dimensions, fsh_prefix)

        found_image = self.draw_job_matches(job_frameset_data, frame_dimensions)
        not_found_image = cv2.bitwise_not(found_image)
        tpos_url, tpos_image = self.draw_and_save_tpos_image(found_image, jrs_frameset_data, fsh_prefix)
        not_tpos_image = cv2.bitwise_not(tpos_image)

        fpos_url, fpos_image = self.draw_and_save_fpos_image(found_image, not_tpos_image, fsh_prefix)

        fneg_url, fneg_image = self.draw_and_save_fneg_image(not_found_image, tpos_image, fsh_prefix)

        fall_url, fall_image = self.draw_and_save_fall_image(fpos_image, fneg_image, fsh_prefix)
        maps = {
            't_pos': tpos_url,
            'f_pos': fpos_url,
            'f_neg': fneg_url,
            'f_all': fall_url,
        }

        counts = self.build_counts_from_images(tpos_image, fpos_image, fneg_image, frame_dimensions)

        return counts, maps

    def draw_and_save_tpos_image(self, found_image, jrs_frameset_data, fsh_prefix):
        tpos_image = found_image.copy()
        if 'desired' in jrs_frameset_data:
            for match_id in jrs_frameset_data['desired']:
                match_rec = jrs_frameset_data['desired'][match_id]
                start = match_rec['start']
                end = match_rec['end']
                cv2.rectangle(
                    tpos_image,
                    tuple(start),
                    tuple(end),
                    255,
                    -1
                )
        if 'unwanted' in jrs_frameset_data:
            for match_id in jrs_frameset_data['unwanted']:
                match_rec = jrs_frameset_data['unwanted'][match_id]
                start = match_rec['start']
                end = match_rec['end']
                cv2.rectangle(
                    tpos_image,
                    tuple(start),
                    tuple(end),
                    0,
                    -1
                )
        file_name = 't_pos_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(tpos_image, fullpath)
        return url, tpos_image

    def draw_and_save_fpos_image(self, found_image, not_tpos_image, fsh_prefix):
        fpos_image = cv2.bitwise_and(found_image, not_tpos_image)
        file_name = 'f_pos_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(fpos_image, fullpath)
        return url, fpos_image

    def draw_and_save_fneg_image(self, not_found_image, tpos_image, fsh_prefix):
        fneg_image = cv2.bitwise_and(not_found_image, tpos_image)
        file_name = 'f_neg_' + fsh_prefix + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.file_storage_dir_uuid,
            file_name
        ) 
        url = self.file_writer.write_cv2_image_to_filepath(fneg_image, fullpath)
        return url, fneg_image

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
                print('building manualmanual  job review summary data for movie {}'.format(movie_url))
                job_movie_data = job_resp_data['movies'][movie_url]
                jrs_movie_data = {'framesets': {}}
                if movie_url in jrs_movies:
                    jrs_movie_data = jrs_movies[movie_url]
                build_movies[movie_url] = {
                    'framesets': {},
                }
                if 'comment' in jrs_movie_data and jrs_movie_data['comment']:
                    build_movies[movie_url]['comment'] = jrs_movie_data['comment']
                frame_dimensions = ()
                (_, file_name) = os.path.split(movie_url)
                (movie_uuid, file_type) = file_name.split('.')
                if movie_url in source_movies and 'frame_dimensions' in source_movies[movie_url]:
                    frame_dimensions = source_movies[movie_url]['frame_dimensions']
                if not frame_dimensions: 
                    continue
                source_movie = source_movies[movie_url]
                ordered_frameset_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])

                for index, frameset_hash in enumerate(ordered_frameset_hashes):
                    fsh_prefix = movie_uuid + '_' + frameset_hash
                    job_frameset_data = {}
                    has_job_data = False
                    was_reviewed = False
                    build_comment = ''
                    if frameset_hash in job_movie_data['framesets']:
                        job_frameset_data = job_movie_data['framesets'][frameset_hash]
                        has_job_data = True
                    if frameset_hash in jrs_movie_data['framesets']:
                        was_reviewed = True
                        jrs_frameset_data = jrs_movie_data['framesets'][frameset_hash]
                        fs_counts, fs_maps = self.score_frameset(
                            frameset_hash, 
                            job_frameset_data, 
                            jrs_frameset_data, 
                            frame_dimensions, 
                            fsh_prefix
                        )
                        if 'comment' in jrs_frameset_data and jrs_frameset_data['comment']:
                            build_comment = jrs_frameset_data['comment']
                    else:
                        fs_counts, fs_maps = self.score_frameset_autopass(job_frameset_data, frame_dimensions, fsh_prefix)
                    build_movies[movie_url]['framesets'][frameset_hash] = {
                        'order': index,
                        'counts': fs_counts,
                        'maps': fs_maps,
                        'has_job_data': has_job_data,
                        'was_reviewed': was_reviewed,
                    }
                    if build_comment:
                        build_movies[movie_url]['framesets'][frameset_hash]['comment'] = build_comment

                movie_stats = self.calc_movie_stats(build_movies[movie_url], job_eval_objective)
                build_stats['movie_statistics'][movie_url] = movie_stats

        rts = job.get_wall_clock_run_time_string()
        self.build_job_stats(build_stats, rts)

        print('manual job run summary build completed')
        return build_movies, build_stats

import json
import os
import cv2
from guided_redaction.attributes.models import Attribute
from guided_redaction.job_run_summaries.models import JobRunSummary
from guided_redaction.job_run_summaries.controller_score_base import ScoreBaseController


class GenerateController(ScoreBaseController):

    def generate_job_run_summary(self, request_data):
        jrs = JobRunSummary()

        ret_val = self.add_job_and_jeo_to_jrs(request_data, jrs)
        if ret_val: return ret_val

        self.file_writer.create_unique_directory(self.file_storage_dir_uuid)

        build_source_movies = self.build_source_movies(jrs.job)
        build_movies, build_stats = self.build_movies_and_stats(jrs.job, jrs.job_eval_objective, build_source_movies)

        content_object = {
            'movies': build_movies,
            'source_movies': build_source_movies,
            'statistics': build_stats,
        }

        jrs.summary_type = 'automatic'
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

    def build_movies_and_stats(self, job, job_eval_objective, source_movies):
        build_movies = {}
        build_stats = {
            'max_score': 0,
            'min_score': 0,
            'pass_or_fail': 'pass',
            'movie_statistics': {}
        }
        req_data = json.loads(job.request_data)
        job_resp_data = json.loads(job.response_data)
        if 'source' in req_data['movies']:
            del req_data['movies']['source']
        jeo_content = json.loads(job_eval_objective.content)
        if 'permanent_standards' in jeo_content:
            perm_standards = jeo_content['permanent_standards']

        if 'movies' in job_resp_data:
            for movie_url in job_resp_data['movies']:
                job_movie_data = job_resp_data['movies'][movie_url]
                ps_movie_data = {'framesets': {}}
                frame_dimensions = ()
                (_, file_name) = os.path.split(movie_url)
                (movie_uuid, file_type) = file_name.split('.')
                if movie_url in source_movies and 'frame_dimensions' in source_movies[movie_url]:
                    frame_dimensions = source_movies[movie_url]['frame_dimensions']
                if not frame_dimensions:
                    continue
                for annotated_movie_name in perm_standards:
                    if annotated_movie_name in movie_url:
                        ps_movie_data = perm_standards[annotated_movie_name]
                if not ps_movie_data['framesets']:
                    continue
                print('building automatic job review summary data for movie {}'.format(movie_url))
                build_movies[movie_url] = {'framesets': {}}
                source_movie = source_movies[movie_url]
                ordered_frameset_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])

                for index, frameset_hash in enumerate(ordered_frameset_hashes):
                    fsh_prefix = movie_uuid + '_' + frameset_hash
                    job_frameset_data = {}
                    has_job_data = False
                    has_ps_data = False
                    if frameset_hash in job_movie_data['framesets']:
                        job_frameset_data = job_movie_data['framesets'][frameset_hash]
                        has_job_data = True
                    if frameset_hash in ps_movie_data['framesets']:
                        was_reviewed = True
                        ps_frameset_data = ps_movie_data['framesets'][frameset_hash]
                        fs_counts, fs_maps = self.score_frameset(
                            frameset_hash,
                            job_frameset_data,
                            ps_frameset_data,
                            frame_dimensions,
                            fsh_prefix
                        )
                    else:
                        fs_counts, fs_maps = self.score_frameset_autopass(job_frameset_data, frame_dimensions, fsh_prefix)
                    build_movies[movie_url]['framesets'][frameset_hash] = {
                        'order': index,
                        'counts': fs_counts,
                        'maps': fs_maps,
                        'has_job_data': has_job_data,
                        'has_perm_standard_data': has_ps_data,
                    }

                movie_stats = self.calc_movie_stats(build_movies[movie_url], job_eval_objective)
                build_stats['movie_statistics'][movie_url] = movie_stats

        rts = job.get_wall_clock_run_time_string()
        self.build_job_stats(build_stats, rts)

        print('automatic job run summary build completed')
        return build_movies, build_stats

    def score_frameset(self, frameset_hash, job_frameset_data, ps_frameset_data, frame_dimensions, fsh_prefix):
        tpos_image = self.draw_job_matches(ps_frameset_data, frame_dimensions)
        not_tpos_image = cv2.bitwise_not(tpos_image)
        job_found_image = self.draw_job_matches(job_frameset_data, frame_dimensions)
        not_job_found_image = cv2.bitwise_not(job_found_image)
        fpos_image = cv2.bitwise_and(job_found_image, not_tpos_image)
        fneg_image = cv2.bitwise_and(not_job_found_image, tpos_image)

        tpos_url = self.save_supplied_image(tpos_image, fsh_prefix, 't_pos')
        fpos_url = self.save_supplied_image(fpos_image, fsh_prefix, 'f_pos')
        fneg_url = self.save_supplied_image(fneg_image, fsh_prefix, 'f_neg')
        fall_url, fall_image = self.draw_and_save_fall_image(fpos_image, fneg_image, fsh_prefix)

        maps = {
            't_pos': tpos_url,
            'f_pos': fpos_url,
            'f_neg': fneg_url,
            'f_all': fall_url,
        }

        counts = self.build_counts_from_images(tpos_image, fpos_image, fneg_image, frame_dimensions)

        return counts, maps

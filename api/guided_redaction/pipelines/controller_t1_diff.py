import json
from guided_redaction.jobs.models import Job


class T1DiffController:

    def __init__(self):
        pass

    def get_frameset_hash_for_frame(self, frame, framesets):
        for frameset_hash in framesets:
            if frame in framesets[frameset_hash]['images']:
                return frameset_hash

    def get_frameset_hashes_in_order(self, frames, framesets):
        ret_arr = []
        for frame in frames:
            frameset_hash = self.get_frameset_hash_for_frame(frame, framesets)
            if frameset_hash and frameset_hash not in ret_arr:
                ret_arr.append(frameset_hash)
        return ret_arr

    def build_t1_diff(self, minuend_jobs, subtrahend_job_ids):
        build_movies = {}
        for minuend_obj in minuend_jobs:
            job_id = minuend_obj['id']
            if not Job.objects.filter(id=job_id).exists():
                return self.error("invalid minuend job id: {}".format(job_id), status_code=400)
            job = Job.objects.get(pk=job_id)
            if minuend_obj['request_or_response_data'] == 'request_data':
                job_data = json.loads(job.request_data)
            else:
                job_data = json.loads(job.response_data)
            if 'movies' in job_data:
                for movie_url in job_data['movies']:
                    movie_data = job_data['movies'][movie_url]
                    if movie_url not in build_movies:
                        build_movies[movie_url] = {
                            'framesets': {},
                        }
                        if 'frames' in movie_data:
                            build_movies[movie_url]['frames'] = []
                    if 'frames' in movie_data:
                        sorted_hashes = self.get_frameset_hashes_in_order(
                            movie_data['frames'], movie_data['framesets']
                        )
                    else:
                        sorted_hashes = list(movie_data['framesets'].keys())

                    for frameset_hash in sorted_hashes:
                        frameset = movie_data['framesets'][frameset_hash]
                        for key in frameset:
                            if frameset_hash not in build_movies[movie_url]['framesets']:
                                build_movies[movie_url]['framesets'][frameset_hash] = {}
                            build_movies[movie_url]['framesets'][frameset_hash][key] = frameset[key]
                        if 'frames' in movie_data and 'images' in frameset:
                            build_movies[movie_url]['frames'] += frameset['images']

        counter = 0
        for sub_job_id in subtrahend_job_ids:
            job = Job.objects.get(pk=sub_job_id)
            job_data = json.loads(job.response_data)
            if 'movies' in job_data:
                for movie_url in job_data['movies']:
                    movie = job_data['movies'][movie_url]
                    for frameset_hash in movie['framesets']:
                        if movie_url in build_movies and \
                            frameset_hash in build_movies[movie_url]['framesets']:
                            counter += 1
                            if 'frames' in build_movies[movie_url] and \
                                'images' in build_movies[movie_url]['framesets'][frameset_hash]:
                                del_images = build_movies[movie_url]['framesets'][frameset_hash]['images']
                                build_frames = []
                                for frame_url in build_movies[movie_url]['frames']:
                                    if frame_url not in del_images:
                                        build_frames.append(frame_url)
                                build_movies[movie_url]['frames'] = build_frames
                                del build_movies[movie_url]['framesets'][frameset_hash]
                            else: # its probably t1 output, no frames or images
                                for mo_id in movie['framesets'][frameset_hash]:
                                    if mo_id in build_movies[movie_url]['framesets'][frameset_hash]:
                                        del build_movies[movie_url]['framesets'][frameset_hash][mo_id]
                                    if not build_movies[movie_url]['framesets'][frameset_hash]:
                                        del build_movies[movie_url]['framesets'][frameset_hash]

        for movie_url in build_movies:
            if not build_movies[movie_url]['framesets']:
                del build_movies[movie_url]

        print('t1 diff knocked out {} frames '.format(counter))

        return build_movies

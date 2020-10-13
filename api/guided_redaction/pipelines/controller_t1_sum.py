import json
from guided_redaction.jobs.models import Job


class T1SumController:

    def __init__(self):
        pass

    def build_t1_sum(self, job_ids):
        build_movies = {}
        for job_id in job_ids:
            if not Job.objects.filter(id=job_id).exists():
                return self.error("invalid job id: {}".format(job_id), status_code=400)
            job = Job.objects.get(pk=job_id)
            job_response_data = json.loads(job.response_data)
            if 'movies' in job_response_data:
                for movie_url in job_response_data['movies']:
                    movie_data = job_response_data['movies'][movie_url]
                    if movie_url not in build_movies:
                        build_movies[movie_url] = {'framesets': {}}
                    for frameset_hash in movie_data['framesets']:
                        frameset = movie_data['framesets'][frameset_hash]
                        for key in frameset:
                            if frameset_hash not in build_movies[movie_url]['framesets']:
                                build_movies[movie_url]['framesets'][frameset_hash] = {}
                            build_movies[movie_url]['framesets'][frameset_hash][key] = frameset[key]

        return build_movies

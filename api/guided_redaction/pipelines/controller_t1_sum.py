import json
import random
from guided_redaction.jobs.models import Job


class T1SumController:

    def __init__(self):
        pass

    def build_t1_sum(self, job_ids, mandatory_job_ids):
        build_movies = {}
        mandatory_jobs = {}
        if mandatory_job_ids:
            for mjid in mandatory_job_ids:
                job = Job.objects.get(pk=mjid)
                job_response_data = json.loads(job.response_data)
                mandatory_jobs[mjid] = job_response_data
            
        for job_id in job_ids:
            if not Job.objects.filter(id=job_id).exists():
                return self.error("invalid job id: {}".format(job_id), status_code=400)
            job = Job.objects.get(pk=job_id)
            job_response_data = json.loads(job.response_data)

            if 'movies' not in job_response_data:
                continue
            for movie_url in job_response_data['movies']:
                movie_data = job_response_data['movies'][movie_url]
                if movie_url not in build_movies:
                    build_movies[movie_url] = {'framesets': {}}
                for frameset_hash in movie_data['framesets']:
                    do_add = False
                    if not mandatory_job_ids:
                        do_add = True
                    elif job_id in mandatory_job_ids:
                        do_add = True
                    elif mandatory_job_ids and \
                        self.we_should_add_this_one(movie_url, frameset_hash, mandatory_jobs):
                        do_add = True
                    if do_add:
                        if frameset_hash not in build_movies[movie_url]['framesets']:
                            build_movies[movie_url]['framesets'][frameset_hash] = {}
                        frameset = movie_data['framesets'][frameset_hash]
                        for key in frameset:
                            match_obj = frameset[key]
                            match_obj['id'] = key
                            new_key = 'sum_key_' + str(random.randint(9999, 99999999))
                            build_movies[movie_url]['framesets'][frameset_hash][new_key] = match_obj

        return build_movies

    def we_should_add_this_one(self, movie_url, frameset_hash, mandatory_jobs):
        for mjid in mandatory_jobs:
            if movie_url not in mandatory_jobs[mjid]['movies']:
                return False
            mj_framesets = mandatory_jobs[mjid]['movies'][movie_url]['framesets']
            if frameset_hash not in mj_framesets:
                return False
        return True


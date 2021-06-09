import json
from .controller_t1 import T1Controller
from guided_redaction.jobs.models import Job


class T1FilterController(T1Controller):

    def __init__(self):
        pass

    def run_filter(self, request_data):
        response_movies = {}
        criteria = request_data.get("filter_criteria", {})
        job_ids = request_data.get("job_ids", [])

        for job_id in job_ids:
            if not Job.objects.filter(pk=job_id).exists():
                print('t1_filter: no job found for id')
                continue
            job = Job.objects.get(pk=job_id)
            job_resp = json.loads(job.response_data)
            movies = job_resp.get('movies', {})

            for movie_url in movies:
                if movie_url not in response_movies:
                    response_movies[movie_url] = {
                        'framesets': {},
                    }
                movie = movies[movie_url]

                for frameset_hash in movie['framesets']:
                    for match_obj_id in movie['framesets'][frameset_hash]:
                        match_obj = movie['framesets'][frameset_hash][match_obj_id]
                        this_obj_passes = False
                        for attr_name in criteria:
                            if self.filter_test_passes(attr_name, criteria[attr_name], match_obj):
                                this_obj_passes = True
                        if this_obj_passes:
                            if frameset_hash not in response_movies[movie_url]['framesets']:
                                response_movies[movie_url]['framesets'][frameset_hash] = {}
                            response_movies[movie_url]['framesets'][frameset_hash][match_obj_id] = match_obj

        return response_movies

    def filter_test_passes(self, attr_name, criterion, match_obj):
        oper = criterion['operator']
        val = criterion['value']
        if oper == 'equals' and val == match_obj.get(attr_name):
            return True

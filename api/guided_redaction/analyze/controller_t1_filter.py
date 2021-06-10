import json
from .controller_t1 import T1Controller


class T1FilterController(T1Controller):

    def __init__(self):
        pass

    def run_filter(self, request_data):
        response_movies = {}
        if request_data.get('tier_1_scanners'):
            t1s = request_data.get("tier_1_scanners", {})
            if 't1_filter' in t1s:
                meta_id = list(t1s['t1_filter'].keys())[0]
                meta_obj = t1s['t1_filter'][meta_id]
                criteria = meta_obj['filter_criteria']
        else:
            criteria = request_data.get("filter_criteria", {})
        movies_in = request_data.get("movies", {})

        for movie_url in movies_in:
            movie = movies_in[movie_url]
            if movie_url != 'source':
                self.run_filter_for_movie(movie, movie_url, criteria, response_movies)
#            else:
#                for child_movie_url in movies_in['source']:
#                    self.run_filter_for_movie(movies_in['source'][child_movie_url], child_movie_url, criteria, response_movies)

        return response_movies

    def run_filter_for_movie(self, movie, movie_url, criteria, response_movies):
        print('running filter for movie ', movie_url)
        if movie_url not in response_movies:
            response_movies[movie_url] = {
                'framesets': {},
            }

        for frameset_hash in movie['framesets']:
            for match_obj_id in movie['framesets'][frameset_hash]:
                if match_obj_id == 'images':
                    continue # it's a source movie, no attributes to compare
                match_obj = movie['framesets'][frameset_hash][match_obj_id]
                this_obj_passes = False
                for attr_name in criteria:
                    if self.filter_test_passes(attr_name, criteria[attr_name], match_obj):
                        this_obj_passes = True
                if this_obj_passes:
                    if frameset_hash not in response_movies[movie_url]['framesets']:
                        response_movies[movie_url]['framesets'][frameset_hash] = {}
                    response_movies[movie_url]['framesets'][frameset_hash][match_obj_id] = match_obj

    def filter_test_passes(self, attr_name, criterion, match_obj):
        oper = criterion['operator']
        val = criterion['value']
        if oper == 'equals' and val == match_obj.get(attr_name):
            return True

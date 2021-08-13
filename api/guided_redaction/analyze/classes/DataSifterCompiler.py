import numpy as np
from fuzzywuzzy import fuzz

from guided_redaction.analyze.classes.GridPointScorer import GridPointScorer


class DataSifterCompiler(GridPointScorer):

    def __init__(self, data_sifter, movies, file_writer):
        self.data_sifter = data_sifter
        if 'source' in movies:
            self.source_movies = movies['source']
        del movies['source']
        self.movies = movies
        self.file_writer = file_writer
        self.all_frameset_rows = {}
        self.movie_max_frameset_rows = {}
        self.all_movie_scores = {}
        self.debug = False
        self.row_threshold = 20
        self.word_match_threshold = 80
        for movie_url in self.movies:
            self.all_frameset_rows[movie_url] = {}
            self.movie_max_frameset_rows = {}
            self.all_movie_scores[movie_url] = {}

    def compile(self):
        for movie_url in self.movies:
            for frameset_hash in self.movies[movie_url]['framesets']:
                frameset = self.movies[movie_url]['framesets'][frameset_hash]
                self.all_frameset_rows[movie_url][frameset_hash] = \
                    self.build_frameset_rows(frameset, self.row_threshold)

            max_frameset_hash = self.get_frameset_hash_with_max_rows(movie_url)

            for frameset_hash in self.movies[movie_url]['framesets']:
                best_score_obj = self.score_frameset(
                    max_frameset_hash, movie_url, frameset_hash
                )
                self.all_movie_scores[movie_url][frameset_hash] = best_score_obj

#       find a supermax frameset grid across the movies
        supermax_movie_url = self.get_supermax_movie_url()
        print('supermax movie url is {}'.format(supermax_movie_url))
#       compare all non-supermax max grids to supermax max grid, save the results
        max_row_scores = {}
        for movie_url in self.movies:
            if movie_url == supermax_movie_url:
                continue
            best_score_obj = self.score_against_supermax(supermax_movie_url, movie_url)
#           looks like this:
# {'total_score': 349, 'app_row_scores': [[0], [0], [0, 0], [0, 0, 0], [0, 0], [85], [82, 0, 0, 0, 0], [0, 0, 0], [0, 0, 0], [82, 0], [100, 0, 0, 0], [0, 0]], 'app_row_rta_coords': [[(0, 0)], [(0, 0)], [(0, 0), (0, 0)], [(0, 0), (0, 0), (0, 0)], [(0, 0), (0, 0)], [(2, 0)], [(3, 1), (0, 0), (0, 0), (0, 0), (0, 0)], [(0, 0), (0, 0), (0, 0)], [(0, 0), (0, 0), (0, 0)], [(5, 0), (0, 0)], [(5, 1), (0, 0), (0, 0), (0, 0)], [(0, 0), (0, 0)]], 'window_start': [180, 401], 'window_end': [269, 536], 'app_home_coords': (6, 0), 'app_home_text': {'source': 'ocr: east+tess', 'location': [133, 477], 'size': [98, 27], 'origin': [], 'ocr_window_start': [118, 341], 'scale': 1, 'scanner_type': 'ocr', 'text': 'Security reminder'}, 'app_row_scores_primary_coords': [12, 0]}
            max_row_scores[movie_url] = best_score_obj
#       for each supermax frameset grid field:
#           find out how many non-supermax movie max grids did not see it
#           if no one saw it:
#               it's probably an anomaly, ignore
#           if above a threshold*, 
#               this is text that varies by client, 
#               annotate the supermax entry for that grid element
        supermax_grid = self.movie_max_frameset_rows[supermax_movie_url]
        supermax_grid_scores = {}
        for sm_grid_row_index, sm_grid_row in enumerate(supermax_grid):
            for sm_grid_col_index, sm_col in enumerate(sm_grid_row):
                missed_count = self.count_who_didnt_see_field(
                    (sm_grid_row_index, sm_grid_col_index),
                    max_row_scores
                )
                sm_text= supermax_grid[sm_grid_row_index][sm_grid_col_index]['text']
                print('{} max apps didnt see {}'.format(missed_count, sm_text))
                # if this nyumber is 1 or greater, the field only appears on supermax
                # i.e. it's user data, not a label!!!
#
#  *the above threshold is because text can randomly 'ocr' slightly differently
#      like a lowercase L becomes a one, or a word gets split into two.
#
# ALSO, TODO, add the thing to score_frameset, where, if no other frameset saw some field 
#     that is on max_frameset_grid, it's an anomaly, so ignore.

#        print('hippies, take a bath!')
#        print(self.all_movie_scores)
#        print(self.movie_max_frameset_rows)

        return {'donkey': 'cheese'}

    def count_who_didnt_see_field(self, supermax_coords, max_row_scores):
        missed_count = 0
        for movie_url in max_row_scores:
            saw_it = False
            score_obj = max_row_scores[movie_url]
            for row in score_obj['app_row_rta_coords']:
                for col in row:
                    if col[0] == supermax_coords[0] and col[1] == supermax_coords[1]:
                        saw_it = True
            if not saw_it:
                missed_count += 1

        return missed_count
        
    def score_against_supermax(self, supermax_movie_url, movie_url):
        fs_rows = self.movie_max_frameset_rows[movie_url]
        max_fs_rows = self.movie_max_frameset_rows[supermax_movie_url]
        match_cache = {}
        rta_scores = {}
        for fs_row_index, row in enumerate(fs_rows):
            for fs_col_index, col in enumerate(row):
                score = self.score_one_row_token(
                    match_cache, fs_rows, max_fs_rows, fs_row_index, fs_col_index
                )
                if score and score['total_score'] > 0:
                    if fs_row_index not in rta_scores:
                        rta_scores[fs_row_index] = {}
                    rta_scores[fs_row_index][fs_col_index] = score
        if not rta_scores:
            return 0
        best_score_obj = {}
        best_total_score = 0
        for row in rta_scores:
            for col in rta_scores[row]:
                grid_ele = rta_scores[row][col]
                if grid_ele['total_score'] > best_total_score:
                    best_score_obj = grid_ele
                    best_total_score = grid_ele['total_score']
        return best_score_obj

    def score_frameset(self, max_frameset_hash, movie_url, frameset_hash):
        # for each ocr match element we have:
        #   find the best place to match on the max rows, score wise
        # we now have the highest score match, 
        # update self.all_movie_scores
        # add this variation of spelling to our object
        # add the size to our database for this objecct
        if frameset_hash == max_frameset_hash:
            return # of course max matches itself 100%
        fs_rows = self.all_frameset_rows[movie_url][frameset_hash]
        max_fs_rows = self.all_frameset_rows[movie_url][max_frameset_hash]
        self.movie_max_frameset_rows[movie_url] = max_fs_rows
        match_cache = {}
        rta_scores = {}
        for fs_row_index, row in enumerate(fs_rows):
            for fs_col_index, col in enumerate(row):
                score = self.score_one_row_token(
                    match_cache, fs_rows, max_fs_rows, fs_row_index, fs_col_index
                )
                if score and score['total_score'] > 0:
                    if fs_row_index not in rta_scores:
                        rta_scores[fs_row_index] = {}
                    rta_scores[fs_row_index][fs_col_index] = score
        if not rta_scores:
            return 0
        best_score_obj = {}
        best_total_score = 0
        for row in rta_scores:
            for col in rta_scores[row]:
                grid_ele = rta_scores[row][col]
                if grid_ele['total_score'] > best_total_score:
                    best_score_obj = grid_ele
                    best_total_score = grid_ele['total_score']
#        this looks like so:
#        {'total_score': 1990, 'app_row_scores': [[82], [100], [91], [100, 0], [100, 86], [0, 89], [100, 0, 100], [0, 100, 0, 0], [100, 86], [100, 0, 82], [100, 95], [93, 100], [100], [0, 0, 86], [100]], 'app_row_rta_coords': [[(0, 0)], [(1, 0)], [(2, 0)], [(3, 0), (0, 0)], [(4, 0), (4, 1)], [(0, 0), (5, 1)], [(6, 1), (0, 0), (6, 2)], [(0, 0), (7, 1), (0, 0), (0, 0)], [(8, 0), (8, 1)], [(9, 0), (0, 0), (9, 1)], [(10, 0), (10, 1)], [(11, 0), (11, 1)], [(12, 0)], [(0, 0), (0, 0), (13, 1)], [(14, 0)]], 'window_start': [326, 424], 'window_end': [713, 858], 'app_home_coords': (0, 0), 'app_home_text': {'source': 'ocr: east+tess', 'location': [494, 225], 'size': [58, 17], 'origin': [], 'ocr_window_start': [311, 208], 'scale': 1, 'scanner_type': 'ocr', 'text': 'Alanidra'}, 'app_row_scores_primary_coords': [15, 0]}
        return best_score_obj

    def score_one_row_token(
        self,
        match_cache,
        fs_rows, 
        max_fs_rows, 
        fs_row_index, 
        fs_col_index
    ):
        # takes a single 'word' on framesets rows, so a label or data field.
        # finds the best score it can make by matching sequentially against 
        #   ANY point on the max frameset rows, then expanding above and below
        fs_text = fs_rows[fs_row_index][fs_col_index]['text']
        app_phrase_matches = self.find_potential_matches_for_rta_grid_point_in_app_grid(
            self.word_match_threshold, 
            match_cache, 
            fs_text, 
            max_fs_rows
        )
        rta_phrase_matches = {}
        for app_phrase in app_phrase_matches:
            matched_app_phrase_data = app_phrase_matches[app_phrase]
            scores_for_this_phrase = {}
            for location_number, app_phrase_coords in enumerate(matched_app_phrase_data['app_locations']):
                return_obj = self.score_rta_point_and_app_phrase_point(
                    self.word_match_threshold,
                    match_cache,
                    fs_rows,
                    (fs_row_index, fs_col_index),
                    app_phrase_coords,
                    max_fs_rows,
                    None,  # max feature distances
                )
                scores_for_this_phrase[location_number] = return_obj
            best_score_this_phrase = {'total_score': 0, 'row_scores': []}
            for location_number in scores_for_this_phrase:
                score_at_location = scores_for_this_phrase[location_number]
                if score_at_location['total_score'] > best_score_this_phrase['total_score']:
                    best_score_this_phrase = score_at_location
            rta_phrase_matches[app_phrase] = best_score_this_phrase

#        get highest value for rta_phrase_matches[x]['total_score']             
        best_score_overall = {'total_score': 0, 'row_scores': []}               
        for app_phrase in rta_phrase_matches:                                   
            score_at_location = rta_phrase_matches[app_phrase]                  
            if score_at_location['total_score'] > best_score_overall['total_score']:
                best_score_overall = score_at_location                          
        if self.debug:                                                          
            print('best score overall: {}'.format(best_score_overall))          
        print('===========best score for rta {}:{} {} is {}'.format(
            fs_row_index, fs_col_index, fs_text, best_score_overall['total_score']
        ))
        return best_score_overall  

    def get_supermax_movie_url(self):
        movie_urls = list(self.movie_max_frameset_rows.keys())
        sorted_movie_urls = sorted(
            movie_urls,
            key=lambda movie_url: (
                len(self.movie_max_frameset_rows[movie_url]), 
                sum([len(x) for x in self.movie_max_frameset_rows[movie_url]])
            )
        )
        max_movie_url = sorted_movie_urls[-1]
        return max_movie_url

    def get_frameset_hash_with_max_rows(self, movie_url):
        frameset_hashes = list(self.movies[movie_url]['framesets'].keys())
        sfhs = sorted(
            frameset_hashes, 
            key=lambda fh: (
                len(self.all_frameset_rows[movie_url][fh]), 
                sum([len(x) for x in self.all_frameset_rows[movie_url][fh]])
            )
        )
        maximal_fh = sfhs[-1]
        return maximal_fh

    def build_frameset_rows(self, ocr_scan_frameset, row_threshold):
        ocr_keys = list(ocr_scan_frameset.keys())
        # sort ocr_keys by y, then x 
        ocr_keys = sorted(
            ocr_keys, 
            key=lambda ocr: (
                ocr_scan_frameset[ocr]['location'][1], 
                ocr_scan_frameset[ocr]['location'][0]
            )
        )
        # group items that are close in the y axis = 'close enough' to the same row
        rows = self.quantize_rows(ocr_keys, ocr_scan_frameset, row_threshold)
        return rows

    def quantize_rows(self, ocr_keys, frameset, row_threshold):
        rows = []
        cur_y = 0
        build_row = []
        for index, k in enumerate(ocr_keys):
            ocr = frameset[k]
            if ocr['location'][1] - cur_y > row_threshold:
                # new row
                if build_row:
                    rows.append(build_row)
                    build_row = [ocr]
                    cur_y = ocr['location'][1]
                    continue
            added = False
            for position, item in enumerate(build_row):
                if item['location'][0] < ocr['location'][0]:
                    continue
                else:
                    build_row.insert(position, ocr)
                    added = True
                    break
            if not added:
                build_row.append(ocr)
            if index == len(ocr_keys) - 1:
                rows.append(build_row)
        return rows


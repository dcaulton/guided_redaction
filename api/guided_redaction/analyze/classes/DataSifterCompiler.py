import numpy as np
from fuzzywuzzy import fuzz


class DataSifterCompiler:

    def __init__(self, data_sifter, movies, file_writer):
        self.data_sifter = data_sifter
        self.movies = movies
        self.file_writer = file_writer
        self.all_frameset_rows = {}
        self.all_movie_scores = {}
        self.row_threshold = 20
        self.word_match_threshold = 80
        for movie_url in self.movies:
            self.all_frameset_rows[movie_url] = {}
            self.all_movie_scores[movie_url] = {}

    def compile(self):
        for movie_url in self.movies:
            if movie_url == 'source':
                continue

            for frameset_hash in self.movies[movie_url]['framesets']:
                self.build_and_store_frameset_rows(movie_url, frameset_hash)

            max_frameset_hash = self.get_frameset_hash_with_max_rows(movie_url)

            totals_this_movie = self.make_zeros_like_array(movie_url, max_frameset_hash)

            for frameset_hash in self.movies[movie_url]['framesets']:
                self.score_frameset(max_frameset_hash, movie_url, frameset_hash)

#            print('MAXIMAL frameset data')
#            print(self.all_frameset_rows[movie_url][max_frameset_hash])
#            print(totals_this_movie)


        return {'donkey': 'cheese'}

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
        fs_anchor_scores = self.make_zeros_like_array(movie_url, frameset_hash)
        for fs_row_index, row in enumerate(fs_rows):
            for fs_col_index, col in enumerate(row):
                self.score_one_row_token(
                    fs_anchor_scores, fs_rows, max_fs_rows, fs_row_index, fs_col_index
                )

    def score_one_row_token(
        self,
        fs_anchor_scores, 
        fs_rows, 
        max_fs_rows, 
        fs_row_index, 
        fs_col_index
    ):
        # takes a single 'word' on framesets rows, so a label or data field.
        # finds the best score it can make by matching sequentially against 
        #   ANY point on the max frameset rows, then expanding above and below
        fs_text = fs_rows[fs_row_index][fs_col_index]['text']
        print('===========getting a dang score for {} {}: {}'.format(fs_row_index, fs_col_index, fs_text))
        potential_sites_for_fs_word = []
        for max_row_index, max_row in enumerate(max_fs_rows):
            for max_col_index, max_col in enumerate(max_row):
                m_item = max_fs_rows[max_row_index][max_col_index]
                m_text = m_item['text']
                ratio = fuzz.ratio(m_text, fs_text)
#                print('  match ratio on {} {} is {}'.format(fs_text, m_text, ratio))
                if ratio >= self.word_match_threshold:
                    potential_sites_for_fs_word.append({
                        'anchor_score': ratio,
                        'row_and_col': [max_row_index, max_col_index],
                    })
        if potential_sites_for_fs_word:
            print('got a match for this guy: {}'.format(potential_sites_for_fs_word))
        for potential_site in potential_sites_for_fs_word:
            score_above = 0
            score_below = 0
            prow = potential_site['row_and_col'][0]
            pcol = potential_site['row_and_col'][1]
            if pcol > 0:
                # check for scores above this item in the grid
                pass
            if (pcol < len(max_fs_rows[prow]) - 1) \
                or (prow < len(max_fs_rows) - 1):
                # before the end of this row or
                # other rows occur afterward
                # check for scores below this item in the grid
                pass



    def build_and_store_frameset_rows(self, movie_url, frameset_hash):
        frameset = self.movies[movie_url]['framesets'][frameset_hash]
        sa_keys = list(frameset.keys())
        # sort sa_keys by y, then x 
        sa_keys = sorted(
            sa_keys, 
            key=lambda sa: (frameset[sa]['location'][1], frameset[sa]['location'][0])
        )
        # group items that are close in the y axis = 'close enough' to the same row
        rows = self.quantize_rows(sa_keys, frameset)
        self.all_frameset_rows[movie_url][frameset_hash] = rows

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

    def make_zeros_like_array(self, movie_url, frameset_hash):
        arr = self.all_frameset_rows[movie_url][frameset_hash]
        # Numpy has a zeros like function that does this, it would be SO nice
        # if it actually worked for me
        build_arr = []
        for row in arr:
            build_row = []
            for field in row:
                build_row.append(0)
            build_arr.append(build_row)
        return build_arr

    def quantize_rows(self, sa_keys, frameset):
        rows = []
        cur_y = 0
        build_row = []
        for index, k in enumerate(sa_keys):
            sa = frameset[k]
            if sa['location'][1] - cur_y > self.row_threshold:
                # new row
                if build_row:
                    rows.append(build_row)
                    build_row = [sa]
                    cur_y = sa['location'][1]
                    continue
            added = False
            for position, item in enumerate(build_row):
                if item['location'][0] < sa['location'][0]:
                    continue
                else:
                    build_row.insert(position, sa)
                    added = True
                    break
            if not added:
                build_row.append(sa)
            if index == len(sa_keys) - 1:
                rows.append(build_row)
        return rows


import numpy as np
import cv2
import uuid


def make_zeros_like_array(arr):
    # Numpy has a zeros like function that does this, it would be SO nice
    # if it actually worked for me
    build_arr = []
    for row in arr:
        build_row = []
        for field in row:
            build_row.append(0)
        build_arr.append(build_row)
    return build_arr

class DataSifterCompiler:

    def __init__(self, data_sifter, movies, file_writer):
        self.data_sifter = data_sifter
        self.movies = movies
        self.file_writer = file_writer
        self.row_threshold = 20

    def compile(self):
        all_frameset_data = {}
        for movie_url in self.movies:
            if movie_url == 'source':
                continue
            all_frameset_data[movie_url] = {}
            movie = self.movies[movie_url]
            frameset_hashes = list(movie['framesets'].keys())
            for frameset_hash in frameset_hashes:
                frameset = movie['framesets'][frameset_hash]
                sa_keys = list(frameset.keys())
                # sort sa_keys by y, then x 
                sa_keys = sorted(
                    sa_keys, 
                    key=lambda sa: (frameset[sa]['location'][1], frameset[sa]['location'][0])
                )
                rows = self.quantize_rows(sa_keys, frameset)
                all_frameset_data[movie_url][frameset_hash] = rows
#                print(rows)
                # this is good.  Now sa_keys is ranked by row, then col
            sfhs = sorted(
                frameset_hashes, 
                key=lambda fh: (
                    len(all_frameset_data[movie_url][fh]), 
                    sum([len(x) for x in all_frameset_data[movie_url][fh]])
                )
            )
            maximal_fh = sfhs[-1]
            totals_this_movie = make_zeros_like_array(all_frameset_data[movie_url][maximal_fh])
            print('loopy')
            print(len(all_frameset_data[movie_url][maximal_fh]))
            print(all_frameset_data[movie_url][maximal_fh])
            print('===========================')
            for row in all_frameset_data[movie_url][maximal_fh]:
                print(row)
            print('===========================')
            print(totals_this_movie)


        return {'donkey': 'cheese'}

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


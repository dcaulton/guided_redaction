import numpy as np
import cv2
import uuid


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
            for frameset_hash in movie['framesets']:
                frameset = movie['framesets'][frameset_hash]
                sa_keys = list(frameset.keys())
                # sort sa_keys by y, then x 
                sa_keys = sorted(
                    sa_keys, 
                    key=lambda sa: (frameset[sa]['location'][1], frameset[sa]['location'][0])
                )
                rows = self.merge_rows(sa_keys, frameset)
                all_frameset_data[movie_url][frameset_hash] = rows
                print(rows)
                # this is good.  Now sa_keys is ranked by row, then col

        return {'donkey': 'cheese'}

    def merge_rows(self, sa_keys, frameset):
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


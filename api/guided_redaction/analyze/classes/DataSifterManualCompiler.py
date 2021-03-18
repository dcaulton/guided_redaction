import numpy as np


class DataSifterManualCompiler():

    def __init__(self, data_sifter, movies):
        self.data_sifter = data_sifter
        if 'source' in movies:
            self.source_movies = movies['source']
        del movies['source']
        self.movies = movies
        self.all_frameset_rows = {}
        self.movie_max_frameset_rows = {}
        self.all_movie_scores = {}
        self.debug = False
        self.row_threshold = 20
        self.word_match_threshold = 80

    def compile(self):
    # gather ocr_rows, left_cols, right_cols
    # make guesses as to which fields are labels
        print('POCKY WOCKY')
        pass


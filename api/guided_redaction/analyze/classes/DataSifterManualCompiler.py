from guided_redaction.analyze.classes.OcrRowColMaker import OcrRowColMaker


class DataSifterManualCompiler():

    def __init__(self, data_sifter, movies):
        self.data_sifter = data_sifter
        if 'source' in movies:
            self.source_movies = movies['source']
        del movies['source']
        self.movies = movies
        self.debug = False
        self.ocr_rowcol_maker = OcrRowColMaker()

    def compile(self):
        # gather ocr_rows, left_cols, right_cols
        # make guesses as to which fields are labels
        ocr_results_this_frame = {}
        for movie_url in self.movies:
            for frameset_hash in self.movies[movie_url]['framesets']:
                ocr_results_this_frame = self.movies[movie_url]['framesets'][frameset_hash]

        ocr_rows_dict = self.ocr_rowcol_maker.gather_ocr_rows(ocr_results_this_frame)
        ocr_left_cols_dict, ocr_right_cols_dict = self.ocr_rowcol_maker.gather_ocr_cols(ocr_results_this_frame)

        print('ocr rowwies {}'.format(ocr_rows_dict))
        print('ocr left collars {}'.format(ocr_left_cols_dict))
        print('ocr right collars {}'.format(ocr_right_cols_dict))
        
        return self.data_sifter



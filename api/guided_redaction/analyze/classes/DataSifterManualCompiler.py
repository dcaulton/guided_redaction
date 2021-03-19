import enchant
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
        self.dict = enchant.Dict('en_US')
        self.movie_url = ''
        self.image_url = ''
        for movie_url in self.movies:
            for frameset_hash in self.movies[movie_url]['framesets']:
                self.image_url = self.source_movies[movie_url]['frames'][0]
                self.movie_url = movie_url

    def compile(self):
        # gather ocr_rows, left_cols, right_cols
        # make guesses as to which fields are labels
        self.ocr_results_this_frame = {}
        for movie_url in self.movies:
            for frameset_hash in self.movies[movie_url]['framesets']:
                self.ocr_results_this_frame = self.movies[movie_url]['framesets'][frameset_hash]

        ocr_rows_dict = self.ocr_rowcol_maker.gather_ocr_rows(self.ocr_results_this_frame)
        ocr_left_cols_dict, ocr_right_cols_dict = self.ocr_rowcol_maker.gather_ocr_cols(self.ocr_results_this_frame)

        print('ocr rowwies {}'.format(ocr_rows_dict))
        print('ocr left collars {}'.format(ocr_left_cols_dict))
        print('ocr right collars {}'.format(ocr_right_cols_dict))
        
        self.app_rows = []
        self.app_items = {}

        self.app_rows = self.build_app_rowcol('row', ocr_rows_dict)
        self.app_left_cols = self.build_app_rowcol('left_col', ocr_left_cols_dict)
        self.app_right_cols = self.build_app_rowcol('right_col', ocr_right_cols_dict)

        self.data_sifter['rows'] = self.app_rows
        self.data_sifter['left_cols'] = self.app_left_cols
        self.data_sifter['right_cols'] = self.app_right_cols
        self.data_sifter['items'] = self.app_items
        self.data_sifter['image_url'] = self.image_url
        self.data_sifter['movie_url'] = self.movie_url
        return self.data_sifter

    def build_app_rowcol(self, row_col_type, ocr_rowcols_dict):
        build_rows = []
        sorted_row_ids = self.ocr_rowcol_maker.get_sorted_keys_for_ocr_rowcols(row_col_type, ocr_rowcols_dict)
        for row_id in sorted_row_ids:
            ocr_row = ocr_rowcols_dict[row_id]
            build_row = []
            for ocr_match_element_id in ocr_row['member_ids']:
                ocr_match_element = self.ocr_results_this_frame[ocr_match_element_id]
                has_unrecognized_tokens= False
                for word_token in ocr_match_element['text'].split():
                    if not self.dict.check(word_token):
                        has_unrecognized_tokens = True
                if has_unrecognized_tokens:
                    build_item = {
                        'type': 'user_data',
                        'field_name_label': '',
                        'mask_this_field': True,
                        'is_pii': True,
                        'data_type': 'string',
                        'location': ocr_match_element['location'],
                        'size': ocr_match_element['size'],
                    }
                else:
                    build_item = {
                        'type': 'label',
                        'text': ocr_match_element['text'],
                        'location': ocr_match_element['location'],
                        'size': ocr_match_element['size'],
                    }
                build_row.append(ocr_match_element_id)
                self.app_items[ocr_match_element_id] = build_item
            build_rows.append(build_row)
        return build_rows

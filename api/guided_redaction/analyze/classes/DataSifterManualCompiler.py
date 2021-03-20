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

        self.app_rows = []
        self.app_items = {}

        self.app_rows = self.build_app_rowcol('row', ocr_rows_dict)
        self.app_left_cols = self.build_app_rowcol('left_col', ocr_left_cols_dict)
        self.app_right_cols = self.build_app_rowcol('right_col', ocr_right_cols_dict)

        self.shorten_app_entity_ids()

        self.trim_weakest_columns()

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
                        'text': ocr_match_element['text'], # in case the user wants to toggle this to a label 
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

    def shorten_app_entity_ids(self):
        new_names = {}
        old_names = list(self.app_items.keys())
        for item_index in range(len(old_names)):
            old_name = old_names[item_index]
            new_names[old_name] = 'a' + str(item_index)

        self.update_self_app_rowcols('row', new_names)
        self.update_self_app_rowcols('left_col', new_names)
        self.update_self_app_rowcols('right_col', new_names)
        
        for old_name in new_names:
            new_name = new_names[old_name]
            self.app_items[new_name] = self.app_items[old_name]
            del self.app_items[old_name]

    def update_self_app_rowcols(self, rowcol_type, new_names):
        if rowcol_type == 'row':
            self_app_rowcols = self.app_rows
        elif rowcol_type == 'left_col':
            self_app_rowcols = self.app_left_cols
        elif rowcol_type == 'right_col':
            self_app_rowcols = self.app_right_cols

        new_app_rowcols = []
        for old_app_rowcol in self_app_rowcols:
            build_rowcol = []
            for old_app_name in old_app_rowcol:
                build_rowcol.append(new_names[old_app_name])
            new_app_rowcols.append(build_rowcol)

        if rowcol_type == 'row':
            self.app_rows = new_app_rowcols
        elif rowcol_type == 'left_col':
            self.app_left_cols = new_app_rowcols
        elif rowcol_type == 'right_col':
            self.app_right_cols = new_app_rowcols

    def trim_weakest_columns(self):
        # The idea here is that an item will be grouped into a left or right column, based on its alignment
        #   or maybe neither, meaning it just floats horizontally on the page, like a center aligned heading
        # But an item will only extremely rarely be left AND right aligned.  In fact if the whole column is like that
        #   it's easier to just think of it as a left aligned column
        # If we don't this, you end up with dozens of one member right hand cols (if stuff is left aligned), this
        #   blows up our Data Sifter rowcol score ranking logic, more importantly it adds no useful information
        left_column_counts = {}
        for left_col in self.app_left_cols:
            num_items = len(left_col)
            for item_id in left_col:
                left_column_counts[item_id] = num_items

        right_column_ids = []
        for right_col in self.app_right_cols:
            num_items = len(right_col)
            for item_id in right_col:
                if num_items > left_column_counts[item_id]:
                    right_column_ids.append(item_id)

        build_left_cols = []
        for left_col in self.app_left_cols:
            new_col = []
            for item_id in left_col:
                if item_id not in right_column_ids:
                    new_col.append(item_id)
            if new_col:
                build_left_cols.append(new_col)
        self.app_left_cols = build_left_cols

        build_right_cols = []
        for right_col in self.app_right_cols:
            new_col = []
            for item_id in right_col:
                if item_id in right_column_ids:
                    new_col.append(item_id)
            if new_col:
                build_right_cols.append(new_col)
        self.app_right_cols = build_right_cols

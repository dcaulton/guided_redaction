import cv2
from guided_redaction.analyze.classes.EastPlusTessScanner import EastPlusTessScanner


class OcrSceneAnalyzer:

    def __init__(self, recognized_text_areas, app_dictionary, debug=False):
        self.recognized_text_areas = recognized_text_areas
        self.app_dictionary = app_dictionary
        self.debug=debug

    def analyze_scene(self):
        sorted_rtas = self.order_recognized_text_areas_by_geometry()

        rta_scores = {}
        for app_name in self.app_dictionary:
            print('considering app {}'.format(app_name))
            rta_scores[app_name] = {}
            app_phrases = app_dictionary[app_name]['phrases']
            for rta_row_number, rta_row in enumerate(sorted_rtas):
                rta_scores[app_name][rta_row_number] = {}
                for rta_column_number, rta in enumerate(rta_row):
                    scores = self.analyze_one_rta_row_field_vs_one_app(
                        sorted_rtas,
                        app_phrases,
                        rta_row_number,
                        rta_column_number,
                    )
                    if scores:
                        rta_scores[app_name][rta_row_number][rta_column_number] = scores

#        find the app_name with the highest score in rta_scores (may be null)
        resp_obj = {
            'great': 'googley moogley',
            'hot': 'and spicy',
        }
        stats_obj = {
            'something': 'else',
            'super': 'gainer',
        }

        return (resp_obj, stats_obj)

    def analyze_one_rta_row_field_vs_one_app(self, sorted_rtas, app_phrases, rta_row_number, rta_col_number):
        match_threshold = .5
        return_data = {}
        print('comparing app phrases for rta row {} col {}'.format(rta_row_number, rta_col_number))

#        compare the rta text at row and col to every phrase in app_phrases,
#            (this will be the strongest base pair match for the protein)
#        if any scores are better than match_threshold, save them in rta-phrase-scores[phrase]
#        phrase_match_points = []
#        find the highest score in rta-phrase-scores
#        if its more than 33% higher than the next highest, phrase_match_points = [this_phrase]
#        else, phrase_match_points = [all phrases in the top third]
#
#        rta_phrase_matches = {}
#        for phrase_match_point in phrase_match_points:
#            total_match_score, row_scores = get_scores_from_rta_point_and_app_phrase_point()
#            rta_phrase_matches[this_phrase] = {total_match_score, row_scores}
#
#        get highest value for rta_phrase_matches[x]['total_match_score']
#        return rta_phrase_matches[highest_value]

        return_data = {
            'total_match_score': .5,
            'row_scores': [
              1.4,
              0,
              .665,
              0,
              .2,
            ],
        }
        return return_data

    def order_recognized_text_areas_by_geometry(self):
        raw_rtas = self.recognized_text_areas
        response_rtas = []
        rtas_by_id = {}
        for rta in raw_rtas:
            rtas_by_id[rta['id']] = rta
        rows = sorted(raw_rtas, key = lambda i: i['start'][1])
        # merge rows that are only a few pixels off from each others
        current_y = -200
        row_y_bunches = {}
        for row in rows:
            if row['start'][1] - current_y > 10:
                current_y = row['start'][1]
                row_y_bunches[current_y] = [row['id']]
                continue
            row_y_bunches[current_y].append(row['id'])
        for rco_key in sorted(row_y_bunches.keys()):
            x_keys = []
            for rta_id in row_y_bunches[rco_key]:
                x_keys.append(rtas_by_id[rta_id])
            x_keys_sorted = sorted(x_keys, key = lambda i: i['start'][0])
            response_rtas.append(x_keys_sorted)

        if self.debug:
            print('==========================ocr rta rows bunched by y, then sorted by x:')
            for row in response_rtas:
                print('----------- new row')
                for rta in row:
                    print('{} {}'.format(rta['start'], rta['text']))
            
        return response_rtas

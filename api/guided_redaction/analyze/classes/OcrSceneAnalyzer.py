from fuzzywuzzy import fuzz

from guided_redaction.analyze.classes.GridPointScorer import GridPointScorer


class OcrSceneAnalyzer(GridPointScorer):

    def __init__(self, recognized_text_areas, osa_rule, frame_dimensions):
        self.recognized_text_areas = recognized_text_areas
        self.app_dictionary = osa_rule['apps']
        self.debug = osa_rule['debugging_output']
        self.osa_rule = osa_rule
        self.frame_dimensions = frame_dimensions
        # TODO: move match and row thresholds into the OSA rule
        self.match_threshold = 80
        self.row_threshold = 10

    def analyze_scene(self):
        sorted_rtas = self.order_recognized_text_areas_by_geometry(
            self.recognized_text_areas, self.row_threshold
        )

        rta_scores = {}
        for app_name in self.app_dictionary:
            match_cache = {}
            print('considering app {}'.format(app_name))
            rta_scores[app_name] = {}
            app_phrases = self.app_dictionary[app_name]['phrases']
            app_max_feature_distances = None
            if 'max_feature_distance' in self.app_dictionary[app_name]:
                app_max_feature_distances = self.app_dictionary[app_name]['max_feature_distance']
            for rta_row_number, rta_row in enumerate(sorted_rtas):
                for rta_column_number, rta in enumerate(rta_row):
                    scores = self.analyze_one_rta_row_field_vs_one_app(
                        self.match_threshold,
                        match_cache,
                        sorted_rtas,
                        app_phrases,
                        app_max_feature_distances,
                        rta_row_number,
                        rta_column_number,
                    )
                    if scores and scores['total_score'] > 0:
                        if rta_row_number not in rta_scores[app_name]:
                            rta_scores[app_name][rta_row_number] = {}
                        rta_scores[app_name][rta_row_number][rta_column_number] = scores

        winning_apps = {}
        for app_name in rta_scores:
            app_high_score = 0
            app_high_score_coords = {'start': (0,0), 'end': (0,0)}
            for row_id in rta_scores[app_name]:
                row = rta_scores[app_name][row_id]
                for col_id in row:
                    col = row[col_id]
                    if col['total_score'] > app_high_score:
                        app_high_score = col['total_score']
                        app_high_score_coords['start'] = col['window_start']
                        app_high_score_coords['end'] = col['window_end']

            if app_high_score >= self.osa_rule['apps'][app_name]['app_score_threshold']:
                winning_apps[app_name] = {
                    'app_id': app_name,
                    'score': app_high_score,
                    'start': app_high_score_coords['start'],
                    'end': app_high_score_coords['end'],
                    'scanner_type': 'ocr_scene_analysis',
                }

        stats_obj = {
            'rta_scores': rta_scores,
            'ordered_rtas': sorted_rtas,
            'frame_dimensions': self.frame_dimensions,
        }
        return (winning_apps, stats_obj)

    def analyze_one_rta_row_field_vs_one_app(
        self, 
        match_threshold, 
        match_cache, 
        sorted_rtas, 
        app_phrases, 
        app_max_feature_distances, 
        rta_row_number, 
        rta_col_number
    ):
        return_data = {}
        rta_text = sorted_rtas[rta_row_number][rta_col_number]['text']
        if rta_text not in match_cache:
            match_cache[rta_text] = {}
        if self.debug:
            print('---comparing app phrases for rta *{}* at row {} col {}'.format(
                rta_text, rta_row_number, rta_col_number
            ))
        app_phrase_matches = self.find_potential_matches_for_rta_grid_point_in_app_grid(
            match_threshold, match_cache, rta_text, app_phrases
        )
#       evaluate all matched app phrases to get a base pair match score and stats
        rta_phrase_matches = {}
        for app_phrase in app_phrase_matches:
            matched_app_phrase_data = app_phrase_matches[app_phrase]
            scores_for_this_phrase = {}
            for location_number, app_phrase_coords in enumerate(matched_app_phrase_data['app_locations']):
                return_obj = self.score_rta_point_and_app_phrase_point(
                        match_threshold,
                        match_cache,
                        sorted_rtas,
                        (rta_row_number, rta_col_number), 
                        app_phrase_coords, 
                        app_phrases,
                        app_max_feature_distances,
                    )
                scores_for_this_phrase[location_number] = return_obj
#            get the highest score for this phrase, save it in rta_phrase_matches               
            best_score_this_phrase = {'total_score': 0, 'row_scores': []}
            for location_number in scores_for_this_phrase:
                score_at_location = scores_for_this_phrase[location_number]
                if score_at_location['total_score'] > best_score_this_phrase['total_score']:
                    best_score_this_phrase = score_at_location
            rta_phrase_matches[app_phrase] = best_score_this_phrase

        #TODO make sure this is really needed, 
#        get highest value for rta_phrase_matches[x]['total_score']
        best_score_overall = {'total_score': 0, 'row_scores': []}
        for app_phrase in rta_phrase_matches:
            score_at_location = rta_phrase_matches[app_phrase]
            if score_at_location['total_score'] > best_score_overall['total_score']:
                best_score_overall = score_at_location
        if self.debug:
            print('best score overall: {}'.format(best_score_overall))
        return best_score_overall

    def order_recognized_text_areas_by_geometry(self, raw_rtas, row_threshold):
        response_rtas = []
        rtas_by_id = {}
        for rta in raw_rtas:
            rtas_by_id[rta['id']] = rta
        rows = sorted(raw_rtas, key = lambda i: i['start'][1])
        # merge rows that are only a few pixels off from each others
        current_y = -200
        row_y_bunches = {}
        for row in rows:
            if row['start'][1] - current_y > row_threshold:
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

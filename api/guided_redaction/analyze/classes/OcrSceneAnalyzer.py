from fuzzywuzzy import fuzz
from copy import deepcopy


class OcrSceneAnalyzer:

    def __init__(self, recognized_text_areas, osa_rule):
        self.recognized_text_areas = recognized_text_areas
        self.app_dictionary = osa_rule['apps']
        self.sorted_rtas = []
        self.match_cache = {}
        self.debug = osa_rule['debugging_output']
        self.match_threshold = 80
        self.osa_rule = osa_rule

    def analyze_scene(self):
        self.sorted_rtas = self.order_recognized_text_areas_by_geometry()

        rta_scores = {}
        for app_name in self.app_dictionary:
            self.clear_match_phrase_locations()
            print('considering app {}'.format(app_name))
            rta_scores[app_name] = {}
            app_phrases = self.app_dictionary[app_name]['phrases']
            app_max_feature_distances = None
            if 'max_feature_distance' in self.app_dictionary[app_name]:
                app_max_feature_distances = self.app_dictionary[app_name]['max_feature_distance']
            for rta_row_number, rta_row in enumerate(self.sorted_rtas):
                for rta_column_number, rta in enumerate(rta_row):
                    scores = self.analyze_one_rta_row_field_vs_one_app(
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
                    'name': app_name,
                    'score': app_high_score,
                    'start': app_high_score_coords['start'],
                    'end': app_high_score_coords['end'],
                }

        stats_obj = {
            'rta_scores': rta_scores,
            'ordered_rtas': self.sorted_rtas,
        }
        return (winning_apps, stats_obj)

    def clear_match_phrase_locations(self):
        for rta_key in self.match_cache:
            for app_key in self.match_cache[rta_key]:
                self.match_cache[rta_key][app_key]['app_locations'] = []

    def add_below_matches(self, 
            app_row_scores, 
            app_row_rta_coords, 
            window_start, 
            window_end, 
            rta_coords, 
            app_coords, 
            app_phrases, 
            app_max_feature_distances
        ):
        ###### add scores for rows below this point
        if self.debug:
            print('adding below matches')
        current_app_row = app_coords[0]
        current_rta_row = rta_coords[0]
        last_rta_row_claimed = rta_coords[0]
        last_rta_col_claimed = rta_coords[1]
        # for app rows from current_app_row to the end of the app_phrases:
        for i in range(current_app_row+1, len(app_phrases)):
            app_row_score = []
            app_rta_coords_this_row = []
            app_row = app_phrases[i]
        #     for app_item in this app row:
            if self.debug:
                print('-new app row: {}'.format(app_row))
            for app_col_number, app_row_text in enumerate(app_row):
                app_row_text_matched = False
                if self.debug:
                    print('--new app field {}'.format(app_row_text))
        #         for rta rows from last_claimed_rta_row to the end of self.sorted_rtas:
                for j in range(current_rta_row+1, len(self.sorted_rtas)):
                    if app_row_text_matched:
                        continue
                    rta_row = self.sorted_rtas[j]
        #             for unclaimed rta_items in this rta row:
                    for rta_number, rta in enumerate(rta_row):
                        if rta_number <= last_rta_col_claimed and j <= last_rta_row_claimed:
                            continue
                        if app_row_text_matched:
                            continue
                        if self.debug:
                            print('  {}---{}'.format(app_row_text, rta['text']))
                        if rta['text'] not in self.match_cache:
                            self.match_cache[rta['text']] = {}
                        if app_row_text in self.match_cache[rta['text']]:
                            ratio = self.match_cache[rta['text']][app_row_text]['ratio']
                        else:
                            if rta['text'] not in self.match_cache:
                                self.match_cache[rta['text']] = {}
                            ratio = fuzz.ratio(rta['text'], app_row_text)
                            self.match_cache[rta['text']][app_row_text] = {
                                'ratio': ratio,
                                'app_locations': [],
                            }
        #                 if the match exceeds the threshold:
        #                     add match score to the total
        #                     last claimed rta row and column = current rta row/col
                        if ratio > self.match_threshold:
                            new_bounding_box = self.build_new_bounding_box(rta, window_start, window_end)
                            if self.box_exceeds_max_feature_distances(new_bounding_box, app_max_feature_distances):
                                continue
                            if self.debug:
                                print('adding match for APP {}-{},{}, RTA {}-{},{}  score {}'.format(
                                    app_row_text, i, app_col_number, rta['text'] ,j, rta_number, ratio))
                            app_row_score.append(ratio)
                            app_rta_coords_this_row.append((j, rta_number))
                            app_row_text_matched = True
                            last_rta_row_claimed = j
                            last_rta_col_claimed = rta_number
                            if rta['start'][0] < window_start[0]:
                                window_start[0] = rta['start'][0]
                            if rta['start'][1] < window_start[1]:
                                window_start[1] = rta['start'][1]
                            if rta['end'][0] > window_end[0]:
                                window_end[0] = rta['end'][0]
                            if rta['end'][1] > window_end[1]:
                                window_end[1] = rta['end'][1]
                            continue
                if not app_row_text_matched:
                    app_row_score.append(0)
                    app_rta_coords_this_row.append((0, 0))
            app_row_scores.append(app_row_score)
            app_row_rta_coords.append(app_rta_coords_this_row)

    def box_exceeds_max_feature_distances(self, new_bounding_box, app_max_feature_distances):
        if not app_max_feature_distances:
            return False

        if new_bounding_box['width'] > app_max_feature_distances[0]:
            if self.debug:
                print('whoops!  new bounding box exceeds max feature width')
            return True
        if new_bounding_box['height'] > app_max_feature_distances[1]:
            if self.debug:
                print('whoops!  new bounding box exceeds max feature height')
            return True
        return False

    def build_new_bounding_box(self, rta, existing_start, existing_end):
        new_start = deepcopy(existing_start)
        new_end = deepcopy(existing_end)
        if rta['start'][0] < existing_start[0]:
            new_start[0] = rta['start'][0]
        if rta['start'][1] < existing_start[1]:
            new_start[1] = rta['start'][1]
        if rta['end'][0] > existing_end[0]:
            new_end[0] = rta['end'][0]
        if rta['end'][1] > existing_end[1]:
            new_end[1] = rta['end'][1]
        width = new_end[0] - new_start[0]
        height = new_end[1] - new_start[1]
        return {
            'start': new_start,
            'end': new_end,
            'width': width,
            'height': height,
        }

    def add_earlier_this_row_matches(self, remaining_app_phrases, rta_coords):
        if self.debug:
            print('adding earlier same row matches')
        current_rta_row = self.sorted_rtas[rta_coords[0]]
        last_rta_col_claimed = rta_coords[1]
        app_row_score = []
        app_row_rta_coords = []
        for app_col_number, app_phrase in enumerate(reversed(remaining_app_phrases)):
            if self.debug:
                print('--new app field {}'.format(app_phrase))
            match_found = False
            for rta_col_number, rta in enumerate(reversed(current_rta_row)):
                true_rta_col_number = len(current_rta_row) - rta_col_number - 1
                if true_rta_col_number >= last_rta_col_claimed:
                    continue
                if match_found:
                    continue
                if self.debug:
                    print('  {}---{} at rta col {}'.format(app_phrase, rta['text'], true_rta_col_number))
                if app_phrase in self.match_cache[rta['text']]:
                    ratio = self.match_cache[rta['text']][app_phrase]['ratio']
                else:
                    if rta['text'] not in self.match_cache:
                        self.match_cache[rta['text']] = {}
                    ratio = fuzz.ratio(rta['text'], app_phrase)
                    self.match_cache[rta['text']][app_phrase] = {
                        'ratio': ratio,
                        'app_locations': [],
                    }
                if ratio > self.match_threshold:
                    if self.debug:
                        print('adding match for APP {}-{}, RTA {}-{}  score {}'.format(
                            app_phrase, app_col_number, rta['text'], true_rta_col_number, ratio))
                        app_row_score.append(ratio)
                        app_row_rta_coords.append([rta_coords[0], true_rta_col_number])
                last_rta_col_claimed = true_rta_col_number
                match_found = True
            if not match_found:
                app_row_score.append(0)
                app_row_rta_coords.append((0, 0))
        return_row_scores = list(reversed(app_row_score))
        return_row_rta_coords = list(reversed(app_row_rta_coords))
        return (return_row_scores, return_row_rta_coords)

    def add_later_this_row_matches(self, remaining_app_phrases, rta_coords):
        if self.debug:
            print('adding later same row matches')
        current_rta_row = self.sorted_rtas[rta_coords[0]]
        last_rta_col_claimed = rta_coords[1]
        app_row_score = []
        app_row_rta_coords = []
        for app_col_number, app_phrase in enumerate(remaining_app_phrases):
            if self.debug:
                print('--new app field {}'.format(app_phrase))
            match_found = False
            for rta_col_number, rta in enumerate(current_rta_row):
                if rta_col_number <= last_rta_col_claimed:
                    continue
                if match_found:
                    continue
                if self.debug:
                    print('  {}---{} at rta col {}'.format(app_phrase, rta['text'], rta_col_number))
                if rta['text'] in self.match_cache and app_phrase in self.match_cache[rta['text']]:
                    ratio = self.match_cache[rta['text']][app_phrase]['ratio']
                else:
                    if rta['text'] not in self.match_cache:
                        self.match_cache[rta['text']] = {}
                    ratio = fuzz.ratio(rta['text'], app_phrase)
                    self.match_cache[rta['text']][app_phrase] = {
                        'ratio': ratio,
                        'app_locations': [],
                    }
                if ratio > self.match_threshold:
                    if self.debug:
                        print('adding match for APP {}-{}, RTA {}-{}  score {}'.format(
                            app_phrase, app_col_number, rta['text'], rta_col_number, ratio))
                        app_row_score.append(ratio)
                        app_row_rta_coords.append([rta_coords[0], rta_col_number]) 
                last_rta_col_claimed = rta_col_number
                match_found = True
            if not match_found:
                app_row_score.append(0)
                app_row_rta_coords.append((0, 0))
        return (app_row_score, app_row_rta_coords)

    def add_above_matches(
            self, 
            app_row_scores, 
            app_row_rta_coords, 
            window_start, 
            window_end, 
            rta_coords, 
            app_coords, 
            app_phrases,
            app_max_feature_distances
        ):
        ###### add scores for rows below this point
        if self.debug:
            print('adding above matches')
        current_app_row = app_coords[0]
        current_rta_row = rta_coords[0]
        last_rta_row_claimed = rta_coords[0]
        last_rta_col_claimed = rta_coords[1]
        build_app_row_scores = []
        build_app_rta_coords = []
        # for app rows from current_app_row to the end of the app_phrases:
        for i in range(current_app_row-1, 0, -1):
            app_row_score = []
            app_rta_coords = []
            app_row = app_phrases[i]
        #     for app_item in this app row:
            if self.debug:
                print('-new app row: {}'.format(app_row))
            for app_col_number, app_row_text in enumerate(reversed(app_row)):
                app_row_text_matched = False
                if self.debug:
                    print('--new app field {}'.format(app_row_text))
        #         for rta rows from last_claimed_rta_row to the end of self.sorted_rtas:
                for j in range(current_rta_row-1, 0, -1):
                    if app_row_text_matched:
                        continue
                    rta_row = self.sorted_rtas[j]
        #             for unclaimed rta_items in this rta row:
                    for rta_number, rta in enumerate(reversed(rta_row)):
                        true_rta_col_number = len(rta_row) - rta_number - 1
                        if j > last_rta_row_claimed:
                            continue
                        if true_rta_col_number >= last_rta_col_claimed and j == last_rta_row_claimed:
                            continue
                        if app_row_text_matched:
                            continue
                        if self.debug:
                            print('  {}---{} at rta loc {},{}'.format(app_row_text, rta['text'], true_rta_col_number, j))
                        if rta['text'] not in self.match_cache:
                            self.match_cache[rta['text']] = {}
                        if app_row_text in self.match_cache[rta['text']]:
                            ratio = self.match_cache[rta['text']][app_row_text]['ratio']
                        else:
                            if rta['text'] not in self.match_cache:
                                self.match_cache[rta['text']] = {}
                            ratio = fuzz.ratio(rta['text'], app_row_text)
                            self.match_cache[rta['text']][app_row_text] = {
                                'ratio': ratio,
                                'app_locations': [],
                            }
        #                 if the match exceeds the threshold:
        #                     add match score to the total
        #                     last claimed rta row and column = current rta row/col
                        if ratio > self.match_threshold:
                            new_bounding_box = self.build_new_bounding_box(rta, window_start, window_end)
                            if self.box_exceeds_max_feature_distances(new_bounding_box, app_max_feature_distances):
                                continue
                            if self.debug:
                                print('adding match for APP {}-{},{}, RTA {}-{},{}  score {}'.format(
                                    app_row_text, i, app_col_number, rta['text'], true_rta_col_number, j, ratio))
                            app_row_score.append(ratio)
                            app_rta_coords.append(
                                (j, true_rta_col_number)
                            )
                            app_row_text_matched = True
                            last_rta_row_claimed = j
                            last_rta_col_claimed = true_rta_col_number
                            if rta['start'][0] < window_start[0]:
                                window_start[0] = rta['start'][0]
                            if rta['start'][1] < window_start[1]:
                                window_start[1] = rta['start'][1]
                            if rta['end'][0] > window_end[0]:
                                window_end[0] = rta['end'][0]
                            if rta['end'][1] > window_end[1]:
                                window_end[1] = rta['end'][1]
                            continue
                if not app_row_text_matched:
                    app_row_score.append(0)
                    app_rta_coords.append((0, 0))
            build_app_row_scores.append(app_row_score)
            build_app_rta_coords.append(app_rta_coords)

        for ars in reversed(build_app_row_scores):
            reversed_ars_columns = []
            for ars_column in reversed(ars):
                reversed_ars_columns.append(ars_column)
            app_row_scores.append(reversed_ars_columns)
        for arc in reversed(build_app_rta_coords):
            reversed_arc_columns = []
            for arc_column in reversed(arc):
                reversed_arc_columns.append(arc_column)
            app_row_rta_coords.append(reversed_arc_columns)

    def score_rta_point_and_app_phrase_point(self, rta_coords, app_coords, app_phrases, app_max_feature_distances):
        primary_rta = self.sorted_rtas[rta_coords[0]][rta_coords[1]]
        rta_text = primary_rta['text']
        window_start = list(primary_rta['start'])
        window_end = list(primary_rta['end'])
        app_text = app_phrases[app_coords[0]][app_coords[1]]
        if self.debug:
            print('matching the rest of the protein for RTA: {}-{} APP {}-{}'.format(rta_text, rta_coords, app_text, app_coords))
        # add the rta and app point score
        primary_score = self.match_cache[rta_text][app_text]['ratio']

        app_row_scores = []
        app_row_rta_coords= []
        self.add_above_matches(
            app_row_scores, 
            app_row_rta_coords,
            window_start, 
            window_end, 
            rta_coords, 
            app_coords, 
            app_phrases,
            app_max_feature_distances
        )

        scores_before = []
        rta_coords_before = []
        scores_after = []
        rta_coords_after = []
        if app_coords[1] > 0:
          remaining_app_phrases = app_phrases[app_coords[0]][0:app_coords[1]]
          if self.debug:
              print('remaining phrases: {}'.format(remaining_app_phrases))
          (scores_before, rta_coords_before) = self.add_earlier_this_row_matches(remaining_app_phrases, rta_coords)
        app_phrases_row_length = len(app_phrases[app_coords[0]])
        if app_coords[1] < app_phrases_row_length - 1:
          remaining_app_phrases = app_phrases[app_coords[0]][app_coords[1]+1:]
          (scores_after, rta_coords_after) = self.add_later_this_row_matches(remaining_app_phrases, rta_coords)

        this_rows_scores = scores_before + [primary_score] + scores_after
        this_rows_rta_coords = rta_coords_before + [rta_coords] + rta_coords_after
        app_row_scores.append(this_rows_scores)
        app_row_rta_coords.append(this_rows_rta_coords)
        self.add_below_matches(
            app_row_scores, 
            app_row_rta_coords,
            window_start, 
            window_end, 
            rta_coords, 
            app_coords, 
            app_phrases,
            app_max_feature_distances
        )
        app_row_scores_primary_coords = [0, 0]
        app_row_scores_primary_coords[0] = len(app_row_scores)
        app_row_scores_primary_coords[1] = len(scores_before)

        total_score = 0
        for row in app_row_scores:
            for score in row:
                total_score += score


        if self.debug:
            print('total score {}'.format(total_score))
            print('app row scores {}'.format(app_row_scores))
            print('bounding box {} {}'.format(window_start, window_end))


        app_home_text = app_phrases[app_coords[0]][app_coords[1]]
        return_obj = {
            'total_score': total_score,
            'app_row_scores': app_row_scores,
            'app_row_rta_coords': app_row_rta_coords,
            'window_start': window_start,
            'window_end': window_end,
            'app_home_coords': app_coords,
            'app_home_text': app_home_text,
            'app_row_scores_primary_coords': app_row_scores_primary_coords,
        }
        return return_obj

    def analyze_one_rta_row_field_vs_one_app(self, app_phrases, app_max_feature_distances, rta_row_number, rta_col_number):
        return_data = {}
        rta_text = self.sorted_rtas[rta_row_number][rta_col_number]['text']
        if rta_text not in self.match_cache:
            self.match_cache[rta_text] = {}
        if self.debug:
            print('---comparing app phrases for rta *{}* at row {} col {}'.format(rta_text, rta_row_number, rta_col_number))
#        compare the rta text at row and col to every phrase in app_phrases,
#            (this will be the strongest base pair match for the protein)
        for row_number, phrase_row in enumerate(app_phrases):
            for col_number, app_phrase in enumerate(phrase_row):
                if app_phrase in self.match_cache[rta_text]:
                    self.match_cache[rta_text][app_phrase]['app_locations'].append((row_number, col_number))
                else:
                    ratio = fuzz.ratio(rta_text, app_phrase)
                    self.match_cache[rta_text][app_phrase] = {
                        'ratio': ratio,
                        'app_locations': [(row_number, col_number)],
                    }
        app_phrase_matches = {}
#        if any scores are better than match_threshold, save them in app_phrase_matches[phrase]
        for app_phrase in self.match_cache[rta_text]:
            if self.match_cache[rta_text][app_phrase]['ratio'] > self.match_threshold:
                app_phrase_matches[app_phrase] = self.match_cache[rta_text][app_phrase]
        if not app_phrase_matches:
            return 
        if self.debug:
            print('app phrase matches from lev distance: {}'.format(app_phrase_matches))

#       evaluate all matched app phrases to get a base pair match score and stats
        rta_phrase_matches = {}
        for app_phrase in app_phrase_matches:
            matched_app_phrase_data = app_phrase_matches[app_phrase]
            scores_for_this_phrase = {}
            for location_number, app_phrase_coords in enumerate(matched_app_phrase_data['app_locations']):
                return_obj = self.score_rta_point_and_app_phrase_point(
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

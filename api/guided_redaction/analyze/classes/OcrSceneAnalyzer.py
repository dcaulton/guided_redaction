from fuzzywuzzy import fuzz


class OcrSceneAnalyzer:

    def __init__(self, recognized_text_areas, app_dictionary, debug=False):
        self.recognized_text_areas = recognized_text_areas
        self.app_dictionary = app_dictionary
        self.sorted_rtas = []
        self.match_cache = {}
        self.debug=debug
        self.match_threshold = 80

    def analyze_scene(self):
        self.sorted_rtas = self.order_recognized_text_areas_by_geometry()

        rta_scores = {}
        for app_name in self.app_dictionary:
            print('considering app {}'.format(app_name))
            rta_scores[app_name] = {}
            app_phrases = self.app_dictionary[app_name]['phrases']
            for rta_row_number, rta_row in enumerate(self.sorted_rtas):
                rta_scores[app_name][rta_row_number] = {}
                for rta_column_number, rta in enumerate(rta_row):
                    scores = self.analyze_one_rta_row_field_vs_one_app(
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

    def add_below_matches(self, app_row_scores, window_start, window_end, rta_coords, app_coords, app_phrases):
        ###### add scores for rows below this point
        print('adding below matches')
        current_app_row = app_coords[0]
        current_rta_row = rta_coords[0]
        last_rta_row_claimed = rta_coords[0]
        last_rta_col_claimed = rta_coords[1]
        # for app rows from current_app_row to the end of the app_phrases:
        for i in range(current_app_row+1, len(app_phrases)):
            app_row_score = []
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
                        print('  {}---{}'.format(app_row_text, rta['text']))
                        if rta['text'] not in self.match_cache:
                            self.match_cache[rta['text']] = {}
                        if app_row_text in self.match_cache[rta['text']]:
                            ratio = self.match_cache[rta['text']][app_row_text]['ratio']
                        else:
                            ratio = fuzz.ratio(rta['text'], app_row_text)
                            self.match_cache[rta['text']][app_row_text] = {
                                'ratio': ratio,
                                'app_locations': [],
                            }
        #                 if the match exceeds the threshold:
        #                     add match score to the total
        #                     last claimed rta row and column = current rta row/col
                        if ratio > self.match_threshold:
                            if self.debug:
                                print('adding match for APP {}-{},{}, RTA {}-{},{}'.format(
                                    app_row_text, i, app_col_number, rta['text'] ,j, rta_number))
                            app_row_score.append(ratio)
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
            app_row_scores.append(app_row_score)


    def score_rta_point_and_app_phrase_point(self, rta_coords, app_coords, app_phrases):
        primary_rta = self.sorted_rtas[rta_coords[0]][rta_coords[1]]
        rta_text = primary_rta['text']
        window_start = list(primary_rta['start'])
        window_end = list(primary_rta['end'])
        app_text = app_phrases[app_coords[0]][app_coords[1]]
        if self.debug:
            print('matching the rest of the protein for RTA: {}-{} APP {}-{}'.format(rta_text, rta_coords, app_text, app_coords))
        # add the rta and app point score
        primary_score = self.match_cache[rta_text][app_text]['ratio']
        # #### TODO add scores for rows above this point
        # #### TODO add scores for items on the rta/app row before this point
        # #### TODO add scores for items on the rta/app row after this point

        app_row_scores = []
        app_row_scores.append([primary_score])
        self.add_below_matches(
            app_row_scores, 
            window_start, 
            window_end, 
            rta_coords, 
            app_coords, 
            app_phrases
        )

        total_score = 0
        for row in app_row_scores:
            for score in row:
                total_score += score


        if self.debug:
            print('total score {}'.format(total_score))
            print('app row scores {}'.format(app_row_scores))
            print('bounding box {} {}'.format(window_start, window_end))


        return_obj = {
            'total_score': total_score,
            'app_row_scores': app_row_scores,
            'window_start': window_start,
            'window_end': window_end,
        }
        return return_obj

    def analyze_one_rta_row_field_vs_one_app(self, app_phrases, rta_row_number, rta_col_number):
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
                        app_phrases
                    )
                scores_for_this_phrase[location_number] = return_obj
        
#            get the highest score for this phrase, save it in rta_phrase_matches               
#            rta_phrase_matches[this_phrase] = {total_match_score, row_scores}


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

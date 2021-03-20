import random
import math
from fuzzywuzzy import fuzz
import cv2
import numpy as np
import imutils
from guided_redaction.analyze.classes.OcrRowColMaker import OcrRowColMaker


class DataSifter:

    def __init__(self, data_sifter_meta, *args, **kwargs):
        super(DataSifter, self).__init__(*args, **kwargs)
        self.data_sifter_meta = data_sifter_meta
        self.debug = data_sifter_meta.get('debug', False)
        self.app_data = self.get_app_data()
        self.ocr_rowcol_maker = OcrRowColMaker()
        self.min_app_score = 200
        self.fuzz_match_threshold = 70
        self.fast_pass_app_score_threshold = 500

    def sift_data(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame, template_results_this_frame):
        self.app_rows, self.app_left_cols, self.app_right_cols = self.build_app_rowcol_data()
        self.all_zones = {}
        self.return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')
        fast_pass = fast_pass_confirmed = slow_pass_confirmed = False
        self.cv2_image = cv2_image

        self.ocr_results_this_frame = self.filter_results_by_t1_bounds(ocr_results_this_frame, other_t1_results_this_frame)
        self.template_results_this_frame = self.filter_results_by_t1_bounds(
            template_results_this_frame, other_t1_results_this_frame
        )
        self.ocr_rows_dict = self.ocr_rowcol_maker.gather_ocr_rows(self.ocr_results_this_frame)
        self.ocr_left_cols_dict, self.ocr_right_cols_dict = self.ocr_rowcol_maker.gather_ocr_cols(self.ocr_results_this_frame)
        self.add_rows_cols_to_response_and_stats('row', self.ocr_rows_dict)
        self.add_rows_cols_to_response_and_stats('left_col', self.ocr_left_cols_dict)
        self.add_rows_cols_to_response_and_stats('right_col', self.ocr_right_cols_dict)

        best_ocr_row_ids, best_ocr_row_score = self.fast_score_rowcol_data('row')
        best_ocr_lcol_ids, best_ocr_lcol_score = self.fast_score_rowcol_data('left_col')
        best_ocr_rcol_ids, best_ocr_rcol_score = self.fast_score_rowcol_data('right_col')
        total_score = best_ocr_lcol_score + best_ocr_rcol_score + best_ocr_row_score
        if total_score >= self.fast_pass_app_score_threshold:
            fast_pass = {
                'row': {'ids': best_ocr_row_ids, 'score': best_ocr_row_score},
                'left_col': {'ids': best_ocr_lcol_ids, 'score': best_ocr_lcol_score},
                'right_col': {'ids': best_ocr_rcol_ids, 'score': best_ocr_rcol_score},
                'total_score': total_score
            }

        if fast_pass:
            if self.debug:
                print('FAST PASS HAS A LEAD ON THE APP - fp match obj is {}'.format(fast_pass))
                self.add_fast_pass_to_results(fast_pass)
            fast_pass_confirmed = self.confirm_fast_pass(fast_pass)
        if not fast_pass_confirmed:
            slow_pass_confirmed = self.slow_pass_for_labels()
        if fast_pass_confirmed or slow_pass_confirmed:
            self.build_match_results(return_mask, fast_pass_confirmed, slow_pass_confirmed)

        self.mask_data(ocr_results_this_frame)

        return self.all_zones, self.return_stats, return_mask

    def mask_data(self, ocr_results_this_frame):
        for ar in self.app_rows:
            for app_row_item in ar:
                app_id = app_row_item['app_id']
                app_element = self.app_data['items'][app_id]
                if app_element.get('mask_this_field') and 'ocr_id' in app_row_item: 
                    # pass the ocr element through as an area to redact+data
                    self.all_zones[app_id] = ocr_results_this_frame[app_row_item['ocr_id']]

    def fast_score_rowcol_data(self, rowcol_type):
        # this takes a set of app and ocr rows, left cols or right cols (let's just talk about rows here, they all act the same)
        # order the ocr rows by ascending measure, ie ascending y
        # for each ocr row:
        #   compare it to each app row.  those are in a fixed order as defined in the app record.
        #   so now you have something like this for each ocr row ['277','','','123']
        #         (where there are 4 app rows, and you scored 277 against the first, and 123 against the last)
        # Now, find the highest scoring fit between all app and ocr row score results.  The rules are that you can't use 
        #   an ocr row twice and later ocr/app rows must come after earlier ocr/app rows
        # Return the final answer of ['422', '', '', '523'], 
        #   (where 422 is the id of the ocr row that matched best against the first app row, and
        #   523 is the id of the ocr row that matched up best against the final app row.  The middle two app rows
        #   did not have any eligible ocr rows that matched well enough to count.
        if rowcol_type == 'row':
            app_rowcols = self.app_rows
            ocr_rowcols_dict = self.ocr_rows_dict
        elif rowcol_type == 'left_col':
            app_rowcols = self.app_left_cols
            ocr_rowcols_dict = self.ocr_left_cols_dict
        elif rowcol_type == 'right_col':
            app_rowcols = self.app_right_cols
            ocr_rowcols_dict = self.ocr_right_cols_dict

        sorted_keys = self.ocr_rowcol_maker.get_sorted_keys_for_ocr_rowcols(rowcol_type, ocr_rowcols_dict)
        self.ocr_rowcol_scores = []
        for ocr_rowcol_id in sorted_keys:
            ocr_rowcol = ocr_rowcols_dict[ocr_rowcol_id]
            app_rowcol_scores = []
            for app_rowcol in app_rowcols:
                app_rowcol_score = self.fast_score_ocr_rowcol_to_app_rowcol(app_rowcol, ocr_rowcol)
                app_rowcol_scores.append(app_rowcol_score)
            self.ocr_rowcol_scores.append(app_rowcol_scores)

        best_ocr_offsets, best_ocr_rowcol_score = self.scan_best_scores()

        best_ocr_rowcol_ids = []
        for app_rowcol_offset, x in enumerate(best_ocr_offsets):
            if x == -1:
                best_ocr_rowcol_ids.append('')
                continue
            rowcol_score = self.ocr_rowcol_scores[x][app_rowcol_offset]
            if rowcol_score > 0:
                best_ocr_rowcol_ids.append(sorted_keys[x])
            else:
                best_ocr_rowcol_ids.append('')

        return best_ocr_rowcol_ids, best_ocr_rowcol_score

    def confirm_fast_pass(self, fast_pass_match_obj):
        # first, do a complete match on all fields in each rowcol that fastpass picked up on, 
        #   this time, store ocr match_ids in the respective objects in app_rows, app_left_cols, app_right_cols
        self.slow_score_all_of_one_type_of_rowcol(fast_pass_match_obj, 'row')
        self.slow_score_all_of_one_type_of_rowcol(fast_pass_match_obj, 'left_col')
        self.slow_score_all_of_one_type_of_rowcol(fast_pass_match_obj, 'right_col')

        # disqualify 'fast pass matched' rows on geometry
        #   for each fast pass row, l col, r col, guess the origin location based on each matched ocr element and app ref coords
        #   use the spacing between two recognized rows to get a sense of scale compared to app ref coords
        #   some features should be designed as landmarks, things that scale in a predictable way, e.g. certain row heights 
        #   if there is a big consensus, fire any dissenters
        # enforce rowcol rules, like you'll only see 'credit card details' OR 'checking details', never both

        # if we matched on an item in some column and it's in a row that was not matched, add it as a match for that row.
        #   same for if it's in a row and the col didn't get picked up.
        found_app_ids = {}
        self.get_ids_for_one_rowcol_type(found_app_ids, 'row')
        self.get_ids_for_one_rowcol_type(found_app_ids, 'left_col')
        self.get_ids_for_one_rowcol_type(found_app_ids, 'right_col')
        self.insert_ids_for_one_rowcol_type(found_app_ids, 'row')
        self.insert_ids_for_one_rowcol_type(found_app_ids, 'left_col')
        self.insert_ids_for_one_rowcol_type(found_app_ids, 'right_col')

        # for user fields, see if there are any adjacent, unclaimed ocr regions.  If so, absorb them in the user area
        #  this is because ocr can sometimes split a single word into a couple ones.

        # gather size info for ocr objects (get title sizes, standard text sizes, etc as defined in the spec)
        # gather background color near some of the labels (as specified in the app spec)
        # look for conflicts in fast_pass_match_obj, rule out rows/cols which break things
        # look for app rows/cols that had no match with an ocr row, see if any unmatched ocr rows now look better, 
        #     considering things like app, reference coords, below threshold matches due to ocr splitting a word up 
        #     into multiples, and user data rules
        # use contours to automatically detect template like things?  
        #     *if we mask off just this row on cv2_image it should be fast and only at one scale
        # match against remaining fields that were missed in fast_pass_match_obj (e.g. variable data, templates)
        # use logic shared with selection grower to find color fields and lines
        # use color fields, lines and matched colors to establish app 'sections'
        # for each section, identify any subfields
        print('confirmed rows {}'.format(self.app_rows))
        print('confirmed left cols {}'.format(self.app_left_cols))
        print('confirmed right cols {}'.format(self.app_right_cols))

    def get_ids_for_one_rowcol_type(self, found_app_ids, rowcol_type):
        app_rowcols = []
        if rowcol_type == 'row':
            app_rowcols = self.app_rows
        elif rowcol_type == 'left_col':
            app_rowcols = self.app_left_cols
        elif rowcol_type == 'right_col':
            app_rowcols = self.app_right_cols

        for app_rowcol in app_rowcols:
            for rowcol_ele in app_rowcol:
                if 'ocr_id' in rowcol_ele:
                    found_app_ids[rowcol_ele['app_id']] = rowcol_ele['ocr_id']

    def insert_ids_for_one_rowcol_type(self, found_app_ids, rowcol_type):
        app_rowcols = []
        if rowcol_type == 'row':
            app_rowcols = self.app_rows
        elif rowcol_type == 'left_col':
            app_rowcols = self.app_left_cols
        elif rowcol_type == 'right_col':
            app_rowcols = self.app_right_cols

        for app_rowcol in app_rowcols:
            for rowcol_ele in app_rowcol:
                if rowcol_ele['app_id'] in found_app_ids and 'ocr_id' not in rowcol_ele:
                    print('FILLING IN A VALUE FOR  {}'.format(rowcol_ele['app_id']))
                    rowcol_ele['ocr_id'] = found_app_ids[rowcol_ele['app_id']]

    def slow_score_all_of_one_type_of_rowcol(self, fast_pass_match_obj, rc_type):
        if not fast_pass_match_obj[rc_type]:
            return
        for app_rowcol_number, ocr_rowcol_id in enumerate(fast_pass_match_obj[rc_type]['ids']):
            if not ocr_rowcol_id:
                continue #  pass it for now.  we will come back for you, little buddy!
            if rc_type == 'row':
                app_rowcol = self.app_rows[app_rowcol_number]
                ocr_rowcol = self.ocr_rows_dict[ocr_rowcol_id]
            elif rc_type == 'left_col':
                app_rowcol = self.app_left_cols[app_rowcol_number]
                ocr_rowcol = self.ocr_left_cols_dict[ocr_rowcol_id]
            elif rc_type == 'right_col':
                app_rowcol = self.app_right_cols[app_rowcol_number]
                ocr_rowcol = self.ocr_right_cols_dict[ocr_rowcol_id]
            self.slow_score_ocr_rowcol_to_app_rowcol(app_rowcol, ocr_rowcol)

    def slow_score_ocr_rowcol_to_app_rowcol(self, app_row, ocr_row):
        base_ocr_col = 0
        for app_row_element in app_row:
            app_item_id = app_row_element['app_id']
            app_element = self.app_data['items'][app_item_id]
            #TODO clear out the ocr_id and found_text first, we want to be able to run this method multiple times
            #  on the same row after findings have been massaged e.g. by geometric data or a match on a related rowcol
            for index, ocr_match_id in enumerate(ocr_row['member_ids'][base_ocr_col:]):
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                if app_element['type'] == 'label':
                    ratio = fuzz.ratio(app_element['text'], ocr_match_ele['text'])
                    if ratio >= self.fuzz_match_threshold:
                        base_ocr_col += index+1
                        app_row_element['ocr_id'] = ocr_match_id
                elif app_element['type'] == 'user_data':
                        if app_element.get('min_width', 0) > ocr_match_ele['size'][0]:
                            continue
                        # a simple greedy algo for first cut, just pass the first element you see
                        #   we will be qualifying these soon by font size, field length
                        base_ocr_col += index+1
                        app_row_element['ocr_id'] = ocr_match_id
                        app_row_element['found_value'] = ocr_match_ele['text'].rstrip()
                        break

    def fast_score_ocr_rowcol_to_app_rowcol(self, app_col, ocr_col):
        total_score = 0
        base_ocr_col = 0
        for app_col_obj in app_col:
            if 'text' not in app_col_obj:
                continue
            app_field_string = app_col_obj['text']
            for index, match_id in enumerate(ocr_col['member_ids'][base_ocr_col:]):
                ocr_phrase = self.ocr_results_this_frame[match_id]['text']
                ratio = fuzz.ratio(app_field_string, ocr_phrase)
                if ratio >= self.fuzz_match_threshold:
                    total_score += ratio
                    base_ocr_col += index+1
                    break
        return total_score

    def scan_best_scores(self, enforce_order=True):
        self.paths = []
        self.print_app_ocr_scores_matrix()
        # if we have no rows or cols, bail
        # if we have one col (so only one app_rowcol defined), build for this col only and bail
        # else we have multi app_rowcols
        self.get_all_paths_forward([], -1, 0) # handle the 'skip first col' case
        for row_number, ocr_score_row in enumerate(self.ocr_rowcol_scores):
            if ocr_score_row and ocr_score_row[0]:
                self.get_all_paths_forward([], row_number, 0) # handle the 'skip first col' case

        self.print_all_paths()

        best_total = 0
        best_path = []
        for one_path in self.paths:
            score = self.get_score_for_path(one_path)
            if score > best_total:
                best_total = score
                best_path = one_path
        
        if self.debug:
            print('-- winners are ========')
            print(best_path)

# below is the naive way we used to solve best scores.  It was broken because it couldn't force ocr cols
#   to be in ascending order, but it's still instructive.  Delete when no longer useful
#       total_score = 0
#       winning_cols = np.argmax(self.ocr_rowcol_scores, 0)
#       for app_col_num, ocr_col_num in enumerate(winning_cols):
#           total_score += self.ocr_rowcol_scores[ocr_col_num][app_col_num]
#       print('-- winners are ========')
#       print(winning_cols)
#       return winning_cols, total_score

        return best_path, best_total
        
    def get_score_for_path(self, path):
        total = 0
        for app_row_num, ocr_row_num in enumerate(path):
            if ocr_row_num != -1:
                total += self.ocr_rowcol_scores[ocr_row_num][app_row_num]
        return total

    def get_all_paths_forward(self, caller_list, this_row_num, this_col_num):
        #  let's say you have 4 app rows defined, and 6 ocr rows detcted with a scores matrix like this 
        #    [0   0   0   117]   so this row reads ocr row 0 scored 0 against app row 0... and 117 against app row 3
        #    [98  0   0   0  ]
        #    [224 0   0   0  ]
        #    [0   85  0   0  ]
        #    [0   0   0   81 ]
        #
        #  we want to boil that matrix down to its possible paths across it.  Here are the rules.  moving left to right 
        #    as you match on a given ocr row, all subsequent app rows can only use higher ocr rows or 'skip ocr row'.  
        #  It's this rule that lets us leverage our knowledge of what rows come before other ones. 
        # 
        #  So if the above score matrix can be cast as the below columns of 'ocr cols we'd like to try', we have 
        #   -1 -1 -1 -1 
        #    1  3     0
        #    2        4
        #  where -1 means dont match this app row against any ocr row
        #              
        # we wish to come up with a list of left-to-right traversals of those ocr cols, so we want this, 
        #   where -1 means match that app row against none of the ocr rows
        # -1 -1 -1 -1
        # -1 -1 -1  0
        # -1 -1 -1  4
        # -1  3 -1 -1
        # -1  3 -1  0
        # -1  3 -1  4
        # then these same rows repeated with a first col value of 1 and then 2
        #
        # after we have these traversals, it's a simple matter to use them to determine the maximum valued traversal
        #   across a scores matrix that will normally be very sparse (so n**2 approaches would be much too wasteful)

        new_list = [*caller_list, this_row_num]
        if this_col_num >= (len(self.ocr_rowcol_scores[0])-1):    # we're in the final column
            self.paths.append(new_list)
            return
        next_col_num = this_col_num+1
        self.get_all_paths_forward(new_list, -1, next_col_num)
        if caller_list:
            start_row = max(caller_list) + 1 # have to do this because prev might be -1 ie skipped
        else:
            start_row = 0
        for next_row_num in range(start_row, len(self.ocr_rowcol_scores)):
            if self.ocr_rowcol_scores[next_row_num][next_col_num] > 0:
                self.get_all_paths_forward(new_list, next_row_num, next_col_num)

    def print_app_ocr_scores_matrix(self):
        if self.debug:
            print('== APP OCR SCORES MATRIX')
            [print(rc) for rc in self.ocr_rowcol_scores]

    def print_all_paths(self):
        if self.debug:
            print('== ALL LEGAL PATHS THROUGH APP OCR SCORES MATRIX')
            for one_path in self.paths:
                total = 0
                score = self.get_score_for_path(one_path)
                print('one path is {} score is {}'.format(one_path, score))
                for app_col_num, ocr_col_num in enumerate(one_path):
                    if ocr_col_num != -1:
                        total += self.ocr_rowcol_scores[ocr_col_num][app_col_num]

    def add_rows_cols_to_response_and_stats(self, row_col_type, existing_classes):
        build_classes = {}
        for row_class_id in existing_classes:
            build_classes[row_class_id] = {
                'start': existing_classes[row_class_id]['start'], 
                'end': existing_classes[row_class_id]['end'], 
                'row_column_type': row_col_type,
                'ocr_member_ids': existing_classes[row_class_id]['member_ids'],
            }
            if self.debug:
                self.add_zone_to_response(
                    existing_classes[row_class_id]['start'], 
                    existing_classes[row_class_id]['end'],
                    existing_classes[row_class_id]['member_ids'],
                    row_col_type,
                )

        group_name = row_col_type + 's'
        self.return_stats[group_name] = build_classes

    def point_is_in_t1_region(self, coords, t1_match_obj):
        start, end = self.get_match_obj_start_end(t1_match_obj)
        if start and end:
            if coords[0] >= start[0] and coords[0] <= end[0] and\
                coords[1] >= start[1] and coords[1] <= end[1]:
                return True
            return False
        return True

    def get_match_obj_start_end(self, match_obj):
        if 'start' in match_obj:
            start = match_obj['start']
        if 'location' in match_obj:
            start = match_obj['location']
        if 'end' in match_obj:
            end = match_obj['end']
        if 'size' in match_obj:
            end = [
                match_obj['location'][0] + match_obj['size'][0],
                match_obj['location'][1] + match_obj['size'][1]
            ]
        return start, end

    def slow_pass_for_labels(self):
        pass

    def build_match_results(self, return_mask, fast_pass_confirmed, slow_pass_confirmed):
        pass

    def add_zone_to_response(self, zone_start, zone_end, ocr_member_ids=None, row_col_type=None):
        new_id = str(random.randint(1, 999999999))
        new_size = [
            zone_end[0] - zone_start[0],
            zone_end[1] - zone_start[1]
        ]
        one_zone = {
            'id': new_id, 
            'location': zone_start,
            'size': new_size,
            'scale': 1,
            'scanner_type': 'data_sifter',
        }
        if ocr_member_ids:
            one_zone['ocr_member_ids'] = ocr_member_ids
        if row_col_type:
            one_zone['row_column_type'] = row_col_type
        self.all_zones[one_zone['id']] = one_zone

    def build_app_rowcol_data(self):
        app_rows = []
        for row in self.app_data['rows']:
            app_row = []
            for item_id in row:
                build_obj = {
                    'app_id': item_id,
                }
                if self.app_data['items'][item_id]['type'] == 'label':
                    build_obj['text'] = self.app_data['items'][item_id]['text']
                app_row.append(build_obj)
            app_rows.append(app_row)

        app_left_cols = []
        for col in self.app_data['left_cols']:
            app_col = []
            for item_id in col:
                build_obj = {
                    'app_id': item_id,
                }
                if self.app_data['items'][item_id]['type'] == 'label':
                    build_obj['text'] = self.app_data['items'][item_id]['text']
                app_col.append(build_obj)
            app_left_cols.append(app_col)

        app_right_cols = []
        for col in self.app_data['right_cols']:
            app_col = []
            for item_id in col:
                build_obj = {
                    'app_id': item_id,
                }
                if self.app_data['items'][item_id]['type'] == 'label':
                    build_obj['text'] = self.app_data['items'][item_id]['text']
                app_col.append(build_obj)
            app_right_cols.append(app_col)

        return app_rows, app_left_cols, app_right_cols

    def filter_results_by_t1_bounds(self, ocr_results_this_frame, other_t1_results_this_frame):
        if other_t1_results_this_frame:
            build_ocr_results = {}
            for t1_match_id in other_t1_results_this_frame:
                t1_ele = other_t1_results_this_frame[t1_match_id]
                for ocr_ele_id in ocr_results_this_frame:
                    ocr_ele = ocr_results_this_frame[ocr_ele_id]
                    ocr_coords = ocr_ele.get('start')
                    if 'location' in ocr_ele:
                        ocr_coords = ocr_ele['location']
                        if self.point_is_in_t1_region(ocr_coords, t1_ele):
                            if ocr_ele_id not in build_ocr_results:
                                build_ocr_results[ocr_ele_id] = ocr_ele

            return build_ocr_results
        return ocr_results_this_frame

    def add_fast_pass_to_results(self, fast_pass_obj):
        if not self.debug:
            return
        for row_id in fast_pass_obj['row']['ids']:
            if not row_id: 
                continue  # that means no ocr row matched the app row in that position
            ocr_row = self.ocr_rows_dict[row_id]
            for ocr_match_id in ocr_row['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords, [], 'fast_pass_anchor')

        for col_id in fast_pass_obj['left_col']['ids']:
            if not col_id: 
                continue  # that means no ocr col matched the app col in that position
            ocr_col = self.ocr_left_cols_dict[col_id]
            for ocr_match_id in ocr_col['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords, [], 'fast_pass_anchor')

        for col_id in fast_pass_obj['right_col']['ids']:
            if not col_id: 
                continue  # that means no ocr col matched the app col in that position
            ocr_col = self.ocr_right_cols_dict[col_id]
            for ocr_match_id in ocr_col['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords, [], 'fast_pass_anchor')

    def get_app_data(self):
        return self.data_sifter_meta
#   ITEM FIELDS:
# type
# text
# field name label   *so we can refer to it in other rules, across other apps even, so not just key in this app
# text size label
# background color label
# text color label
# column_align_left_right
# always present
# can have dropdown?   *probably not, labels don't, almost any variable text does
# mask this field
# is pii
# is pci
# ref location   * if it's on its own row, col this becomes very important
# ref size    * if it's on its own row, col this becomes very important
# allowed_values
# regex
# fuzzy_match_threshold  # would allow some nice customization for fields that never seem to come in cleanly with ocr

#  OTHER TOP LEVEL OBJECTS
# sections - it lets us nest things
# shapes - stuff like gutters and fields of color, build a shared logic from what is used in selection grower
# anchors?  I'd like to hold base64 strings apart from the primary data structure, better for eyeballing output
# landmarks - like a star chart, a few of these can orient you in the form, even if they scale
# rowcol_rules.  things like you'll only see app rows 6,7,8 or 9,10,11 but never items from BOTH at the same time
#        build_obj = {
#            'rows': [
#                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 
#                ['b1'],
#                ['x1'],
#                ['d1', 'e1', 'c1', 'f1'],
#                ['c3', 'f2'],
#                ['c4', 'm1a'],
#                ['c5', 'm1b'],
#                ['c6', 'm1c'],
#                ['c7', 'm1d', 'f3'],
#            ],
#            'left_cols': [
#                ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
#                ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
#                ['e1', 'e2'],
#                ['f1', 'f2', 'f3'],
#            ],
#            'right_cols': [],
#            'items': {
#                'a1': {
#                    'type': 'label',
#                    'text': 'Details',
#                },
#                'a2': {
#                    'type': 'label',
#                    'text': 'System',
#                },
#                'a3': {
#                    'type': 'label',
#                    'text': 'User',
#                },
#                'a4': {
#                    'type': 'label',
#                    'text': 'Offers',
#                },
#                'a5': {
#                    'type': 'label',
#                    'text': 'Beta',
#                },
#                'a6': {
#                    'type': 'label',
#                    'text': 'Subscriptions',
#                },
#                'b1': {
#                    'type': 'label',
#                    'text': 'Contact Information',
#                },
#                'c1': {
#                    'type': 'label',
#                    'text': 'Email',
#                },
#                'c2': {
#                    'type': 'label',
#                    'text': 'Preferred Contact Method',
#                },
#                'c3': {
#                    'type': 'label',
#                    'text': 'Preferred Language',
#                },
#                'c4': {
#                    'type': 'label',
#                    'text': 'Mobile',
#                },
#                'c5': {
#                    'type': 'label',
#                    'text': 'Work Phone',
#                },
#                'c6': {
#                    'type': 'label',
#                    'text': 'Home Phone',
#                },
#                'c7': {
#                    'type': 'label',
#                    'text': 'Other Phone',
#                },
#                'd1': {
#                    'type': 'label',
#                    'text': 'Name',
#                },
#                'd2': {
#                    'type': 'label',
#                    'text': 'Sonos ID',
#                },
#                'd3': {
#                    'type': 'label',
#                    'text': 'Email Opt Out',
#                },
#                'd4': {
#                    'type': 'label',
#                    'text': 'Survey Opt Out',
#                },
#                'd5': {
#                    'type': 'label',
#                    'text': 'In app Messaging Opt Out',
#                },
#                'd6': {
#                    'type': 'label',
#                    'text': 'Address',
#                },
#                'd7': {
#                    'type': 'label',
#                    'text': 'User Type',
#                },
#                'd8': {
#                    'type': 'label',
#                    'text': 'Lead Source',
#                },
#                'e1': {
#                    'type': 'user_data',
#                    'field_name_label': 'full_name',
#                    'mask_this_field': True,
#                    'is_pii': True,
#                    'data_type': 'string',
#                    'min_width': 50,
#                },
#                'e2': {
#                    'type': 'user_data',
#                    'field_name_label': 'sonos_id',
#                    'mask_this_field': True,
#                    'is_pii': True,
#                    'data_type': 'int',
#                    'min_width': 50,
#                },
#                'f1': {
#                    'type': 'user_data',
#                    'field_name_label': 'email',
#                    'mask_this_field': True,
#                    'is_pii': True,
#                    'data_type': 'string',
#                    'min_width': 50,
#                },
#                'f2': {
#                    'type': 'user_data',
#                    'field_name_label': 'preferred_lang',
#                    'mask_this_field': False,
#                    'is_pii': False,
#                    'data_type': 'string',
#                },
#                'f3': {
#                    'type': 'user_data',
#                    'field_name_label': 'other_phone',
#                    'mask_this_field': True,
#                    'is_pii': True,
#                    'data_type': 'phone',
#                    'min_width': 50,
#                },
#                'm1a': {
#                    'type': 'template_anchor',
#                    'anchor_id': 'anchor_590897819',
#                    'name': 'eyeball',
#                },
#                'm1b': {
#                    'type': 'template_anchor',
#                    'anchor_id': 'anchor_590897819',
#                    'name': 'eyeball',
#                },
#                'm1c': {
#                    'type': 'template_anchor',
#                    'anchor_id': 'anchor_590897819',
#                    'name': 'eyeball',
#                },
#                'm1d': {
#                    'type': 'template_anchor',
#                    'anchor_id': 'anchor_590897819',
#                    'name': 'eyeball',
#                },
#                'm2a': {
#                    'type': 'template_anchor',
#                    'anchor_id': 'anchor_46051205',
#                    'name': 'pencil',
#                },
#                'x1': {
#                    'type': 'label',
#                    'text': 'total nonsense should not match',
#                },
#            }
#        }
#        return build_obj



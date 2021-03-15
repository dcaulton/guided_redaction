import random
import math
from fuzzywuzzy import fuzz
import cv2
import numpy as np
import imutils


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = mesh_match_meta.get('debug', False)
        self.app_data = self.get_app_data()
        self.min_vertical_overlap_pixels = 5
        self.max_column_misalign_pixels = 5
        self.min_row_horizontal_overlap_pixels = 1000
        self.min_app_score = 200
        self.fuzz_match_threshold = 70
        self.fast_pass_app_score_threshold = 500

    def sift_data(self, cv2_image, ocr_results_this_frame, other_t1_results_this_frame):
        self.app_rows, self.app_left_cols, self.app_right_cols = self.build_app_rowcol_data()
        self.all_zones = {}
        self.return_stats = {}
        return_mask = np.zeros((20, 20, 1), 'uint8')
        fast_pass = fast_pass_confirmed = slow_pass_confirmed = False
        self.cv2_image = cv2_image

        self.ocr_results_this_frame = self.filter_results_by_t1_bounds(ocr_results_this_frame, other_t1_results_this_frame)
        self.ocr_rows_dict = self.gather_ocr_rows()
        self.ocr_left_cols_dict, self.ocr_right_cols_dict = self.gather_ocr_cols()

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
            print('FAST PASS HAS A LEAD ON THE APP - fp match obj is {}'.format(fast_pass))
            # this is for debugging, we normally want to return the labels and positive rows/cols as stats, not t1 output
            self.add_fast_pass_to_results(fast_pass)
            fast_pass_confirmed = self.confirm_fast_pass(fast_pass)
        if not fast_pass_confirmed:
            slow_pass_confirmed = self.slow_pass_for_labels()
        if fast_pass_confirmed or slow_pass_confirmed:
            self.build_match_results(return_mask, fast_pass_confirmed, slow_pass_confirmed)

        return self.all_zones, self.return_stats, return_mask

    def fast_score_rowcol_data(self, rowcol_type):
        # this takes a set of app and ocr rows, left cols or right cols (let's just talk about rows here, they all act the same)
        # order the ocr rows by ascending measure, e.g. ascending y
        # for each ocr row:
        #   compare it to each app row.  those are in a fixed order as defined in the app record.
        #   so now you have something like this for each ocr row ['277','','','123']
        #         (where there are 4 app rows, and you scored 277 against the first, and 123 against the last)
        # when done with all ocr rows,
        #   for each app row, find the ocr row that matched best with it.  note that ocr rows key, or '' if nothing matched 
        # return the final answer of ['422', '', '', '523'], 
        #          (where 422 is the id of the ocr row that matched best against the first app row, and
        #           523 is the id of the ocr row that matched up best against the final app row.  The middle two app rows
        #           did not have anything that matched well enough to count.
        if rowcol_type == 'row':
            app_rowcols = self.app_rows
            ocr_rowcols_dict = self.ocr_rows_dict
        elif rowcol_type == 'left_col':
            app_rowcols = self.app_left_cols
            ocr_rowcols_dict = self.ocr_left_cols_dict
        elif rowcol_type == 'right_col':
            app_rowcols = self.app_right_cols
            ocr_rowcols_dict = self.ocr_right_cols_dict

        sorted_keys = self.get_sorted_keys_for_ocr_rowcols(rowcol_type, ocr_rowcols_dict)
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
        # enforce rowcol rules, like you'll only see these or those


        # if we matched on an item in some column and it's in a row that was not matched, add it as a match for that row.
        #   same for if it's in a row and the col didn't get picked up.
        self.tie_detected_rowcol_elements()

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

    def tie_detected_rowcol_elements(self):
        found_app_ids = {}
        self.get_ids_for_one_rowcol_type(found_app_ids, 'row')
        self.get_ids_for_one_rowcol_type(found_app_ids, 'left_col')
        self.get_ids_for_one_rowcol_type(found_app_ids, 'right_col')

        # TODO use the found ids to insert ocr_id values where they might habe been missed

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
#            print(' - one app row field, {}'.format(app_element))
            for index, ocr_match_id in enumerate(ocr_row['member_ids'][base_ocr_col:]):
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
#                print('  - trying ocr ele {}'.format(ocr_match_ele['text']))
                if app_element['type'] == 'label':
                    ratio = fuzz.ratio(app_element['text'], ocr_match_ele['text'])
                    if ratio >= self.fuzz_match_threshold:
                        base_ocr_col += index+1
#                        print('  - ITS A LABEL MATCH') app_row_element['ocr_id'] = ocr_match_id break
                elif app_element['type'] == 'user_data':
                        # a simple greedy algo for first cut, just pass the first element you see
                        #   we will be qualifying these soon by font size, field length
                        base_ocr_col += index+1
#                        print('  - ITS A USERDATA MATCH')
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
#    step through left col bests by each left col, see if we can find a highest path score
# with 3 app left cols and 7 ocr matches cols it looks like this:
#  ocr col1 [259, 0, 0]
#  ocr col2 [350, 0, 0]
#  ocr col3 [0, 179, 0]
#  ocr col4 [0, 324, 0]
#  ocr col5 [0, 0, 244]
#  ocr col6 [0, 0, 194]
#  ocr col7 [734, 0, 0]
#   if we need to enforce the order. you want to say [2, 4, 5] because it gives us the best overall score across all ocr and app rows
#     also, 4 MUST be higher than 2, and 5 MUST be higher than 4.  these are the order of the columns.
#   if not you want to say [7, 4, 5]  if we know that certain cols can float depending on page size, and order doesn't matter
# 
#
#        only valid combos are:
#        skip/[nonzero scores for col 1 on an index ladder]
#        skip/[nonzero scores for col 2 on an index ladder]
#        skip/[nonzero scores for col 3 on an index ladder]
#        skip/[nonzero scores for col 4 on an index ladder]
#
#        todo: score the legal paths through this:
#        S S S S
#        2 3 1 1
#        5   3 4
#            9
#
#  ** use recursion to get legal options forward from any point
#     e.g. app col 2 = S3. so 2,0=S, 2,1=3  glo(2, 1) = [S, 4], [9, S], [S, S]
#  so, always skip to the end, or [S, S]
#  also, skip+anything higher for the last
#  also, anything higher next plus skips the rest of the way to the end
#
#  self.scores is a 2d array accessed by x, y, so (col_num, row_num)
#  self.paths is where we write the answers in form (1, 2, 6, -1)
#
#  get_all_paths_forward(self, caller_list, this_row_num, this_col_num)
#    new_list = caller_list.append(this_row_num)
#    if this_col_num >= (self.scores[0].length-1):    # we're in the final column
#        self.paths.append(new_list)
#        return
#    get_all_paths_forward(new_list, -1, this_col_num+1)
#    for next_row_num in range(this_row_num+1, num_score_rows):
#        if self.scores[this_row_num+1] > 0:
#            self.get_all_paths_forward(new_list, -1, this_col_num+1)

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
        
        
        total_score = 0
        winning_cols = np.argmax(self.ocr_rowcol_scores, 0)
        for app_col_num, ocr_col_num in enumerate(winning_cols):
            total_score += self.ocr_rowcol_scores[ocr_col_num][app_col_num]
        print('-- winners are ========')
        print(winning_cols)
        return winning_cols, total_score

    def get_score_for_path(self, path):
        total = 0
        for app_row_num, ocr_row_num in enumerate(path):
            if ocr_row_num != -1:
                total += self.ocr_rowcol_scores[ocr_row_num][app_row_num]
        return total

    def get_all_paths_forward(self, caller_list, this_row_num, this_col_num):
        #  let's say you have 4 app rows defined 6 ocr rows detcted and a scores matrix like this 
        #    [0   0   0   117]   so this row reads ocr row 0 scored 0 against app row 1... and 117 against app row 3
        #    [98  0   0   0  ]
        #    [224 0   0   0  ]
        #    [0   85  0   0  ]
        #    [0   0   0   81 ]
        #
        #  we want to boil that matrix down to its possible paths across it.  Here are the rules.  moving left to right 
        #    as you match on a given ocr row, you can only use higher ocr rows or 'skip ocr row'.  It's how we say that rows
        #    are ordered in ascending app order and ascending ocr.  
        #  so if the above score matrix can be cast as the below columns of 'ocr cols we'd like to try':
        #    S S S S
        #    1 3   0
        #    2     4
        #              
        # we wish to come up with a list of left-to-right traversals of those ocr cols, so we want this, 
        #   where -1 means skip that ocr col
        # -1 -1 -1 -1
        # -1 -1 -1 0
        # -1 -1 -1 4
        # -1 3 -1 -1
        # -1 3 -1 0
        # -1 3 -1 4
        # then these same rows repeated with a first col value of 1 and then 2

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
        print('== APP OCR SCORES MATRIX')
        [print(rc) for rc in self.ocr_rowcol_scores]

    def print_all_paths(self):
        print('== ALL LEGAL PATHS THROUGH APP OCR SCORES MATRIX')
        for one_path in self.paths:
            total = 0
            score = self.get_score_for_path(one_path)
            print('one path is {} score is {}'.format(one_path, score))
            for app_col_num, ocr_col_num in enumerate(one_path):
                if ocr_col_num != -1:
                    total += self.ocr_rowcol_scores[ocr_col_num][app_col_num]

    def get_sorted_keys_for_ocr_rowcols(self, group_type, ocr_row_or_col_dict):
        if group_type == 'left_col':
            sorted_keys = sorted(ocr_row_or_col_dict, key=lambda item: ocr_row_or_col_dict[item]['start'][0])
        elif group_type == 'right_col':
            sorted_keys = sorted(
                ocr_row_or_col_dict, 
                key=lambda item: ocr_row_or_col_dict[item]['end'][0]
            )
        elif group_type == 'row':
            sorted_keys = sorted(ocr_row_or_col_dict, key=lambda item: ocr_row_or_col_dict[item]['start'][1])
        return sorted_keys

    def build_new_row_col_element(self, row_col_type, ocr_match_id, ocr_match_obj):
        new_id = str(random.randint(1, 999999999))
        new_start = ocr_match_obj['location']
        new_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        build_obj = {
            'id': new_id,
            'member_ids': [ocr_match_id],
            'start': new_start,
            'end': new_end,
            'row_column_type': row_col_type,
        }
        return build_obj

    def gather_ocr_cols(self):
        left_cols = {}
        right_cols = {}
        sorted_ocr_keys = self.ocr_results_this_frame.keys()

        sorted_ocr_keys = sorted(self.ocr_results_this_frame, key=lambda item: self.ocr_results_this_frame[item]['location'][1])

        for match_id in sorted_ocr_keys:
            ocr_match_obj = self.ocr_results_this_frame[match_id]
            closest_left_col_id = None
            closest_right_col_id = None
            for class_id in left_cols:
                left_col = left_cols[class_id]
                if self.is_close_enough(ocr_match_obj, left_col, 'left_col'):
                    closest_left_col_id = class_id
            for class_id in right_cols:
                right_col = right_cols[class_id]
                if self.is_close_enough(ocr_match_obj, right_col, 'right_col'):
                    closest_right_col_id = class_id

            if closest_left_col_id:
                left_col = left_cols[closest_left_col_id]
                self.grow_object_to_accomodate(left_col, ocr_match_obj)
                left_col['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('left_col', match_id, ocr_match_obj)
                left_cols[new_element['id']] = new_element

            if closest_right_col_id:
                right_col = right_cols[closest_right_col_id]
                self.grow_object_to_accomodate(right_col, ocr_match_obj)
                right_col['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('right_col', match_id, ocr_match_obj)
                right_cols[new_element['id']] = new_element

        self.add_rows_cols_to_response_and_stats('left_col', left_cols)
        self.add_rows_cols_to_response_and_stats('right_col', right_cols)

        return left_cols, right_cols

    def gather_ocr_rows(self):
        rows = {}
        sorted_ocr_keys = self.ocr_results_this_frame.keys()

        sorted_ocr_keys = sorted(self.ocr_results_this_frame, key=lambda item: self.ocr_results_this_frame[item]['location'][0])

        for match_id in sorted_ocr_keys:
            match_obj = self.ocr_results_this_frame[match_id]
            closest_class_id = None
            for class_id in rows:
                row = rows[class_id]
                if self.is_close_enough(match_obj, row, 'row'):
                    closest_class_id = class_id
            if closest_class_id:
                row = rows[closest_class_id]
                self.grow_object_to_accomodate(row, match_obj)
                row['member_ids'].append(match_id)
            else:
                new_element = self.build_new_row_col_element('row', match_id, match_obj)
                rows[new_element['id']] = new_element

        self.add_rows_cols_to_response_and_stats('row', rows)

        return rows

    def add_rows_cols_to_response_and_stats(self, row_col_type, existing_classes):
        build_classes = {}
        for row_class_id in existing_classes:
            build_classes[row_class_id] = {
                'start': existing_classes[row_class_id]['start'], 
                'end': existing_classes[row_class_id]['end'], 
                'ocr_member_ids': existing_classes[row_class_id]['member_ids'],
                'row_column_type': row_col_type,
            }
            if self.debug:
                self.add_zone_to_response(
                    existing_classes[row_class_id]['start'], 
                    existing_classes[row_class_id]['end'],
                    existing_classes[row_class_id]['member_ids'],
                    row_col_type,
                )

        group_name = 'undefined_35a4'
        if row_col_type == 'row': 
            group_name = 'rows'
        elif row_col_type == 'right_col': 
            group_name = 'right_columns'
        elif row_col_type == 'left_col': 
            group_name = 'left_columns'
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

    def grow_object_to_accomodate(self, match_object, new_ocr_obj):
        new_obj_start = new_ocr_obj['location']
        new_obj_end = [
            new_ocr_obj['location'][0] + new_ocr_obj['size'][0],
            new_ocr_obj['location'][1] + new_ocr_obj['size'][1]
        ]
        if 'start' not in match_object:
            print('PROBLEM, were getting weird envelope vars')
        if new_obj_start[0] < match_object['start'][0]:
            match_object['start'][0] = new_obj_start[0]
        if new_obj_start[1] < match_object['start'][1]:
            match_object['start'][1] = new_obj_start[1]
        if new_obj_end[0] > match_object['end'][0]:
            match_object['end'][0] = new_obj_end[0]
        if new_obj_end[1] > match_object['end'][1]:
            match_object['end'][1] = new_obj_end[1]
        return match_object

    def is_close_enough(self, ocr_match_obj, envelope, group_type='row'):
        ocr_start = ocr_match_obj['location']
        ocr_end = [
            ocr_match_obj['location'][0] + ocr_match_obj['size'][0],
            ocr_match_obj['location'][1] + ocr_match_obj['size'][1]
        ]
        if group_type == 'row':
            x_difference = self.get_axis_difference(ocr_start, ocr_end, envelope['start'], envelope['end'], 'x')
            y_overlap = self.get_vertical_overlap(ocr_start, ocr_end, envelope['start'], envelope['end'])
            if y_overlap < self.min_vertical_overlap_pixels or \
                x_difference > self.min_row_horizontal_overlap_pixels:
                return False
            return True
        elif group_type == 'left_col':
            if abs(ocr_start[0] - envelope['start'][0]) < self.max_column_misalign_pixels:
                return True
            return False
        elif group_type == 'right_col':
            if abs(ocr_end[0] - envelope['end'][0]) < self.max_column_misalign_pixels:
                return True
            return False

    def get_vertical_overlap(self, ocr_start, ocr_end, envelope_start, envelope_end):
        if ocr_end[1] <= envelope_start[1]:
            return 0 # box is above the row
        if ocr_start[1] >= envelope_end[1]:
            return 0 # box is below the row
        overlap_top = ocr_end[1] - envelope_start[1]
        overlap_bottom = envelope_end[1] - ocr_start[1]
        return max(overlap_top, overlap_bottom)

    def get_axis_difference(self, ocr_start, ocr_end, envelope_start, envelope_end, axis='y'):
        axis_index = 0
        if axis == 'y': 
            axis_index = 1
        if envelope_start[axis_index] <= ocr_start[axis_index] <= envelope_end[axis_index]:
            return 0   #completely enclosed vertically
        if ocr_start[axis_index] < envelope_start[axis_index]:
            if ocr_end[axis_index] >= envelope_start[axis_index]:
                return 0  # ocr starts first, but ends after the envelope starts, dist is zero
            else:
                return envelope_start[axis_index] - ocr_end[axis_index] 
        if ocr_start[axis_index] > envelope_start[axis_index]:
            if ocr_start[axis_index] <= envelope_end[axis_index]:
                return 0  # envelope starts first, the ocr starts before envelope is done
            else:
                return ocr_start[axis_index] - envelope_end[axis_index]

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
        for row_id in fast_pass_obj['row']['ids']:
            if not row_id: 
                continue  # that means no ocr row matched the app row in that position
            ocr_row = self.ocr_rows_dict[row_id]
            self.add_zone_to_response(ocr_row['start'], ocr_row['end'])
            for ocr_match_id in ocr_row['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords)

        for col_id in fast_pass_obj['left_col']['ids']:
            if not col_id: 
                continue  # that means no ocr col matched the app col in that position
            ocr_col = self.ocr_left_cols_dict[col_id]
            self.add_zone_to_response(ocr_col['start'], ocr_col['end'])
            for ocr_match_id in ocr_col['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords)

        for col_id in fast_pass_obj['right_col']['ids']:
            if not col_id: 
                continue  # that means no ocr col matched the app col in that position
            ocr_col = self.ocr_right_cols_dict[col_id]
            self.add_zone_to_response(ocr_col['start'], ocr_col['end'])
            for ocr_match_id in ocr_col['member_ids']:
                ocr_match_ele = self.ocr_results_this_frame[ocr_match_id]
                end_coords = [
                    ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
                    ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
                ]
                # TODO remove this later, just saving the ocr items we are confident are matches
                self.add_zone_to_response(ocr_match_ele['location'], end_coords)

    def get_app_data(self):
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
        build_obj = {
            'rows': [
                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 
                ['b1'],
                ['x1'],
                ['d1', 'e1', 'c1', 'f1'],
            ],
            'left_cols': [
                ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
                ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
                ['e1', 'e2'],
                ['f1', 'f2', 'f3'],
            ],
            'right_cols': [],
            'items': {
                'a1': {
                    'type': 'label',
                    'text': 'Details',
                },
                'a2': {
                    'type': 'label',
                    'text': 'System',
                },
                'a3': {
                    'type': 'label',
                    'text': 'User',
                },
                'a4': {
                    'type': 'label',
                    'text': 'Offers',
                },
                'a5': {
                    'type': 'label',
                    'text': 'Beta',
                },
                'a6': {
                    'type': 'label',
                    'text': 'Subscriptions',
                },
                'b1': {
                    'type': 'label',
                    'text': 'Contact Information',
                },
                'c1': {
                    'type': 'label',
                    'text': 'Email',
                },
                'c2': {
                    'type': 'label',
                    'text': 'Preferred Contact Method',
                },
                'c3': {
                    'type': 'label',
                    'text': 'Preferred Language',
                },
                'c4': {
                    'type': 'label',
                    'text': 'Mobile',
                },
                'c5': {
                    'type': 'label',
                    'text': 'Work Phone',
                },
                'c6': {
                    'type': 'label',
                    'text': 'Home Phone',
                },
                'c7': {
                    'type': 'label',
                    'text': 'Other Phone',
                },
                'd1': {
                    'type': 'label',
                    'text': 'Name',
                },
                'd2': {
                    'type': 'label',
                    'text': 'Sonos ID',
                },
                'd3': {
                    'type': 'label',
                    'text': 'Email Opt Out',
                },
                'd4': {
                    'type': 'label',
                    'text': 'Survey Opt Out',
                },
                'd5': {
                    'type': 'label',
                    'text': 'In app Messaging Opt Out',
                },
                'd6': {
                    'type': 'label',
                    'text': 'Address',
                },
                'd7': {
                    'type': 'label',
                    'text': 'User Type',
                },
                'd8': {
                    'type': 'label',
                    'text': 'Lead Source',
                },
                'e1': {
                    'type': 'user_data',
                    'field_name_label': 'full_name',
                    'mask_this_field': True,
                    'is_pii': True,
                    'data_type': 'string',
                },
                'e2': {
                    'type': 'user_data',
                    'field_name_label': 'sonos_id',
                    'mask_this_field': True,
                    'is_pii': True,
                    'data_type': 'int',
                },
                'f1': {
                    'type': 'user_data',
                    'field_name_label': 'email',
                    'mask_this_field': True,
                    'is_pii': True,
                    'data_type': 'string',
                },
                'f2': {
                    'type': 'user_data',
                    'field_name_label': 'preferred_lang',
                    'mask_this_field': False,
                    'is_pii': False,
                    'data_type': 'string',
                },
                'f3': {
                    'type': 'user_data',
                    'field_name_label': 'other_phone',
                    'mask_this_field': True,
                    'is_pii': True,
                    'data_type': 'phone',
                },
                'x1': {
                    'type': 'label',
                    'text': 'total nonsense should not match',
                },
            }
        }
        return build_obj



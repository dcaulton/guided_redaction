import random
from fuzzywuzzy import fuzz

class FocusFinder:

    def __init__(self, focus_finder_meta, *args, **kwargs):
        super(FocusFinder, self).__init__(*args, **kwargs)
        self.focus_finder_meta = focus_finder_meta
        self.debug = focus_finder_meta.get('debug', False)
        self.fuzz_match_threshold = 70

    def find_focus(self, cv2_img, prev_cv2_img, ocr_matches, prev_ocr_matches, other_t1_matches):
#        print('STARTING new: {} old: {}'.format(len(ocr_matches), len(prev_ocr_matches)))
#        print('START {} {}'.format(len(ocr_matches), len(prev_ocr_matches)))
        match_obj = {}
        match_stats = {}
        masks = {}

        # first, harvest the words from the prev frame that have disappeared or been altered
        disappeared_prev_match_ids =  []
        no_change_match_ids = []
        new_match_ids = []
        altered_match_ids = []
        for prev_match_id in prev_ocr_matches:
            prev_match = prev_ocr_matches[prev_match_id]
            prev_value = prev_match['text']
            its_in_current = False
            current_value = ''
            centroid = self.get_centroid(prev_match)
            current_value = ''
            for cur_match_id in ocr_matches:
                cur_match = ocr_matches[cur_match_id]
                if self.point_is_within_ocr_ele(centroid, cur_match):
                    its_in_current = True
                    current_value = cur_match['text']
                    current_val_id = cur_match_id
            if not its_in_current:
                disappeared_prev_match_ids.append(prev_match_id)
            else:
                ratio = fuzz.ratio(prev_value, current_value)
                if ratio < self.fuzz_match_threshold:
                    altered_match_ids.append(current_val_id)
                else:
                    no_change_match_ids.append(current_val_id)
                    
        # next, harvest the new words which were not in the old frame
        for cur_match_id in ocr_matches:
            if cur_match_id not in altered_match_ids and cur_match_id not in no_change_match_ids:
                new_match_ids.append(cur_match_id)

        # now, those three match ids arrays have every ocr field that has been changed.
        # if that totals to one new field, save the 'focused field'
        # use the altered and new ones to establish an envelope for the app,
        # grow from that app envelope with flood fill if requested, at this point save the 'focused app'
        # do a getScreens, the screen that contains the centroid of that app envelope should be saved as 'focused screen'
        # try to find the cursor using a template with multiple anchors, one for each kind of cursor
        # if no good ocr results, try to find cv2 contours based on a cv2.diff of new and old cv2 image

#        print('DONE alt: {} '.format(altered_match_ids))
#        print('DONE new: {}'.format(new_match_ids))
        print('new: {} no change: {}, altered: {}, deleted: {}'.format(len(new_match_ids), len(no_change_match_ids), len(altered_match_ids), len(disappeared_prev_match_ids)))

        match_obj = self.build_response_data(new_match_ids, no_change_match_ids, altered_match_ids, ocr_matches)

        return match_obj, match_stats, masks 

    def get_centroid(self, ocr_match_ele): 
        x = ocr_match_ele['location'][0] +  int(.5 * ocr_match_ele['size'][0])
        y = ocr_match_ele['location'][1] +  int(.5 * ocr_match_ele['size'][1])
        return (x, y)

    def point_is_within_ocr_ele(self, coords, ocr_match_ele):
        ocr_end = (
            ocr_match_ele['location'][0] + ocr_match_ele['size'][0],
            ocr_match_ele['location'][1] + ocr_match_ele['size'][1]
        )
        if ocr_match_ele['location'][0] <= coords[0] <= ocr_end[0]:
            if ocr_match_ele['location'][1] <= coords[1] <= ocr_end[1]:
                return True

    def build_response_data(self, new_match_ids, no_change_match_ids, altered_match_ids, ocr_matches):
        build_response_data = {}
        env_start_x = False
        env_end_x = False
        env_start_y = False
        env_end_y = False
        for nid in new_match_ids:
            ocr_ele = ocr_matches[nid]
            ocr_end = (
                ocr_ele['location'][0] + ocr_ele['size'][0],
                ocr_ele['location'][1] + ocr_ele['size'][1]
            )
            if not env_start_x:
                env_start_x = ocr_ele['location'][0]
            elif ocr_ele['location'][0] < env_start_x:
                env_start_x = ocr_ele['location'][0]
            if not env_end_x:
                env_end_x = ocr_end[0]
            elif ocr_end[0] > env_end_x:
                env_end_x = ocr_end[0]
            if not env_start_y:
                env_start_y = ocr_ele['location'][1]
            elif ocr_ele['location'][1] < env_start_y:
                env_start_y = ocr_ele['location'][1]
            if not env_end_y:
                env_end_y = ocr_end[1]
            elif ocr_end[1] > env_end_y:
                env_end_y = ocr_end[1]
            build_ele = self.build_match_obj_for_field_type('new', ocr_ele)
            build_response_data[build_ele['id']] = build_ele
        for aid in altered_match_ids:
            ocr_ele = ocr_matches[aid]
            ocr_end = (
                ocr_ele['location'][0] + ocr_ele['size'][0],
                ocr_ele['location'][1] + ocr_ele['size'][1]
            )
            if not env_start_x:
                env_start_x = ocr_ele['location'][0]
            elif ocr_ele['location'][0] < env_start_x:
                env_start_x = ocr_ele['location'][0]
            if not env_end_x:
                env_end_x = ocr_end[0]
            elif ocr_end[0] > env_end_x:
                env_end_x = ocr_end[0]
            if not env_start_y:
                env_start_y = ocr_ele['location'][1]
            elif ocr_ele['location'][1] < env_start_y:
                env_start_y = ocr_ele['location'][1]
            if not env_end_y:
                env_end_y = ocr_end[1]
            elif ocr_end[1] > env_end_y:
                env_end_y = ocr_end[1]
            build_ele = self.build_match_obj_for_field_type('altered', ocr_ele)
            build_response_data[build_ele['id']] = build_ele

        if env_start_x and env_end_x and env_start_y and env_end_y:
            the_id = 'ff_' + str(random.randint(100000000, 999000000))
            location = (env_start_x, env_start_y)
            size = (
                env_end_x - env_start_x,
                env_end_y - env_start_y
            )
            build_ele = {
                'id': the_id,
                'scanner_type': 'focus_finder',
                'focus_object_type': 'app',
                'location': location,
                'size': size,
            }
            build_response_data[build_ele['id']] = build_ele

        return build_response_data

    def build_match_obj_for_field_type(self, field_type, ocr_ele):
        the_id = 'ff_' + str(random.randint(100000000, 999000000))
        build_ele = {
            'id': the_id,
            'scanner_type': 'focus_finder',
            'focus_object_type': 'field',
            'field_type': 'new',
            'location': ocr_ele['location'],
            'size': ocr_ele['size'],
        }
        return build_ele

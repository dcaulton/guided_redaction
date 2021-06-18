import random
from fuzzywuzzy import fuzz


class FocusFinder:

    def __init__(self, focus_finder_meta, *args, **kwargs):
        super(FocusFinder, self).__init__(*args, **kwargs)
        self.focus_finder_meta = focus_finder_meta
        self.debug = focus_finder_meta.get('debug')
        self.fuzz_match_threshold = 70

    def find_focus(self, cv2_img, prev_cv2_img, ocr_matches, prev_ocr_matches, other_t1_matches):
        match_obj = {}
        stats = {}
        masks = {}

        # first, harvest the words from the prev frame that have disappeared or been altered
        disappeared_prev_match_ids =  []
        no_change_match_ids = []
        new_match_ids = []
        altered_match_ids = []
        stats = {
            'altered': {},
        }
        app_extents_per_field = {}
        for prev_match_id in prev_ocr_matches:
            prev_match = prev_ocr_matches[prev_match_id]
            prev_value = prev_match['text']
            its_in_current = False
            current_value = ''
            current_val_id = ''
            centroid = self.get_centroid(prev_match)
            current_value = ''
            cur_match = {}
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
#                    app_extents_per_field[current_val_id] = self.get_extents_for_match(ocr_matches[current_val_id], cv2_img)
                    if self.debug:
                        stats['altered'][current_val_id] = {
                            'prev_id': prev_match_id,
                            'prev_value': prev_value,
                            'cur_value': current_value,
                        }
                else:
                    no_change_match_ids.append(current_val_id)
                    
        # next, harvest the new words which were not in the old frame
        for cur_match_id in ocr_matches:
            if cur_match_id not in altered_match_ids and cur_match_id not in no_change_match_ids:
                new_match_ids.append(cur_match_id)
#                app_extents_per_field[cur_match_id] = self.get_extents_for_match(ocr_matches[cur_match_id], cv2_img)

        # now, those three match ids arrays have every ocr field that has been changed.
        # if that totals to one new field, save the 'focused field'
        # use the altered and new ones to establish an envelope for the app,
        # grow from that app envelope with flood fill if requested, at this point save the 'focused app'
        # do a getScreens, the screen that contains the centroid of that app envelope should be saved as 'focused screen'
        # try to find the cursor using a template with multiple anchors, one for each kind of cursor
        # if no good ocr results, try to find cv2 contours based on a cv2.diff of new and old cv2 image

        if self.debug:
            print('new: {} no change: {}, altered: {}, deleted: {}'.format(
                len(new_match_ids), len(no_change_match_ids), len(altered_match_ids), len(disappeared_prev_match_ids))
            )

        match_obj = self.build_response_data(
            new_match_ids, no_change_match_ids, altered_match_ids, ocr_matches, app_extents_per_field
        )

        return match_obj, stats, masks 

#    def get_extents_for_match(self, ocr_match, cv2_image, match_offset_px=-20): 
#        # returns a tuple of (start_coords, end_coords)
#        finder = ExtentsFinder()
#        after_coords = (
#            ocr_match['location'][0] + ocr_match['size'][0] + match_offset_px,
#            ocr_match['location'][1] + ocr_match['size'][1] + match_offset_px
#        )
#        region, mask = finder.determine_flood_fill_area(cv2_image, after_coords)
#        return region
#
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

    def get_app_effective_window(self, match_objects):
        env_start_x = False
        env_end_x = False
        env_start_y = False
        env_end_y = False
        for match_obj_id in match_objects:
            ocr_ele = match_objects[match_obj_id]
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
        return (
            (env_start_x, env_start_y),
            (env_end_x, env_end_y)
        )

    def build_response_data(self, new_match_ids, no_change_match_ids, altered_match_ids, ocr_matches, app_extents_per_field):
        build_response_data = {}
        for nid in new_match_ids:
            ocr_ele = ocr_matches[nid]
            build_ele = self.build_match_obj_for_field_type('new', ocr_ele)
            build_response_data[build_ele['id']] = build_ele
#            if self.debug:  # save extents too
#                bg_build_ele = self.build_background_ele_for_field_ele(build_ele, app_extents_per_field, nid)
#                build_response_data[bg_build_ele['id']] = bg_build_ele
        for aid in altered_match_ids:
            ocr_ele = ocr_matches[aid]
            build_ele = self.build_match_obj_for_field_type('altered', ocr_ele)
            build_response_data[build_ele['id']] = build_ele
#            if self.debug:  # save extents too
#                bg_build_ele = self.build_background_ele_for_field_ele(build_ele, app_extents_per_field, aid)
#                build_response_data[bg_build_ele['id']] = bg_build_ele

        return build_response_data

#    def build_background_ele_for_field_ele(self, field_build_ele, app_extents_per_field, ocr_match_id):
#        new_id = field_build_ele['id'] + '_bg'
#        start = app_extents_per_field[ocr_match_id][0]
#        end = app_extents_per_field[ocr_match_id][1]
#        size = (
#            end[0] - start[0],
#            end[1] - start[1]
#        )
#        build_ele = {
#            'id': new_id,
#            'scanner_type': 'focus_finder',
#            'field_type': 'field_bg', 
#            'field_id': field_build_ele['id'],
#            'location': start,
#            'size': size,
#        }
#        return build_ele
#
    def build_match_obj_for_field_type(self, field_type, ocr_ele):
        the_id = 'ff_' + str(random.randint(100000000, 999000000))
        build_ele = {
            'id': the_id,
            'scanner_type': 'focus_finder',
            'focus_object_type': 'field',
            'field_type': 'new',
            'location': ocr_ele['location'],
            'size': ocr_ele['size'],
            'text': ocr_ele['text'],
        }
        return build_ele

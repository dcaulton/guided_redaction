class T1Controller:

    def adjust_start_end_origin_for_t1(self, coords_in, tier_1_frameset, ocr_rule):
        adjusted_coords = {}
        adjusted_coords['start'] = coords_in['start']
        adjusted_coords['end'] = coords_in['end']
        adjusted_coords['origin'] = coords_in['origin']
        if 'images' in tier_1_frameset: # its just a virgin frameset, not t1 output
            return adjusted_coords
        match_app_id = ''
        if 'app_id' in ocr_rule['attributes']:
            match_app_id = ocr_rule['attributes']['app_id']
        for subscanner_key in tier_1_frameset:
            if match_app_id and 'app_id' in tier_1_frameset[subscanner_key] and \
                tier_1_frameset[subscanner_key]['app_id'] != match_app_id:
                continue
            subscanner = tier_1_frameset[subscanner_key]
            if subscanner['scanner_type'] == 'selected_area':
                if 'location' in subscanner and 'size' in subscanner:
                    print('adjusting ocr coords by sa location for {}'.format(subscanner_key))
                    adjusted_coords['start'] = subscanner['location']
                    adjusted_coords['end'] = [
                        subscanner['location'][0] + subscanner['size'][0],
                        subscanner['location'][1] + subscanner['size'][1]
                    ]
                return adjusted_coords
            if 'location' in subscanner and 'origin' in coords_in:
                disp_x = subscanner['location'][0] - coords_in['origin'][0]
                disp_y = subscanner['location'][1] - coords_in['origin'][1]
                if abs(disp_x) or abs(disp_y):
                    print('adjusting ocr coords by non sa location {}, {}'.format(disp_x, disp_y))
                    adjusted_coords['start'] = [
                        adjusted_coords['start'][0] + disp_x,
                        adjusted_coords['start'][1] + disp_y
                    ]
                    adjusted_coords['end'] = [
                        adjusted_coords['end'][0] + disp_x,
                        adjusted_coords['end'][1] + disp_y
                    ]
                    adjusted_coords['origin'] = [
                        adjusted_coords['origin'][0] + disp_x,
                        adjusted_coords['origin'][1] + disp_y 
                    ]
                return adjusted_coords
            # TODO this seems redundant if we don't limit above to SA
            if 'start' in subscanner and 'end' in subscanner:
                print('adjusting ocr coords by non sa start end')
                adjusted_coords['start'] = subscanner['start']
                adjusted_coords['end'] = subscanner['end']
                return adjusted_coords
        return adjusted_coords

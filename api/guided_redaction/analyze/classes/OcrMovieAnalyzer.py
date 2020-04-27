import cv2
import numpy as np
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder                                                

class OcrMovieAnalyzer:

    def __init__(self, debug=False):
        self.debug = debug

    def collect_one_frame(self, raw_rtas, cv2_image):
        apps = {}

        # put rtas into a dict for easier access
        rta_dict = {}
        for rta in raw_rtas:
            rta_dict[rta['id']] = rta

        # quantize the rtas into rows
        sorted_rta_ids = self.order_recognized_text_areas_by_geometry(raw_rtas)

        # gather rta neighborhoods
        self.gather_rta_neighborhoods(rta_dict, cv2_image)

        # coalesce rta neighborhoods
        self.coalesce_rta_neighborhoods(rta_dict, cv2_image)

        # coalesce apparent header rows in rta neighborhoods

        # build a list of app geometries and phrases
        
        # filter out singleton apps


        for rta_number, rta_id in enumerate(rta_dict):
            cv2_image_copy = cv2_image.copy()
            rta = rta_dict[rta_id]
            self.draw_region_and_point(rta['neighborhood'], rta['centroid'], cv2_image_copy)
            path = '/Users/dcaulton/Desktop/junk/{}.png'.format(rta_number)
            cv2.imwrite(path, cv2_image_copy)



        return_obj = {
            'apps': apps,
            'rta_dict': rta_dict,
            'sorted_rta_ids': sorted_rta_ids,
        }
        return return_obj

    def order_recognized_text_areas_by_geometry(self, raw_rtas):
        ordered_rtas = []
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
            ordered_rtas.append(x_keys_sorted)

        if self.debug:
            print('==========================ocr rta rows bunched by y, then sorted by x:')
        ordered_rta_keys = []
        for row in ordered_rtas:
            rta_keys_this_row = []
            if self.debug:
                print('----------- new row')
            for rta in row:
                rta_keys_this_row.append(rta['id'])
                if self.debug:
                    print('{} {}'.format(rta['start'], rta['text']))
            ordered_rta_keys.append(rta_keys_this_row)
            
        return ordered_rta_keys

    def gather_rta_neighborhoods(self, rta_dict, cv2_image):
        finder = ExtentsFinder()
        for rta_number, rta_id in enumerate(rta_dict):
            rta = rta_dict[rta_id]
            if self.debug:
                cv2_image_copy = cv2_image.copy()
            neighborhood = [rta['start'], rta['end']]

            before_point = [rta['start'][0] - 5, rta['start'][1]]
            if before_point[0] < 0:
                before_point[0] = 0
            if before_point[1] < 0:
                before_point[1] = 0
            before_region = finder.determine_flood_fill_area(
                cv2_image, before_point, 5
            )
            if self.region_contains_point(before_region, rta['centroid']):
                neighborhood = self.merge_regions(neighborhood, before_region)

            after_point = [rta['end'][0] + 5, rta['end'][1]]
            if after_point[0] > cv2_image.shape[1] - 1:
                after_point[0] = cv2_image.shape[1] - 1
            if after_point[1] > cv2_image.shape[0] - 1:
                after_point[1] = cv2_image.shape[0] - 1
            after_region = finder.determine_flood_fill_area(
                cv2_image, after_point, 2
            )
            if self.region_contains_point(after_region, rta['centroid']):
                neighborhood = self.merge_regions(neighborhood, after_region)

            rta['neighborhood'] = neighborhood

    def coalesce_rta_neighborhoods(self, rta_dict, cv2_image):
        for cur_rta_counter, cur_rta_id in enumerate(rta_dict):
            needed_to_process_count = 0
            cur_rta = rta_dict[cur_rta_id]
            if self.debug:
                print('coalescing neighborhood for rta number {}'.format(cur_rta_counter))
            for comp_rta_id in rta_dict:
                comp_rta = rta_dict[comp_rta_id]
                if cur_rta['id'] == comp_rta['id']:
                    continue
                if cur_rta['neighborhood'] == comp_rta['neighborhood']:
                    continue
                needed_to_process_count += 1
                if self.areas_overlap_by_minimum(cur_rta['neighborhood'], comp_rta['neighborhood'], cv2_image):
                    new_neighborhood = self.merge_regions(
                        cur_rta['neighborhood'], 
                        comp_rta['neighborhood']
                    )
                    rta_dict[cur_rta_id]['neighborhood'] = new_neighborhood
                    rta_dict[comp_rta_id]['neighborhood'] = new_neighborhood
            print('  processed {} partners'.format(needed_to_process_count))

    def areas_overlap_by_minimum(self, region_1, region_2, cv2_image):
        # if region 1s start and end points are not within region 2, and
        #  region 2s start and end points are not within region 1 there is no overlap
        if not self.region_contains_point(region_1, region_2[0]) \
            and not self.region_contains_point(region_1, region_2[1]) \
            and not self.region_contains_point(region_2, region_1[0]) \
            and not self.region_contains_point(region_2, region_1[1]):
            return False

        blk_1 = np.zeros(cv2_image.shape, np.uint8)
        cv2.rectangle(
            blk_1,
            tuple(region_1[0]),
            tuple(region_1[1]),
            (255, 255, 255),
            -1
        )

        blk_2 = np.zeros(cv2_image.shape, np.uint8)
        cv2.rectangle(
            blk_2,
            tuple(region_2[0]),
            tuple(region_2[1]),
            (255, 255, 255),
            -1
        )

        overlap_image = cv2.bitwise_and(blk_1, blk_2)

        overlap_pixels = np.all(overlap_image == (255, 255, 255), axis=-1)
        if not overlap_pixels.any():
            return False
        start_y = np.where(overlap_pixels)[0][0]
        end_y = np.where(overlap_pixels)[0][-1]
        start_x = np.where(overlap_pixels)[1][0]
        end_x = np.where(overlap_pixels)[1][-1]

        x_range = end_x - start_x
        y_range = end_y - start_y

        if (x_range * y_range) > 25:
            return True

        return False

    def draw_region_and_point(self, region, point, cv2_image):
        color = (3, 25, 222)
  
        size = (region[1][0] - region[0][1], region[1][1] - region[1][0])
        blk = np.zeros(cv2_image.shape, np.uint8)
        cv2.rectangle(
            blk,
            tuple(region[0]),
            tuple(region[1]),
            color, 
            -1
        )
        cv2_image_copy = cv2.addWeighted(
            cv2_image, 
            .75, 
            blk, 
            .25, 
            0,
            cv2_image
        )
        cv2.circle(
            cv2_image,
            tuple(point),
            5,
            (0, 0, 255),
            -1
        )

    def region_contains_point(self, region, point):
        if region[0][0] < point[0] < region[1][0]:
            if region[0][1] < point[1] < region[1][1]:
                return True

    def merge_regions(self, region_1, region_2):
        new_region = [
            [region_1[0][0], region_1[0][1]],
            [region_1[1][0], region_1[1][1]],
        ]
        if region_2[0][0] < new_region[0][0]:
            new_region[0][0] = region_2[0][0]
        if region_2[0][1] < new_region[0][1]:
            new_region[0][1] = region_2[0][1]
        if region_2[1][0] > new_region[1][0]:
            new_region[1][0] = region_2[1][0]
        if region_2[1][1] > new_region[1][1]:
            new_region[1][1] = region_2[1][1]
        return new_region


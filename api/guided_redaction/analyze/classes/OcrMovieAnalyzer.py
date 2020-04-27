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

        # coalesce apparent header rows in rta neighborhoods

        # build a list of app geometries and phrases
        
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
            print('runny looking at rta NUMBER {}: {}'.format(rta_number, rta))
            neighborhood = [rta['start'], rta['end']]
            before_point = [rta['start'][0] - 5, rta['start'][1]]
            if before_point[0] < 0:
                before_point[0] = 0
            if before_point[1] < 0:
                before_point[1] = 0

            before_region = finder.determine_flood_fill_area(
                cv2_image, before_point, 5
            )

            if self.debug:
                before_size = (before_region[1][0] - before_region[0][1], before_region[1][1] - before_region[1][0])
                blk = np.zeros(cv2_image_copy.shape, np.uint8)
                cv2.rectangle(
                    blk,
                    before_region[0],
                    before_region[1],
                    (3, 25, 222),
                    -1
                )
                cv2_image_copy = cv2.addWeighted(
                    cv2_image_copy, 
                    .75, 
                    blk, 
                    .25, 
                    0,
                    cv2_image_copy
                )
                cv2.circle(
                    cv2_image_copy,
                    tuple(before_point),
                    5,
                    (0, 0, 255),
                    -1
                )
                print('before region {}'.format(before_region))

            before_region_area = (before_region[1][0] - before_region[0][0]) * \
                (before_region[1][1] - before_region[0][1])
            if before_region_area > 25:
                print('add before region --- {}'.format(before_region_area))

            after_point = [rta['end'][0] + 5, rta['end'][1]]
            if after_point[0] > cv2_image.shape[1] - 1:
                after_point[0] = cv2_image.shape[1] - 1
            if after_point[1] > cv2_image.shape[0] - 1:
                after_point[1] = cv2_image.shape[0] - 1
            print('after point {}'.format(after_point))
            after_region = finder.determine_flood_fill_area(
                cv2_image, after_point, 2
            )
            if self.debug:
                after_size = (after_region[1][0] - after_region[0][1], after_region[1][1] - after_region[1][0])
                blk = np.zeros(cv2_image_copy.shape, np.uint8)
                cv2.rectangle(
                    blk,
                    after_region[0],
                    after_region[1],
                    (255, 5, 12),
                    -1
                )
                cv2_image_copy = cv2.addWeighted(
                    cv2_image_copy, 
                    .75, 
                    blk, 
                    .25, 
                    0, 
                    cv2_image_copy
                )
                cv2.circle(
                    cv2_image_copy,
                    tuple(after_point),
                    5,
                    (0, 0, 255),
                    -1
                )
                print('after region {}'.format(after_region))
            after_region_area = (after_region[1][0] - after_region[0][0]) * \
                (after_region[1][1] - after_region[0][1])
            if after_region_area > 25:
                print('add after region --- {}'.format(after_region_area))

            if self.debug:
                cv2.circle(
                    cv2_image_copy,
                    rta['centroid'],
                    5,
                    (0, 0, 255),
                    -1
                )
            if self.debug:
                path = '/Users/dcaulton/Desktop/junk/{}.png'.format(rta_number)
                cv2.imwrite(path, cv2_image_copy)

import cv2
import json
import math
import random
import numpy as np
import uuid
from guided_redaction.analyze.classes.ExtentsFinder import ExtentsFinder                                                

class OcrMovieAnalyzer:

    def __init__(self, meta, file_writer):
        self.debug = meta['debug_level']
        self.file_writer = file_writer
        self.min_app_width = 100
        self.min_app_height = 100
        self.max_rta_neighborhood_area = 1000 * 1000
        self.max_header_height = 100
        self.max_header_vertical_separation = 10
        self.max_header_width_difference = 10
        self.debug_file_uuid = ''
        if self.debug:
            if 'debug_directory' in meta:
                self.debug_file_uuid = meta['debug_directory']
            else:
                self.debug_file_uuid = str(uuid.uuid4())
                self.file_writer.create_unique_directory(self.debug_file_uuid)

    def collect_one_frame(self, raw_rtas, cv2_image, image_name):
        # put rtas into a dict for easier access
        rta_dict = {}
        for rta in raw_rtas:
            rta_dict[rta['id']] = rta

        # TODO if we have no borders on some apps, add some lines to help fill operations


        # quantize the rtas into rows
        sorted_rta_ids = self.order_recognized_text_areas_by_geometry(raw_rtas)

        # gather rta neighborhoods
        self.gather_rta_neighborhoods(rta_dict, cv2_image)

        if self.debug == 'everything':
            self.draw_rtas(rta_dict, cv2_image, 'pre_coalesce_rta')

        # coalesce rta neighborhoods
        self.coalesce_rta_neighborhoods(rta_dict, cv2_image)

        if self.debug == 'everything':
            self.draw_rtas(rta_dict, cv2_image, 'post_coalesce_rta')

        # build a list of app geometries and phrases
        apps = self.build_app_geometries_and_phrases(sorted_rta_ids, rta_dict, cv2_image)
        
        # coalesce apparent app header rows 
        self.coalesce_app_header_rows(apps)

        # TODO search for and merge duplicate occurrences of the same app.


        # filter out singleton apps and those with small bounding boxes
        self.filter_out_weak_apps(apps)

        if self.debug:
            self.draw_apps(apps, rta_dict, cv2_image, image_name)

        return_obj = {
            'apps': apps,
            'rta_dict': rta_dict,
            'sorted_rta_ids': sorted_rta_ids,
            'debug_directory': self.debug_file_uuid,
        }

        return return_obj

    def condense_all_frames(self, all_job_data_array):
        global_apps = {}

        for job_sequence_number, job_id in enumerate(all_job_data_array):
            job_response_data = all_job_data_array[job_id]['response_data']
            job_request_data = all_job_data_array[job_id]['request_data']
            self.print_job_processing_line(job_id, job_request_data)
            if job_sequence_number == 0:
                global_apps = self.build_all_apps_from_first_job(job_response_data)
            else:
                print('ADD APPS TO GLOBAL APPS HERE')














    def build_all_apps_from_first_job(self, job_data):
        if self.debug:
            print('building all apps from the first job')
        for job_app_key in job_data['apps']:
            job_app = job_data['apps'][job_app_key]
            build_app = {}
            build_app['phrases'] = job_app['phrases']
            build_app['coords'] = []
            app_row_keys_sorted = sorted(list(map(int, job_app['rta_ids'].keys())))
            app_origin_rta_id = job_app['rta_ids'][str(app_row_keys_sorted[0])][0]
            app_origin_point = job_data['rta_dict'][app_origin_rta_id]['start']
            for rta_row_number in job_app['rta_ids']:
                build_coords_row = []
                rta_row = job_app['rta_ids'][rta_row_number]
                for rta_id in rta_row:
                    rta = job_data['rta_dict'][rta_id]
                    start_offset = [
                        rta['start'][0] - app_origin_point[0],
                        rta['start'][1] - app_origin_point[1]
                    ]
                    end_offset = [
                        rta['end'][0] - app_origin_point[0],
                        rta['end'][1] - app_origin_point[1]
                    ]
                    build_coords = {
                        'start': start_offset,
                        'end': end_offset,
                    }
                    build_coords_row.append(build_coords)
                build_app['coords'].append(build_coords_row)
                build_app['has_header_row'] = True
            else:
                build_app['has_header_row'] = False

    def print_job_processing_line(self, job_id, request_data):
        if self.debug:
            movie_url = list(request_data['movies'].keys())[0]
            frameset_hash = list(request_data['movies'][movie_url]['framesets'].keys())[0]
            print('processing job id {} with movie {} frameset {}'.format(job_id, movie_url, frameset_hash))

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

        if self.debug == 'everything':
            print('==========================ocr rta rows bunched by y, then sorted by x:')
        ordered_rta_keys = []
        for row in ordered_rtas:
            rta_keys_this_row = []
            if self.debug == 'everything':
                print('----------- new row')
            for rta in row:
                rta_keys_this_row.append(rta['id'])
                if self.debug == 'everything':
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
            # TODO add chrome tab and address bar recog here
            if rta['end'][1] < 100: # it's probably a chrome tab or address bar, skip for now
                rta['neighborhood'] = neighborhood
                continue

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
                cv2_image, after_point, 5
            )
            if self.region_contains_point(after_region, rta['centroid']):
                neighborhood = self.merge_regions(neighborhood, after_region)

            n_w = neighborhood[1][0] - neighborhood[0][0]
            n_h = neighborhood[1][1] - neighborhood[0][1]
            if n_w * n_h > self.max_rta_neighborhood_area:
                neighborhood = [rta['start'], rta['end']]
            
            rta['neighborhood'] = neighborhood

    def coalesce_rta_neighborhoods(self, rta_dict, cv2_image):
        for cur_rta_counter, cur_rta_id in enumerate(rta_dict):
            needed_to_process_count = 0
            cur_rta = rta_dict[cur_rta_id]
            if self.debug == 'everything':
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
            if self.debug == 'everyghing': 
                print('  processed {} partners'.format(needed_to_process_count))

    def build_app_geometries_and_phrases(self, sorted_rta_ids, rta_dict, cv2_image):
        box_dict = {}
        for rta_row_number, rta_row in enumerate(sorted_rta_ids):
            for rta_id in rta_row:
                rta = rta_dict[rta_id]
                rta_box_key = '{}-{}-{}-{}'.format(
                    rta['neighborhood'][0][0],
                    rta['neighborhood'][0][1],
                    rta['neighborhood'][1][0],
                    rta['neighborhood'][1][1]
                )
                if rta_box_key not in box_dict:
                   box_dict[rta_box_key] = {}
                if rta_row_number not in box_dict[rta_box_key]:
                    box_dict[rta_box_key][rta_row_number] = []
                box_dict[rta_box_key][rta_row_number].append(rta_id)

        if self.debug == 'everything':
            print('box dict: {}'.format(box_dict))
            self.draw_box_dict_entries(box_dict, cv2_image, rta_dict)

        apps = {}
        for box_number, box_key in enumerate(box_dict):
            phrase_list = []
            row_keys = sorted(box_dict[box_key].keys())
            for row_key in row_keys:
                row = []
                for rta_id in box_dict[box_key][row_key]:
                    rta = rta_dict[rta_id]
                    row.append(rta['text'])
                phrase_list.append(row)
                bounding_box = rta['neighborhood']
            app = {
                'phrases': phrase_list,
                'bounding_box': bounding_box,
                'rta_ids': box_dict[box_key],
            }
            apps[box_number] = app

        if self.debug == 'everything':
            print('all the apps {}'.format(apps))

        return apps

    def coalesce_app_header_rows(self, apps):
        for cur_app_key in apps:
            cur_app = apps[cur_app_key]
            for comp_app_key in apps:
                comp_app = apps[comp_app_key]
                if self.first_app_looks_like_a_header(cur_app, comp_app):
                    self.merge_cur_into_comp(cur_app, comp_app, apps)

    def filter_out_weak_apps(self, apps):
        keys_to_delete = []
        for app_key in apps:
            app = apps[app_key]
            if len(app['phrases']) == 1 and len(app['phrases'][0]) == 1:
                keys_to_delete.append(app_key)
                continue
            app_width = app['bounding_box'][1][0] - app['bounding_box'][0][0]
            app_height= app['bounding_box'][1][1] - app['bounding_box'][0][1]
            if app_width < self.min_app_width:
                keys_to_delete.append(app_key)
                continue
            if app_height < self.min_app_height:
                keys_to_delete.append(app_key)
                continue

        for app_key in keys_to_delete:
            del apps[app_key]

    def first_app_looks_like_a_header(self, cur_app, comp_app):
        if len(cur_app['phrases']) > 1:
            return False  # more than one row of text, not a header
        if cur_app['bounding_box'][1][1] > comp_app['bounding_box'][0][1]: 
            return False # cur app is not above comp app
        header_separation = comp_app['bounding_box'][0][1] - cur_app['bounding_box'][1][1]
        if header_separation > self.max_header_vertical_separation:
            return False 

        cur_app_width = cur_app['bounding_box'][1][0] - cur_app['bounding_box'][0][0]
        cur_app_height = cur_app['bounding_box'][1][1] - cur_app['bounding_box'][0][1]
        comp_app_width = comp_app['bounding_box'][1][0] - comp_app['bounding_box'][0][0]

        if abs(cur_app_width - comp_app_width) > self.max_header_width_difference:
            return False
        if cur_app_height > self.max_header_height:
            return False
        return True

    def merge_cur_into_comp(self, cur_app, comp_app, apps):
        comp_app['phrases'] = cur_app['phrases'] + comp_app['phrases']
        comp_app['first_row_is_header'] = True
        comp_app['bounding_box'] = self.merge_regions(
            cur_app['bounding_box'], 
            comp_app['bounding_box']
        )

    def draw_apps(self, apps, rta_dict, cv2_image, image_name):
        cv2_image_copy = cv2_image.copy()
        overlay = np.zeros(cv2_image.shape, np.uint8)
        for app_id in apps:
            app = apps[app_id]
            bounding_box = app['bounding_box']
            rand_color = [
                math.floor(random.random() * 255), 
                math.floor(random.random() * 255), 
                math.floor(random.random() * 255)
            ]
            cv2.rectangle(
                overlay,
                tuple(bounding_box[0]),
                tuple(bounding_box[1]),
                rand_color,
                -1
            )
            cv2.rectangle(
                overlay,
                tuple(bounding_box[0]),
                tuple(bounding_box[1]),
                (0, 0, 255),
                3
            )
            for row_id in app['rta_ids']:
                rta_id_row = app['rta_ids'][row_id]
                for rta_id in rta_id_row:
                    rta = rta_dict[rta_id]
                    cv2.circle(
                        cv2_image_copy,
                        tuple(rta['centroid']),
                        5,
                        (0, 0, 255),
                        -1
                    )
        cv2_image_copy = cv2.addWeighted(
            cv2_image_copy, 
            .75, 
            overlay, 
            .25, 
            0,
            cv2_image_copy
        )

        pic_name = image_name + '_apps.png'
        path = self.file_writer.build_file_fullpath_for_uuid_and_filename(
            self.debug_file_uuid,
            pic_name
        )
        cv2.imwrite(path, cv2_image_copy)

    def draw_box_dict_entries(self, box_dict, cv2_image, rta_dict):
        for box_count, box_key in enumerate(box_dict):
            cv2_image_copy = cv2_image.copy()
            first_rta_row_key = list(box_dict[box_key].keys())[0]
            first_rta_id = box_dict[box_key][first_rta_row_key][0]
            bounding_box = rta_dict[first_rta_id]['neighborhood']
            rand_color = [
                math.floor(random.random() * 255), 
                math.floor(random.random() * 255), 
                math.floor(random.random() * 255)
            ]
            overlay = np.zeros(cv2_image.shape, np.uint8)
            cv2.rectangle(
                overlay,
                tuple(bounding_box[0]),
                tuple(bounding_box[1]),
                rand_color,
                -1
            )
            cv2_image_copy = cv2.addWeighted(
                cv2_image_copy, 
                .75, 
                overlay, 
                .25, 
                0,
                cv2_image_copy
            )
            cv2.putText(
                cv2_image_copy,
                box_key,
                (100, 100),
                cv2.FONT_HERSHEY_SIMPLEX,
                3,
                (255, 255, 0),
                2
            )
            for rta_row_key in box_dict[box_key]:
                rta_row = box_dict[box_key][rta_row_key]
                for rta_id in rta_row:
                    rta = rta_dict[rta_id]
                    cv2.circle(
                        cv2_image_copy,
                        tuple(rta['centroid']),
                        5,
                        (0, 0, 255),
                        -1
                    )

            path = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                self.debug_file_uuid,
                'box_dict_{}.png'.format(box_count)
            )
            cv2.imwrite(path, cv2_image_copy)

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
        if region[0][0] <= point[0] <= region[1][0]:
            if region[0][1] <= point[1] <= region[1][1]:
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

    def draw_rtas(self, rta_dict, cv2_image, filename_prefix):
        for rta_number, rta_id in enumerate(rta_dict):
            cv2_image_copy = cv2_image.copy()
            rta = rta_dict[rta_id]
            self.draw_region_and_point(rta['neighborhood'], rta['centroid'], cv2_image_copy)
            path = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                self.debug_file_uuid,
                '{}_{}.png'.format(filename_prefix, rta_number)
            )
            cv2.imwrite(path, cv2_image_copy)

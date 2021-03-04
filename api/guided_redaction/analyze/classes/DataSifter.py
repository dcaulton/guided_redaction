import cv2
import random
import math
import imutils
import numpy as np


class DataSifter:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = False
        self.template_match_threshold = .9
        self.match_origin_xy_tolerance = 5

    def sift_data(self, cv2_image):
        return {'donkey': 'kong'}

    def match_mesh(self, mesh, most_recent_t1_frameset, cv2_image):
        match_obj = {}
        match_stats = {
            'cell_stats': {},
        }

        ranked_cells = self.build_cells_by_popularity(mesh)
        num_matches = 0
        match_score = 0
        projected_origin = []
        for cell in ranked_cells:
            if self.debug:
                print('looking at cell {}'.format(cell))
            ma = cell['mesh_address']
            mesh_element = mesh[ma[0]][ma[1]]
            gray_template_image = cv2.cvtColor(mesh_element['image'], cv2.COLOR_BGR2GRAY)
            gray_target_image = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY)
            res = cv2.matchTemplate(gray_target_image, gray_template_image, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            self.save_cell_stats(match_stats, max_val, max_loc, ma, cell['interesting_score'])
            if max_val >= self.template_match_threshold:
                cell_proj_origin = self.compute_projected_origin(max_loc, cell['mesh_address'])
                if not projected_origin:
                    projected_origin = cell_proj_origin
                if abs(cell_proj_origin[0] - projected_origin[0]) > self.match_origin_xy_tolerance \
                    or abs(cell_proj_origin[1] - projected_origin[1]) > self.match_origin_xy_tolerance:
                    if self.debug:
                        print('matched, but too far apart {} {} '.format(cell_proj_origin, projected_origin))
                    continue
                if self.debug:
                    print('MESH CELL MATCHED: val/loc {} {}'.format(max_val, max_loc))
                num_matches += 1
                match_score += int(cell['interesting_score'])
            else:
                continue

        match_stats['match_score'] = match_score
        if match_score > int(self.mesh_match_meta['min_score']):
            if self.debug:
                tst = 'MESH MATCHED {} TIMES FOR {} POINTS AT {}'
                print(tst.format(num_matches, match_score, projected_origin))
            match_element = self.get_desired_frameset_element(most_recent_t1_frameset)
            size = (0, 0)
            scale = 1
            if 'size' in match_element:
                size = (
                    int(match_element['size'][0]),
                    int(match_element['size'][1])
                )
            if 'scale' in match_element:
                scale = int(match_element['scale'])
            match_obj = {
                'id': 'mesh_match_' + str(random.randint(0, 99999)),
                'location': projected_origin,
                'size': size,
                'scanner_type': 'mesh_match',
                'scale': scale,
            }
            if self.debug:
                print('mesh match results {}'.format(match_obj))
        else:
            if self.debug:
                print('no match found')

        final_mask = np.zeros(cv2_image.shape[:2])
        self.draw_match_obj_on_mask(match_obj, final_mask)

        return match_obj, match_stats, final_mask

    def draw_match_obj_on_mask(self, match_obj, mask):
        if not match_obj:
            return
        end = (
            match_obj['location'][0] + match_obj['size'][0],
            match_obj['location'][1] + match_obj['size'][1]
        )
        cv2.rectangle(
            mask,
            tuple(match_obj['location']),
            end,
            255,
            -1
        )

    def compute_projected_origin(self, match_location, mesh_grid_coords):
        mesh_size = int(self.mesh_match_meta['mesh_size'])
        mesh_pixel_offset = [
            int(mesh_grid_coords[1] * mesh_size * 2),
            int(mesh_grid_coords[0] * mesh_size * 2)
        ]
        proj_origin = (
            int(match_location[0]) - mesh_pixel_offset[0],
            int(match_location[1]) - mesh_pixel_offset[1]
        )
        return proj_origin

    def build_cells_by_popularity(self, mesh):
        if not mesh:
            return []
        to_rank = []
        for row_pos, mesh_row in enumerate(mesh):
            for col_pos, mesh_cell in enumerate(mesh_row):
                build_obj = {
                    'interesting_score': mesh_cell['interesting_score'],
                    'mesh_address': (row_pos, col_pos),
                }
                to_rank.append(build_obj)

        sorted_to_rank = sorted(
            to_rank,
            key=lambda to_rank_obj: (
                to_rank_obj['interesting_score']
            ),
            reverse=True
        )
        if self.debug:
            for tt in sorted_to_rank:
                print('---popularity: int score-{} {}'.format(tt['interesting_score'], tt['mesh_address']))

        return sorted_to_rank

    def build_mesh(self, most_recent_t1_frameset, most_recent_cv2_image):
        if self.debug:
            print('building a mesh for {}'.format(most_recent_t1_frameset))
            print('meta is {}'.format(self.mesh_match_meta))
        match_element = self.get_desired_frameset_element(most_recent_t1_frameset)
        mesh = []
        if 'size' in match_element:
            t1_size = match_element['size']
            self.debug_mask_image = np.zeros((int(t1_size[1]), int(t1_size[0]), 3), dtype='uint8')
            mesh_size = self.mesh_match_meta['mesh_size']
            all_count = [
                math.floor(int(t1_size[0]) / int(mesh_size)),
                math.floor(int(t1_size[1]) / int(mesh_size))
            ]
            mesh_count = [
                math.floor(all_count[0] / 2) + math.floor(all_count[0] % 2),
                math.floor(all_count[1] / 2) + math.floor(all_count[1] % 2)
            ]
            if mesh_count[0] == 0 or mesh_count[1] == 0: 
                return
            for row_num in range(mesh_count[1]):
                build_mesh_row = []
                for col_num in range(mesh_count[0]):
                    mesh_obj = self.build_one_mesh_obj(
                        row_num, col_num, match_element, most_recent_cv2_image
                    )
                    build_mesh_row.append(mesh_obj)
                mesh.append(build_mesh_row)

        if self.debug:
            cv2.imwrite('/Users/dcaulton/Desktop/debug_mask_image.png', self.debug_mask_image)

        return mesh

    def build_one_mesh_obj(self, row_num, col_num, match_element, most_recent_cv2_image):
        t1_start_point = [
            int(match_element['location'][0]),
            int(match_element['location'][1])
        ]
        mesh_size = int(self.mesh_match_meta['mesh_size'])
        cell_offset = [
            col_num * 2 * mesh_size,
            row_num * 2 * mesh_size,
        ]
        cell_start = [
            t1_start_point[0] + cell_offset[0],
            t1_start_point[1] + cell_offset[1],
        ]
        cell_end = [
            cell_start[0] + mesh_size,
            cell_start[1] + mesh_size,
        ]
        cell_swatch = most_recent_cv2_image[cell_start[1]:cell_end[1], cell_start[0]:cell_end[0]]
        interesting_score = self.get_interesting_score(cell_swatch, row_num, col_num)
        if self.debug:
            self.debug_mask_image[
                cell_offset[1]:cell_offset[1] + mesh_size, 
                cell_offset[0]:cell_offset[0] + mesh_size
            ] = cell_swatch
            cv2.putText(
                self.debug_mask_image,
                str(interesting_score),
                (cell_offset[0], cell_offset[1] + mesh_size - 10), #bottomLeftCornerOfText,
                cv2.FONT_HERSHEY_SIMPLEX, #font,
                .5, #fontScale,
                (0, 0, 255), #fontColor,
                1   #lineType
            )
        return {
            'image': cell_swatch,
            'interesting_score': interesting_score,
        }

    def get_desired_frameset_element(self, most_recent_t1_frameset):
        # TODO, if we match on a particular template id, enforce that here
        # otherwise, just take the first one
        t1_key = list(most_recent_t1_frameset.keys())[0]
        return most_recent_t1_frameset[t1_key]

    def get_interesting_score(self, cell_swatch, row_num, col_num):
        copy = cv2.cvtColor(cell_swatch.copy(), cv2.COLOR_BGR2GRAY)
        (T, copy) = cv2.threshold(copy, 200, 255, cv2.THRESH_BINARY)
        cnts = cv2.findContours(
            copy,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        cnts = imutils.grab_contours(cnts)

        return len(cnts)

    def save_cell_stats(self, match_stats, max_val, max_loc, mesh_address, interesting_score):
        if max_val >= self.template_match_threshold:
            above_threshold = 'yes'
        else:
            above_threshold = 'no'
        cell_stats_obj = {
            'template_match_score': max_val,
            'template_match_loc': max_loc,
            'mesh_address': mesh_address,
            'above_threshold': above_threshold,
            'interesting_score': interesting_score,
        }
        cell_stats_key = str(mesh_address[0]) + '-' + str(mesh_address[1])
        match_stats['cell_stats'][cell_stats_key] = cell_stats_obj

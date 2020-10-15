import cv2
import math
import imutils
import numpy as np


class MeshMatchFinder:

    def __init__(self, mesh_match_meta):
        self.mesh_match_meta = mesh_match_meta
        self.debug = True

    def match_mesh(self, mesh, most_recent_t1_frameset, cv2_image):
        match_obj = {}

# try to match against whats in cv2_image, but at most_recent_t1_frameset's location
# if match_found:
#    build a match object and return it
#
# percent_that_needs_to_match = 25%
# 
# build a list of all mesh cells, ranked by interestingness, descending
# for mesh_cell in cells_by_popularity: 
#     mesh_cell_position = (get the position somehow)
#     potential_cell_matches = find_matches(mesh_cell, cv2_image)
#     for pc_match in potential_cell_matches:
#         anchor_percent = pc_match['percent']
#         score_for_rest = self.match_around_pivot(pc_match, mesh_cell_position, mesh, cv2_image)
#         if anchor_percent + score_for_rest >= percent_that_needs_to_match:
#             build a match object and return it
#             # TODO.  if we want to have multiple submatches, then remove the mesh cells that match here
#             #        from cells_by_popularity, then recurse and do this same call

        return match_obj

    def build_mesh(self, most_recent_t1_frameset, most_recent_cv2_image):
        print('building a mesh for {}'.format(most_recent_t1_frameset))
        print('meta is {}'.format(self.mesh_match_meta))
        match_element = self.get_desired_frameset_element(most_recent_t1_frameset)
        self.mesh = []
        if 'size' in match_element:
            t1_size = match_element['size']
            self.debug_mask_image = np.zeros((t1_size[1], t1_size[0], 3), dtype='uint8')
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
                self.mesh.append(build_mesh_row)
        if self.debug:
            cv2.imwrite('/Users/dcaulton/Desktop/debug_mask_image.png', self.debug_mask_image)

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
#        (T, copy) = cv2.threshold(copy, 200, 255, cv2.THRESH_BINARY_INV)
        (T, copy) = cv2.threshold(copy, 200, 255, cv2.THRESH_BINARY)
        cnts = cv2.findContours(
            copy,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        cnts = imutils.grab_contours(cnts)
#        fn = '/Users/dcaulton/Desktop/{}-{}--{}--dumb.png'.format(row_num, col_num, len(cnts))
#        cv2.imwrite(fn, copy)

        return len(cnts)


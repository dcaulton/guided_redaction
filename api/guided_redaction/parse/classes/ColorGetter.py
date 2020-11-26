import cv2
import numpy as np

class ColorGetter:

    def __init__(self, args):
        self.cv2_image = args.get("cv2_image")
        self.start = tuple(args.get("start", (0, 0)))
        self.end = tuple(args.get("end", (0, 0)))
        self.selection_grower_meta = args.get('selection_grower_meta')

        if 'hist_bin_count' in self.selection_grower_meta:
            self.hist_bin_count = int(self.selection_grower_meta['hist_bin_count'])
        else:
            self.hist_bin_count = 8

        if 'min_num_pixels' in self.selection_grower_meta:
            self.min_num_pixels = int(self.selection_grower_meta['min_num_pixels'])
        else:
            self.min_num_pixels = 8

    def get_colors(self):
        build_colors = {}
        copy = self.cv2_image.copy()
        copy = copy[
            self.start[1]:self.end[1],
            self.start[0]:self.end[0]
        ]
        hist = cv2.calcHist(
            [copy], 
            [0, 1, 2],
            None,
            (self.hist_bin_count, self.hist_bin_count, self.hist_bin_count),
            [0, 256, 0, 256, 0, 256]
        )

        flat_hist = hist.flatten()
        sortedIndex = np.argsort(hist.flatten())
        for i in range(len(sortedIndex)-1, 0, -1):
            index = sortedIndex[i]
            score = flat_hist[index]
            if score < self.min_num_pixels:
                break
            print('score for index {} is {}'.format(index, score))
                
            k = int(index / (self.hist_bin_count * self.hist_bin_count))
            if k < 0:
                k = 0
            j = int((index % (self.hist_bin_count * self.hist_bin_count)) / self.hist_bin_count)
            if j < 0:
                j = 0
            i = int(index - j * self.hist_bin_count - k * self.hist_bin_count * self.hist_bin_count)
            if i < 0:
                i = 0
            rgb_val = [
                i * int(256 / self.hist_bin_count), 
                j * int(256 / self.hist_bin_count), 
                k * int(256 / self.hist_bin_count)
            ]
            color_key = str(rgb_val[0]) + '-' + str(rgb_val[1]) + '-' + str(rgb_val[2])
            tolerance = int(( 3 * (256/self.hist_bin_count)**2 )**.5)
            low_value = [
                max(0, rgb_val[0] - tolerance),
                max(0, rgb_val[1] - tolerance),
                max(0, rgb_val[2] - tolerance)
            ]
            high_value = [
                min(255, rgb_val[0] + tolerance),
                min(255, rgb_val[1] + tolerance),
                min(255, rgb_val[2] + tolerance)
            ]
            build_obj = {
                'whitelist_or_blacklist': 'whitelist',
                'thickness': 0,
                'tolerance': tolerance,
                'value': rgb_val,
                'low_value': low_value,
                'high_value': high_value,
            }
            build_colors[color_key] = build_obj
        return build_colors

#            k = index / (WIDTH * HEIGHT)
#            j = (index % (WIDTH * HEIGHT)) / WIDTH
#            i = index - j * WIDTH - k * WIDTH * HEIGHT

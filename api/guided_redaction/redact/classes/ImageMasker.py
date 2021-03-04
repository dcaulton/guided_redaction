import cv2
import numpy as np
import math


class ImageMasker:

    def mask_all_regions(self, source, regions_to_mask, mask_method):
        output = source.copy()
        mask = np.zeros((output.shape[0], output.shape[1]))
        combine_via_mask = False
        if output.shape[2] == 3:
            black_mask_color = (0, 0, 0)
            green_mask_color = (0, 255, 0)
        else:  # assume shape=1, grayscale
            black_mask_color = 0
            green_mask_color = 128
        
        for masking_region in regions_to_mask:
            mask_method = mask_method or "blur_7x7"
            if mask_method == "black_rectangle":
                cv2.rectangle(
                    output,
                    masking_region["start"],
                    masking_region["end"],
                    black_mask_color,
                    -1,
                )
            elif mask_method == "green_outline":
                cv2.rectangle(
                    output,
                    masking_region["start"],
                    masking_region["end"],
                    green_mask_color,
                    2,
                )
            elif mask_method == "background_color":
                background_color = self.get_background_color(output, masking_region)
                cv2.rectangle(
                    output,
                    masking_region["start"],
                    masking_region["end"],
                    background_color,
                    -1,
                )
            elif mask_method in ("blur_7x7", "blur_21x21", "blur_median"):
                cv2.rectangle(
                    mask, masking_region["start"], masking_region["end"], (255), -1
                )
                if mask_method == "blur_7x7":
                    altered = cv2.blur(output, (7, 7))
                if mask_method == "blur_21x21":
                    altered = cv2.blur(output, (21, 21))
                elif mask_method == "blur_median":
                    altered = cv2.medianBlur(output, 7)
                output[np.where(mask == 255)] = altered[np.where(mask == 255)]

        return output

    def get_background_color(self, image, masking_region):
        i2 = image[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ]
        if image.shape[2] == 3:
            hist = cv2.calcHist(
                [i2], 
                [0, 1, 2], 
                None, 
                [32, 32, 32], 
                [0, 256, 0, 256, 0, 256]
            )

# Soon, we're going to want to get the color of the text too.  
#  the below gets the second most popular color, but I think there's more to it.
#  bg color and headers will be large, contiguous regions.  Text should be less
#  like that
#            indices =  np.argpartition(hist.flatten(), -2)[-2:]
#            top_two = np.vstack(np.unravel_index(indices, hist.shape)).T
#            return top_two
#            print('googly {}'.format(thing))
#            return (thing[0] * 8 + (4, 4, 4))
# above was based on this code:
# https://stackoverflow.com/questions/26603747/get-the-indices-of-n-highest-values-in-an-ndarray

            max_offset = np.argmax(hist)
            z = math.floor(max_offset / 1024)
            x_plus_y = max_offset - (z * 1024)
            y = x_plus_y % 32
            x = math.floor(x_plus_y / 32)
            blue = int((z * 8) + 4)
            green = int((x * 8) + 4)
            red = int((y * 8) + 4)
            return (blue, green, red)
        else:  # assume shape=1, grayscale
            hist = cv2.calcHist(
                [i2], 
                [0], 
                None, 
                [32], 
                [0, 256]
            )
            max_offset = np.argmax(hist)
            return (max_offset)


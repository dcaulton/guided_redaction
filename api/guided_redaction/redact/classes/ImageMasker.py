import cv2
import imutils
import numpy as np
import math


class ImageMasker:
    def __init__(self):
        pass

    def get_background_color(self, image):
        return_value = None
        if image.shape[2] == 3:
            hist = cv2.calcHist(
                [image],
                [0, 1, 2],
                None,
                [32, 32, 32],
                [0, 256, 0, 256, 0, 256]
            )

            max_offset = np.argmax(hist)
            z = math.floor(max_offset / 1024)
            x_plus_y = max_offset - (z * 1024)
            y = x_plus_y % 32
            x = math.floor(x_plus_y / 32)
            blue = int((z * 8) + 4)
            green = int((x * 8) + 4)
            red = int((y * 8) + 4)

            return_value = (blue, green, red)
        else:  # assume shape=1, grayscale
            hist = cv2.calcHist(
                [i2],
                [0],
                None,
                [32],
                [0, 256]
            )
            max_offset = np.argmax(hist)
            return_value = (max_offset)
        print('bg color is {}'.format(return_value))
        return return_value

    def mask_all_regions(
        self, source, regions_to_mask, mask_method, blur_foreground_background
    ):
        output = source.copy()
        mask = np.zeros((output.shape[0], output.shape[1]))
        combine_via_mask = False
        if output.shape[2] == 3:
            black_mask_color = (0, 0, 0)
            green_mask_color = (0, 255, 0)
        else:  # assume shape=1, grayscale
            black_mask_color = 0
            green_mask_color = 128
        if blur_foreground_background == "foreground":
            for region_number, masking_region in enumerate(regions_to_mask):
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
                elif mask_method in ("blur_7x7", "blur_21x21", "blur_median"):
                    combine_via_mask = True
                    cv2.rectangle(
                        mask, masking_region["start"], masking_region["end"], (255), -1
                    )

            if combine_via_mask:
                if mask_method == "blur_7x7":
                    altered = cv2.blur(output, (7, 7))
                if mask_method == "blur_21x21":
                    altered = cv2.blur(output, (21, 21))
                elif mask_method == "blur_median":
                    altered = cv2.medianBlur(output, 7)
                output[np.where(mask == 255)] = altered[np.where(mask == 255)]
        elif blur_foreground_background == "background":
            combine_via_mask = False
            mask_method = mask_method or "blur_7x7"
            image_bottom_right = (output.shape[1], output.shape[0])
            if mask_method == "black_rectangle":
                cv2.rectangle(output, (0, 0), image_bottom_right, black_mask_color, -1)
            elif mask_method == "green_outline":
                cv2.rectangle(output, (0, 0), image_bottom_right, green_mask_color, 2)
            elif mask_method == "blur_7x7":
                combine_via_mask = True
                output = cv2.blur(output, (7, 7))
            elif mask_method == "blur_21x21":
                combine_via_mask = True
                output = cv2.blur(output, (21, 21))
            elif mask_method == "blur_median":
                combine_via_mask = True
                output = cv2.medianBlur(output, 7)

            if not combine_via_mask:
                for masking_region in regions_to_mask:
                    start = masking_region["start"]
                    end = masking_region["end"]
                    output[start[1] : end[1], start[0] : end[0]] = source[
                        start[1] : end[1], start[0] : end[0]
                    ]
            else:
                for masking_region in regions_to_mask:
                    cv2.rectangle(
                        mask, masking_region["start"], masking_region["end"], (255), -1
                    )
                    output[np.where(mask == 255)] = source[np.where(mask == 255)]

        return output

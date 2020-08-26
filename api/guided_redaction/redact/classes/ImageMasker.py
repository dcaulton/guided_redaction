import cv2
import numpy as np


class ImageMasker:
    def __init__(self):
        pass

    def get_horizontal_line_mask(self, image_in):
        gX = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=1, dy=0)
        gY = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=0, dy=1)
        gX = cv2.convertScaleAbs(gX)
        gY = cv2.convertScaleAbs(gY)
        sobelCombined = cv2.addWeighted(gX, 0.5, gY, 0.5, 0)

        x_kernel = np.zeros((3,3), np.uint8)
        x_kernel[1] = [1,1,1]
        y_kernel = np.zeros((3,3), np.uint8)
        y_kernel[0][1] = 1
        y_kernel[1][1] = 1
        y_kernel[2][1] = 1
        hlines = cv2.erode(sobelCombined, x_kernel, iterations=13)
        hlines = cv2.dilate(hlines, y_kernel, iterations=1)
        (T, hlines_thresh) = \
            cv2.threshold(hlines, 100, 255, cv2.THRESH_BINARY_INV)
        return hlines_thresh

    def process_text_eraser(self, output, masking_region):
        print('in process TEXT ERASER')
        big_region = output[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ]

        hlines_thresh = self.get_horizontal_line_mask(big_region)
        cv2.imwrite('/Users/dcaulton/Desktop/thresholded.png', hlines_thresh)


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
                elif mask_method == "text_eraser":
                    self.process_text_eraser(output, masking_region)
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

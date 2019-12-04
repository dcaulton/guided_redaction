import cv2
import numpy as np
import logging


class ImageMasker:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def mask_all_regions(
        self, source, regions_to_mask, mask_method, blur_foreground_background
    ):
        output = source.copy()
        self.logger.warning("mask method is "+ mask_method)
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
                self.logger.warning("masking region"+ str(masking_region))
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

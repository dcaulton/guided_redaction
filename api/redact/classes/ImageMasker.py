import cv2
import numpy as np


class ImageMasker():

    def __init__(self):
        pass

    def mask_all_regions(self, source, regions_to_mask, mask_method):
        output = source.copy()
        print('mask method is ', mask_method)
        mask = np.zeros((output.shape[0], output.shape[1]))
        combine_via_mask = False
        if output.shape[2] == 3:
            black_mask_color = (0, 0, 0)
            green_mask_color = (0, 255, 0)
        else: # assume shape=1, grayscale
            black_mask_color = (0)
            green_mask_color = (128)
        for region_number, masking_region in enumerate(regions_to_mask):
            print('masking region', masking_region);
            mask_method = mask_method or 'blur_7x7'
            if mask_method == 'black_rectangle':
                cv2.rectangle(output, masking_region['start'], masking_region['end'], black_mask_color, -1)
            elif mask_method == 'green_outline':
                cv2.rectangle(output, masking_region['start'], masking_region['end'], green_mask_color, 2)
            elif mask_method in ('blur_7x7', 'blur_21x21', 'blur_median'):
                combine_via_mask = True
                cv2.rectangle(mask, masking_region['start'], masking_region['end'], (255), -1)

        if combine_via_mask:
            if mask_method == 'blur_7x7':
                altered = cv2.blur(output, (7, 7))
            if mask_method == 'blur_21x21':
                altered = cv2.blur(output, (21, 21))
            elif mask_method == 'blur_median':
                altered = cv2.medianBlur(output, 7)
            output[np.where(mask == 255)] = altered[np.where(mask == 255)]

        return output

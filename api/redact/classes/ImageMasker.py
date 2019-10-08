import cv2


class ImageMasker():

    def __init__(self):
        pass

    def mask_all_regions(self, source, regions_to_mask, mask_info):
        output = source.copy()
        for region_number, masking_region in enumerate(regions_to_mask):
            mask_method = mask_info.get('method', 'black_rectangle')
            if mask_method == 'black_rectangle':
                cv2.rectangle(output, masking_region[0], masking_region[1], (0, 0, 0), -1)
            elif mask_method == 'green_outline':
                cv2.rectangle(output, masking_region[0], masking_region[1], (0, 255, 0), 2)
            elif mask_method == 'blur_7x7':
                start_x = masking_region[0][0]
                end_x = masking_region[1][0]
                start_y = masking_region[0][1]
                end_y = masking_region[1][1]
                output[start_y:end_y, start_x:end_x] = \
                    cv2.blur(output[start_y:end_y, start_x:end_x], (7, 7))
        return output

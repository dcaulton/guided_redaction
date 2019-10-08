import cv2


class ImageMasker():

    def __init__(self):
        pass

    def mask_all_regions(self, source, regions_to_mask):
        output = source.copy()
        for region_number, masking_region in enumerate(regions_to_mask):
            print('masking region', masking_region)
            cv2.rectangle(output, masking_region[0], masking_region[1], (0, 255, 0), 2)
        return output

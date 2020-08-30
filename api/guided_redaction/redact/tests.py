from django.test import TestCase

from guided_redaction.redact.classes.ImageMasker import ImageMasker
import numpy as np

class ImageMaskerTestCase(TestCase):

    def setUp(self):
        pass

    def test_image_masker_masks_3channel_image_with_black(self):
        image_masker = ImageMasker()

        cv2_image = np.zeros((200, 200, 3), np.uint8) 
        cv2_image[:,:] = (0, 123, 0)

        num_greens = np.count_nonzero(np.all(cv2_image == (0, 123,0), axis=-1))
        num_blacks = np.count_nonzero(np.all(cv2_image == (0, 0, 0), axis=-1))
        self.assertEquals(num_greens, 40000)
        self.assertEquals(num_blacks, 0)

        areas_to_redact = [
            {
                'start': (30, 40),
                'end': (70, 80),
            },
        ]

        masked_image = image_masker.mask_all_regions(
            cv2_image,
            areas_to_redact,
            {mask_method='black_rectangle'}
        )

        green_pixels = np.all(masked_image == (0, 123,0), axis=-1)
        black_pixels = np.all(masked_image == (0, 0, 0), axis=-1)

        num_greens = np.count_nonzero(green_pixels)
        num_blacks = np.count_nonzero(black_pixels)

        # we supplied a box to redact that is 41x41 - the ranges are inclusive.  
        self.assertEquals(num_greens, 38319)
        self.assertEquals(num_blacks, 1681)

        start_y = np.where(black_pixels)[0][0]   # numpy coordinages are reversed, so x is 1, y is 0
        start_x = np.where(black_pixels)[1][0]
        self.assertEquals(start_x, 30)
        self.assertEquals(start_y, 40)

        end_y = np.where(black_pixels)[0][-1]
        end_x = np.where(black_pixels)[1][-1]  
        self.assertEquals(end_x, 70)
        self.assertEquals(end_y, 80)

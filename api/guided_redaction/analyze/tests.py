from django.test import TestCase

from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
import numpy as np
import cv2

class TemplateMatcherTestCase(TestCase):

    def setUp(self):
        pass

    def draw_orange_text_on_image(self, image, text, coords, font_scale=1):
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontColor = (5,88,205)
        lineType = 2
        cv2.putText(
            image,
            text,
            coords,
            font,
            font_scale,
            fontColor,
            lineType
        )

    def test_template_matcher_unity_scale_close_enough_to_match(self):
        template_matcher = TemplateMatcher({
            'match_percent': .93,
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontScale = 1
        fontColor = (5,88,205)
        lineType = 2

        # NOTE, these coords are specified as X, Y, bottom left corner
        self.draw_orange_text_on_image(source_image, 'Russell', (10, 100))
        self.draw_orange_text_on_image(source_image, 'Russett', (180, 300))
        self.draw_orange_text_on_image(template_image, 'Russek', (0, 30))

        # NOTE: these coords come back as X, Y, upper left corner
        match_obj = template_matcher.get_template_coords(source_image, template_image)

        # Russek is close enough to Russell, it compares at .934
        self.assertEquals(match_obj[0], (10, 70))
        self.assertEquals(match_obj[1], 1)

    def test_template_matcher_unity_scale_not_close_enough_to_match(self):
        # same as test_template_matcher_unity_scale_close_enough_to_match, but with the 
        #    template match threshold numdged up just enough to make this not match
        template_matcher = TemplateMatcher({
            'match_percent': .94,
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontScale = 1
        fontColor = (5,88,205)
        lineType = 2

        self.draw_orange_text_on_image(source_image, 'Russell', (10, 100))
        self.draw_orange_text_on_image(source_image, 'Russett', (180, 300))
        self.draw_orange_text_on_image(template_image, 'Russek', (0, 30))

        match_obj = template_matcher.get_template_coords(source_image, template_image)
        # Russek will not be close enough to Russell, it compares at .934
        self.assertEquals(match_obj, False)

    def test_template_matcher_eighty_percent_scale_with_match(self):
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '+/-25/5',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontScale = 1
        fontColor = (5,88,205)
        lineType = 2

        # NOTE, these coords are specified as X, Y, bottom left corner
        self.draw_orange_text_on_image(source_image, 'Russell', (10, 100))
        self.draw_orange_text_on_image(source_image, 'Russett', (180, 300))
        self.draw_orange_text_on_image(template_image, 'Russell', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_obj = template_matcher.get_template_coords(source_image, template_image)

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj[0], (10, 62))
        self.assertEquals(match_obj[1], .8)

    def test_template_matcher_eighty_percent_scale_no_match(self):
        # same as test_template_matcher_eighty_percent_scale_with_match, but with a template word
        #   that is different enough to not match
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '+/-25/5',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontScale = 1
        fontColor = (5,88,205)
        lineType = 2

        # NOTE, these coords are specified as X, Y, bottom left corner
        self.draw_orange_text_on_image(source_image, 'Russell', (10, 100))
        self.draw_orange_text_on_image(source_image, 'Russett', (180, 300))
        self.draw_orange_text_on_image(template_image, 'Randy', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_obj = template_matcher.get_template_coords(source_image, template_image)

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj, False)

    def test_template_matcher_eighty_percent_scale_no_match_because_scale_not_specified(self):
        # same as test_template_matcher_eighty_percent_scale_with_match, but shows what happens if
        #   you don't request scaling (it failes)
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '1',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 
        font = cv2.FONT_HERSHEY_SIMPLEX
        fontScale = 1
        fontColor = (5,88,205)
        lineType = 2

        # NOTE, these coords are specified as X, Y, bottom left corner
        self.draw_orange_text_on_image(source_image, 'Russell', (10, 100))
        self.draw_orange_text_on_image(source_image, 'Russett', (180, 300))
        self.draw_orange_text_on_image(template_image, 'Russell', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_obj = template_matcher.get_template_coords(source_image, template_image)

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj, False)

from django.test import TestCase

from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
from guided_redaction.analyze.classes.EastPlusTessGuidedAnalyzer import EastPlusTessGuidedAnalyzer 
import numpy as np
import cv2

def draw_text_on_image(
        image, 
        text, 
        coords, 
        font_scale=1,
        font_color= (5,88,205),
        line_type=2
    ):
    font = cv2.FONT_HERSHEY_SIMPLEX
    lineType = 1
    cv2.putText(
        image,
        text,
        coords,
        font,
        font_scale,
        font_color,
        line_type
    )

class TemplateMatcherTestCase(TestCase):

    def setUp(self):
        pass

    def xtest_template_matcher_unity_scale_close_enough_to_match(self):
        template_matcher = TemplateMatcher({
            'match_percent': .93,
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 

        # NOTE, these coords are specified as X, Y, bottom left corner
        draw_text_on_image(source_image, 'Russell', (10, 100))
        draw_text_on_image(source_image, 'Russett', (180, 300))
        draw_text_on_image(template_image, 'Russek', (0, 30))

        # NOTE: these coords come back as X, Y, upper left corner
        match_wrapper = template_matcher.get_template_coords(source_image, template_image)
        match_obj = match_wrapper['match_coords']

        # Russek is close enough to Russell, it compares at .934
        self.assertEquals(match_obj[0], (10, 70))
        self.assertEquals(match_obj[1], 1)

    def xtest_template_matcher_unity_scale_not_close_enough_to_match(self):
        # same as test_template_matcher_unity_scale_close_enough_to_match, but with the 
        #    template match threshold numdged up just enough to make this not match
        template_matcher = TemplateMatcher({
            'match_percent': .94,
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 

        draw_text_on_image(source_image, 'Russell', (10, 100))
        draw_text_on_image(source_image, 'Russett', (180, 300))
        draw_text_on_image(template_image, 'Russek', (0, 30))

        match_wrapper = template_matcher.get_template_coords(source_image, template_image)
        match_obj = match_wrapper['match_coords']
        # Russek will not be close enough to Russell, it compares at .934
        self.assertEquals(match_obj, False)

    def xtest_template_matcher_eighty_percent_scale_with_match(self):
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '+/-25/5',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 

        # NOTE, these coords are specified as X, Y, bottom left corner
        draw_text_on_image(source_image, 'Russell', (10, 100))
        draw_text_on_image(source_image, 'Russett', (180, 300))
        draw_text_on_image(template_image, 'Russell', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_wrapper = template_matcher.get_template_coords(source_image, template_image)
        match_obj = match_wrapper['match_coords']

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj[0], (10, 62))
        self.assertEquals(match_obj[1], .8)

    def xtest_template_matcher_eighty_percent_scale_no_match(self):
        # same as test_template_matcher_eighty_percent_scale_with_match, but with a template word
        #   that is different enough to not match
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '+/-25/5',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 

        # NOTE, these coords are specified as X, Y, bottom left corner
        draw_text_on_image(source_image, 'Russell', (10, 100))
        draw_text_on_image(source_image, 'Russett', (180, 300))
        draw_text_on_image(template_image, 'Randy', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_wrapper = template_matcher.get_template_coords(source_image, template_image)
        match_obj = match_wrapper['match_coords']

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj, False)

    def xtest_template_matcher_eighty_percent_scale_no_match_because_scale_not_specified(self):
        # same as test_template_matcher_eighty_percent_scale_with_match, but shows what happens if
        #   you don't request scaling (it failes)
        template_matcher = TemplateMatcher({
            'match_percent': .9,
            'scale': '1',
        })

        source_image = np.zeros((500, 500, 3), np.uint8) 
        template_image = np.zeros((30, 120, 3), np.uint8) 

        # NOTE, these coords are specified as X, Y, bottom left corner
        draw_text_on_image(source_image, 'Russell', (10, 100))
        draw_text_on_image(source_image, 'Russett', (180, 300))
        draw_text_on_image(template_image, 'Russell', (0, 30), font_scale=.8)

        # NOTE: these coords come back as X, Y, upper left corner
        match_wrapper = template_matcher.get_template_coords(source_image, template_image)
        match_obj = match_wrapper['match_coords']

        # the below indicates that we matched at positioh 10, 62 in the source image, when we reduced
        #   it to 80% of the original size, so 62 ~ .8 * 70, and 10 ~ .8 * 10 (after accounting for aliasing)
        self.assertEquals(match_obj, False)

class EastTessTestCase(TestCase):

    def setUp(self):
        self.wisdom = [
            "Beautiful is better than ugly",
            "Explicit is better than implicit",
            "Simple is better than complex",
            "Complex is better than complicated",
            "Flat is better than nested",
            "Sparse is better than dense",
            "Readability counts",
            "Special cases aren't special enough to break the rules.",
            "Although practicality beats purity.",
            "Errors should never pass silently.",
            "Unless explicitly silenced.",
            "In the face of ambiguity, refuse the temptation to guess.",
            "There should be one-- and preferably only one --obvious way to do it.",
            "Although that way may not be obvious at first unless you're Dutch.",
            "Now is better than never.",
            "Although never is often better than *right* now.",
            "If the implementation is hard to explain, it's a bad idea.",
            "If the implementation is easy to explain, it may be a good idea.",
            "Namespaces are one honking great idea -- let's do more of those!"
        ]

    def xtest_text_is_recognized(self):
        source_image = np.zeros((500, 700, 3), np.uint8) 
        for i, truth in enumerate(self.wisdom[0:5]):
            draw_text_on_image(source_image, truth, (10, 60*(i+1)), font_scale=.85, font_color=(222,222,222), line_type=1)
        analyzer = EastPlusTessGuidedAnalyzer()                                                                     
        recognized_text_areas = analyzer.analyze_text(
            source_image, [(0,0), (530, 320)]
        )
        found = 0
        for rta in recognized_text_areas:
            if (rta['text'] == self.wisdom[0]):
                found += 1
                self.assertTrue(35 < rta['start'][1] < 40)
            if (rta['text'] == self.wisdom[1]):
                found += 1
                self.assertTrue(90 < rta['start'][1] < 95)
            if (rta['text'] == self.wisdom[3]):
                found += 1
                self.assertTrue(210 < rta['start'][1] < 220)
            if (rta['text'] == self.wisdom[4]):
                found += 1
                self.assertTrue(270 < rta['start'][1] < 280)
        self.assertEqual(found, 4)

        # entry 2 is actually found, but it's split into two words and the 'is' part is missing
        #    because the kerning is pretty large

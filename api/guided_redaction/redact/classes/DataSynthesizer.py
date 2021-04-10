import cv2
import numpy as np
import math


class DataSynthesizer:

    def __init__(self, redact_rule):
        self.redact_rule = redact_rule
        self.ocr_vertical_bias = 2 # east tends to return results which are two px higher than their actual location

    def synthesize_data(self, source, regions_to_mask):
        output = source.copy()
        
        for match_obj in regions_to_mask:
            start = tuple(match_obj['location'])
            start = (
                match_obj['location'][0],
                match_obj['location'][1] + self.ocr_vertical_bias,
            )
            end = (
                match_obj['location'][0] + match_obj['size'][0],
                match_obj['location'][1] + match_obj['size'][1] + self.ocr_vertical_bias
            )
            start_for_bg = (
                start[0] - 2,
                start[1] - 2
            )
            end_for_bg = (
                end[0] + 2,
                end[1] + 2
            )
            background_color = self.get_background_color(output, start_for_bg, end_for_bg)
            cv2.rectangle(
                output,
                start, 
                end, 
                background_color,
                -1
            )

            text_color = self.get_text_color(output, start, end)
            synthetic_text = match_obj.get('synthetic_text', 'dflt replce')
            synthetic_text_length_ratio = len(synthetic_text) / len(match_obj['text'])
            bottom_left = (
                match_obj['location'][0],
                match_obj['location'][1] + match_obj['size'][1]
            )
            desired_height = match_obj['size'][1] - 2
            desired_width = (match_obj['size'][0] - 2) * synthetic_text_length_ratio
            font = cv2.FONT_HERSHEY_SIMPLEX
            fontScale = 1
            lineType = 1
            text_width, text_height = cv2.getTextSize(synthetic_text, font, fontScale, lineType)[0]
            fontScale = min(desired_height / text_height, desired_width / text_width) 

            cv2.putText(
                output,
                synthetic_text,
                bottom_left,
                font,
                fontScale,
                text_color,
                lineType
            )

        return output

    def get_background_color(self, image, start, end):
        i2 = image[
          start[1]:end[1],
          start[0]:end[0]
        ]
        if image.shape[2] == 3:
            hist = cv2.calcHist(
                [i2], 
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

    def get_text_color(self, image, start, end):
        # DMC bypassed for now
        return (0, 0, 0)
        i2 = image[
          start[1]:end[1],
          start[0]:end[0]
        ]
        if image.shape[2] == 3:
            hist = cv2.calcHist(
                [i2], 
                [0, 1, 2], 
                None, 
                [5, 5, 5], 
                [0, 256, 0, 256, 0, 256]
            )

# Soon, we're going to want to get the color of the text too.  
#  the below gets the second most popular color, but I think there's more to it.
#  bg color and headers will be large, contiguous regions.  Text should be less
#  like that
#            indices =  np.argpartition(hist.flatten(), -2)[-2:]
#            top_two = np.vstack(np.unravel_index(indices, hist.shape)).T
#            print('top two dinky {} '.format(top_two))
#            return top_two
#            print('googly {}'.format(thing))
#            return (thing[0] * 8 + (4, 4, 4))
# above was based on this code:
# https://stackoverflow.com/questions/26603747/get-the-indices-of-n-highest-values-in-an-ndarray

# better, see this:
#  https://stackoverflow.com/questions/61007763/is-it-possible-to-detect-text-color-position-with-opencv-histogram-in-python

            max_offset = np.argmax(hist)
            print('max offset dinky {} '.format(max_offset))
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


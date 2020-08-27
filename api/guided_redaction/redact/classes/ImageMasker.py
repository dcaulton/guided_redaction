import cv2
import imutils
import numpy as np
import math


class ImageMasker:
    def __init__(self):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.xy_kernel = np.ones((3,3), np.uint8)

    def get_horizontal_line_mask(self, image_in):
        gX = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=1, dy=0)
        gY = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=0, dy=1)
        gX = cv2.convertScaleAbs(gX)
        gY = cv2.convertScaleAbs(gY)
        sobelCombined = cv2.addWeighted(gX, 0.5, gY, 0.5, 0)

        hlines = cv2.erode(sobelCombined, self.x_kernel, iterations=13)
        # this helps for very narrow lines
        hlines = cv2.dilate(hlines, self.y_kernel, iterations=1)

        (T, hlines_thresh) = \
            cv2.threshold(hlines, 100, 255, cv2.THRESH_BINARY_INV)
        cv2.imwrite('/Users/dcaulton/Desktop/hlines_thresh.png', hlines_thresh)
        return hlines_thresh

    def filter_hline_contours(self, hlines_contours, masking_region, debug):
        # TODO these might be good input parameters, or maybe autotuning is better
        min_line_area = 20
        min_line_length = 20
        roi_width = masking_region['end'][0] - masking_region['start'][0]
        roi_height = masking_region['end'][1] - masking_region['start'][1]
        usable_hlines_contours = []
        for contour in hlines_contours:
            area = cv2.contourArea(contour)
            bounding_box = cv2.boundingRect(contour)
            if debug:
                print(' NEW CONTOUR')
                print('   area: {}'.format(area))
                print('   bounding box: {}'.format(bounding_box))
                if bounding_box[2] == roi_width and \
                bounding_box[3] == roi_height:
                    if debug:
                        print('THIS IS THE EXTERIOR BOX, SKIP')
                continue #this one goes around the whole selection
            if area < min_line_area:
                if debug:
                    print('TOO SMALL, SKIP')
                continue
            if bounding_box[2] < min_line_length and \
                bounding_box[0] != 0 and \
                bounding_box[0] < roi_width - bounding_box[2]:
                # its not a short horiz line due to being truncated on 
                #   the right or left edge of the image
                if debug:
                    print('SHORT UNTRUNCATED LINE, SKIP')
                continue
            usable_hlines_contours.append(contour)
            if debug:
                print('========= KEEP IT')
                print(contour)
        return usable_hlines_contours

    def build_eroded_source_image(self, source, background_color):
        # TODO this would be good as a parameter and UI control
        number_of_times_to_erode_source = 2
        source_eroded = source.copy()
        # if light colored letters, do erode, then dilate, 
        # else do dilate then erode
        # we will use < 1/2 full bright to indicate dark bg,
        #   people generally don't use dark text colors on a dark bg
        dilate = getattr(cv2, 'dilate')
        erode = getattr(cv2, 'erode')
        operations = [dilate, erode]
        if source.shape[2] > 1:
            if sum(background_color) <= 382: 
                operations = [erode, dilate]
        else: 
            if sum(background_color) <= 127:
                operations = [erode, dilate]
        print('operations are {}'.format(operations))
        for operation in operations:
            source_eroded = operation(
                source_eroded,
                self.xy_kernel, 
                iterations=number_of_times_to_erode_source
            )
        cv2.imwrite('/Users/dcaulton/Desktop/source_eroded.png', source_eroded)

    def process_text_eraser(self, output, masking_region, replace_with='eroded'):
        roi_copy = output.copy()[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ]
        bg_color = self.get_background_color(roi_copy)
        if replace_with == 'eroded': 
            roi_zones = self.build_eroded_source_image(roi_copy, bg_color)

        hlines_thresh = self.get_horizontal_line_mask(roi_copy)
        hlines_thresh = cv2.cvtColor(hlines_thresh, cv2.COLOR_BGR2GRAY)
        hlines_contours = cv2.findContours(
            hlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        hlines_contours = imutils.grab_contours(hlines_contours)
        usable_hlines_contours = \
            self.filter_hline_contours(hlines_contours, masking_region, debug=False)

        cv2.imwrite('/Users/dcaulton/Desktop/before_contours.png', roi_copy)
        cv2.drawContours(roi_copy, usable_hlines_contours, -1, (0, 255, 0))
        cv2.imwrite('/Users/dcaulton/Desktop/after_contours.png', roi_copy)








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

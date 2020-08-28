import cv2
import imutils
import numpy as np
import sys
np.set_printoptions(threshold=sys.maxsize)
import math


class TextEraser:
    def __init__(self, spec):
        self.x_kernel = np.zeros((3,3), np.uint8)
        self.x_kernel[1] = [1,1,1]
        self.y_kernel = np.zeros((3,3), np.uint8)
        self.y_kernel[0][1] = 1
        self.y_kernel[1][1] = 1
        self.y_kernel[2][1] = 1
        self.xy_kernel = np.ones((3,3), np.uint8)

        if spec and \
            'redact_rule' in spec and \
            'replace_with' in spec['redact_rule'] and \
            spec['redact_rule']['replace_with'] in \
                ['eroded', 'edge_partitioned', 'color_partitioned']:
            self.replace_with = spec['redact_rule']['replace_with']
        else:
            self.replace_with = 'eroded'
        if spec and \
            'redact_rule' in spec and \
            'erode_iterations' in spec['redact_rule']:
            self.erode_iterations = int(spec['redact_rule']['erode_iterations'])
        else:
            self.erode_iterations = 13
        print('replace with is {}'.format(self.replace_with))
        print('erode iterations is {}'.format(self.erode_iterations))

    def mask_all_regions(self, source, regions_to_mask):
        output = source.copy()
        for masking_region in regions_to_mask:
            self.process_one_region(output, masking_region)
        return output

    def process_one_region(self, output, masking_region):
        roi_copy = output.copy()[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ]
        bg_color = self.get_background_color(roi_copy)
        if self.replace_with == 'eroded': 
            zoned_source = self.build_eroded_source_image(roi_copy, bg_color, debug=False)
        elif self.replace_with == 'edge_partitioned': 
            zoned_source = self.build_edge_partitioned_source_image(roi_copy, bg_color)
        elif self.replace_with == 'color_partitioned': 
            zoned_source = self.build_color_partitioned_source_image(roi_copy)

        hlines_thresh = self.get_horizontal_line_mask(roi_copy)
        hlines_thresh = cv2.cvtColor(hlines_thresh, cv2.COLOR_BGR2GRAY)
        hlines_contours = cv2.findContours(
            hlines_thresh,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        hlines_contours = imutils.grab_contours(hlines_contours)
        hlines_contours = \
            self.filter_hline_contours(hlines_contours, masking_region, debug=False)

#        cv2.imwrite('/Users/dcaulton/Desktop/before_contours.png', roi_copy)
        self.draw_contours_with_color(zoned_source, hlines_contours, roi_copy, bg_color)
#        cv2.imwrite('/Users/dcaulton/Desktop/after_contours.png', zoned_source)
        output[
          masking_region['start'][1]:masking_region['end'][1],
          masking_region['start'][0]:masking_region['end'][0]
        ] = zoned_source

    def build_color_partitioned_source_image(self, source):
        print('building color partioned source BABY')
        top_5 = self.get_top_5_colors(source)

    def get_top_5_colors(self, image):
        return_value = None
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
        print('bg color the old way is {}'.format(return_value))

#        print(hist)

        indices =  np.argpartition(hist.flatten(), -5)[-5:]
        x = np.vstack(np.unravel_index(indices, hist.shape)).T
        # what these are is an array of 5 things, the last is the biggest
        # each thing has the three buckets, so 
        # [22 25 12] = COLOR [(21*8+4), (24*4+4), (11*8+4)]
        #   = [172 196 92], and it's plus or minus 4 on all three of those

        print(x)





        return return_value

    def build_edge_partitioned_source_image(self, source, bg_color):
        # TODO We need to be smarter about bg color here.  We should use all
        #   the pixels that are NOT covered by a contour
        scan_img = source.copy()

        cv2.GaussianBlur(scan_img, (13, 13), 0)
        cv2.imwrite('/Users/dcaulton/Desktop/blessy.png', scan_img)
        s2 = imutils.auto_canny(scan_img)
        cv2.imwrite('/Users/dcaulton/Desktop/tommy.png', s2)

        partition_contours = cv2.findContours(
            s2,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE
        )
        partition_contours = imutils.grab_contours(partition_contours)
        enclosed_partition_contours, contours_touching_edge = \
            self.filter_edge_partition_contours(
                partition_contours, 
                scan_img.shape, 
                debug=True)

        build_img = source.copy()
        cv2.rectangle(
            build_img,
            (0, 0),
            (build_img.shape[1], build_img.shape[0]),
            bg_color,
            -1
        )

        cv2.drawContours(build_img, enclosed_partition_contours, -1, (0, 255, 0), 2)
        for contour in contours_touching_edge:
            bounding_box = cv2.boundingRect(contour)
            contour_image = source.copy()[
                bounding_box[1]:bounding_box[1]+bounding_box[3],
                bounding_box[0]:bounding_box[0]+bounding_box[2],
            ]
            contour_bg_color = self.get_background_color(contour_image)
            cv2.rectangle(
                build_img,
                (bounding_box[0], bounding_box[1]),
                (bounding_box[0]+bounding_box[2], bounding_box[1]+bounding_box[3]),
                contour_bg_color,
                -1
            )
#        cv2.imwrite('/Users/dcaulton/Desktop/binky.png', build_img)
        return build_img

    def filter_edge_partition_contours(
        self, 
        partition_contours, 
        build_image_shape, 
        debug
    ):
        # TODO these might be good input parameters, or maybe autotuning is better
        min_partition_area = 400
        min_line_length = 10
        roi_width = build_image_shape[1]
        roi_height = build_image_shape[0]
        enclosed_partition_contours = []
        contours_touching_edge = []
        for contour in partition_contours:
            bounding_box = cv2.boundingRect(contour)
            bb_area = int(bounding_box[2]) * int(bounding_box[3])
            if debug:
                print(' NEW PARTITION CONTOUR')
                print('   area: {}'.format(bb_area))
                print('   bounding box: {}'.format(bounding_box))
            if bb_area < min_partition_area:
                if debug:
                    print('TOO LITTLE AREA, SKIP')
                continue
            if bounding_box[2] < min_line_length and \
                not self.bb_touches_edge(bounding_box, roi_width, roi_height):
                if debug:
                    print('NOT LONG ENOUGH, SKIP')
                continue
            # TODO do a convex hull here, see if it's smaller than the bounding rect.
            #  if so it's some non-rectilinear shape and we're gonna ignore it.
            if self.contour_touches_edge_twice(contour, roi_width, roi_height):
                contours_touching_edge.append(contour)
                if debug:
                    print('========= ADDING EDGE TOUCHER')
            else:
                enclosed_partition_contours.append(contour)
                if debug:
                    print('========= ADDING ENCLOSED')
                
        return enclosed_partition_contours, contours_touching_edge

    def bb_touches_edge(self, bounding_box, roi_width, roi_height):
        if bounding_box[0] == 0:
            return True
        if bounding_box[0] + bounding_box[2] == roi_width - 1:
            return True 
        if bounding_box[1] == 0:
            return True
        if bounding_box[1] + bounding_box[3] == roi_height - 1:
            return True 
        return False

    def contour_touches_edge_twice(self, contour, roi_width, roi_height):
        touch_count = 0
        print(len(contour))
        for point in contour:
            if point[0][0] == 0:
                touch_count += 1
                continue
            if point[0][0] == roi_width - 1:
                touch_count += 1
                continue
            if point[0][1] == 0:
                touch_count += 1
                continue
            if point[0][1]  == roi_height - 1:
                touch_count += 1
                continue
        return touch_count >= 2

    def draw_contours_with_color(self, target_image, contours, source_image, bg_color):
        for contour in contours:
            bounding_box = cv2.boundingRect(contour)
            center_x = math.floor(bounding_box[0] + bounding_box[2]/2)
            center_y = math.floor(bounding_box[1] + bounding_box[3]/2)
            xcolor = tuple(source_image[center_y, center_x])
            color = (int(xcolor[0]), int(xcolor[1]), int(xcolor[2]))
            thickness = math.floor(bounding_box[3] / 4)
            if thickness < 1:
                thickness = 1
            # quick and dirty fix for really thin lines that are close to the same
            #  color as the bg.  Assume we have a quantize/anti aliasing error and 
            #  fell on a bg pixel when trying to get a line pixel
            if (
                abs(color[0] - bg_color[0]) + 
                abs(color[1] - bg_color[1]) + 
                abs(color[2] - bg_color[2])
            ) < 200:
                if self.is_dark(bg_color):
                    color = (255, 255, 255)
                else:
                    color = (0, 0, 0)
            start_coords = (bounding_box[0], center_y)
            end_coords = (bounding_box[0] + bounding_box[2], center_y)
            cv2.line(
                target_image,
                start_coords,
                end_coords,
                color,
                thickness
            )
#        cv2.imwrite('/Users/dcaulton/Desktop/classy.png', target_image)

    def is_dark(self, color):
        if int(color[0]) + int(color[1]) + int(color[2]) <= 382:
            return True

    def get_horizontal_line_mask(self, image_in):
        gX = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=1, dy=0)
        gY = cv2.Sobel(image_in, ddepth=cv2.CV_64F, dx=0, dy=1)
        gX = cv2.convertScaleAbs(gX)
        gY = cv2.convertScaleAbs(gY)
        sobelCombined = cv2.addWeighted(gX, 0.5, gY, 0.5, 0)

        hlines = cv2.erode(
            sobelCombined, 
            self.x_kernel, 
            iterations=self.erode_iterations
        )

        # this helps for very narrow lines
        hlines = cv2.dilate(hlines, self.y_kernel, iterations=1)

        (T, hlines_thresh) = \
            cv2.threshold(hlines, 100, 255, cv2.THRESH_BINARY_INV)
        # paint the left and right edges white, so horizontal lines dont 
        #  hit the edge.  When they do, the system will make one big contour
        #  that goes around the image perimeter, then the hlines perimeter
        # we discard the image perimeter one so we don't want to dump these 
        #  hlines with the bathwater
        hlines_thresh[:,0] = (255, 255, 255)
        hlines_thresh[:,hlines.shape[1]-1] = (255, 255, 255)
#        cv2.imwrite('/Users/dcaulton/Desktop/hlines_thresh.png', hlines_thresh)
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
                    print('EXTERIOR BOX, SKIP')
                continue #this one goes around the whole selection
            if area < min_line_area:
                if debug:
                    print('TOO LITTLE AREA, SKIP')
                continue
            if bounding_box[2] < min_line_length:
                if debug:
                    print('TOO SHORT, SKIP')
                continue
            usable_hlines_contours.append(contour)
            if debug:
                print('========= KEEP IT')
                print(contour)

        return usable_hlines_contours

    def build_eroded_source_image(self, source, background_color, debug=False):
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
            if self.is_dark(background_color):
                operations = [erode, dilate]
        else: 
            if sum(background_color) <= 127:
                operations = [erode, dilate]
        if debug:
            print('operations are {}'.format(operations))
        for operation in operations:
            source_eroded = operation(
                source_eroded,
                self.xy_kernel, 
                iterations=number_of_times_to_erode_source
            )
#        if debug:
#            cv2.imwrite('/Users/dcaulton/Desktop/source_eroded.png', source_eroded)
        return source_eroded

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

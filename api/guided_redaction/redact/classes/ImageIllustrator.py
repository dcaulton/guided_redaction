import cv2
import numpy as np


class ImageIllustrator:
    def __init__(self):
        pass

    def illustrate(self, cv2_image, illustrate_data):
        illustrated_image = cv2_image
        ill_type = illustrate_data.get('type')
        color_in = illustrate_data.get('color', '#00FF00')
        color_red = int('0x' + color_in[5:7], 16)
        color_green = int('0x' + color_in[3:5], 16)
        color_blue = int('0x' + color_in[1:3], 16)
        color = (color_red, color_green, color_blue)
        shade_outside = illustrate_data.get('shade_outside', False)
        line_width = int(illustrate_data.get('line_width', 5))
        background_darken_ratio = float(illustrate_data.get('background_darken_ratio', .5))
        beta = float(1.0 - background_darken_ratio)
        if ill_type == 'oval':
            center = illustrate_data.get('center')
            radius_x = illustrate_data.get('radius_x')
            radius_y = illustrate_data.get('radius_y')
            (centerX, centerY) = (int(center[0]), int(center[1]))
            (axesX, axesY) = (int(radius_x), int(radius_y))
            illustrated_image = cv2_image.copy()
            if shade_outside:
                overlay = np.zeros(cv2_image.shape, dtype='uint8')
                cv2.ellipse(overlay, (centerX, centerY), (axesX, axesY), 0.0, 0.0, 360.0, (255, 255, 255), -1)
                highlighted_region_only = cv2.bitwise_and(overlay, illustrated_image)
                illustrated_image = cv2.addWeighted(
                    highlighted_region_only,
                    background_darken_ratio,
                    illustrated_image,
                    beta,
                    0,
                    illustrated_image
                )
            illustrated_image = cv2.ellipse(
                illustrated_image,
                (centerX, centerY),
                (axesX, axesY),
                0.0,
                0.0,
                360.0,
                color,
                line_width
            )

        elif ill_type == 'box':
            start = illustrate_data.get('start')
            end = illustrate_data.get('end')
            (startX, startY) = (int(start[0]), int(start[1]))
            (endX, endY) = (int(end[0]), int(end[1]))
            illustrated_image = cv2_image.copy()
            if shade_outside:
                overlay = np.zeros(cv2_image.shape, dtype='uint8')
                cv2.rectangle(overlay, (startX, startY), (endX, endY), (255, 255, 255), -1)
                highlighted_region_only = cv2.bitwise_and(overlay, illustrated_image)
                illustrated_image = cv2.addWeighted(
                    highlighted_region_only,
                    background_darken_ratio,
                    illustrated_image,
                    beta,
                    0,
                    illustrated_image
                )
            illustrated_image = cv2.rectangle(
                illustrated_image,
                (startX, startY),
                (endX, endY),
                color,
                line_width
            )

        else:
            print('unknown illustration type')
        return illustrated_image


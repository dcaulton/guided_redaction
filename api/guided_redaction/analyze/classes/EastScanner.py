import cv2
from imutils.object_detection import non_max_suppression
import math
import numpy as np
from server import settings
import time


class EastScanner:

    path_to_east_text_detector = settings.REDACT_EAST_FILE_PATH
    min_confidence = 0.5

    def __init__(self):
        pass

    def get_areas_to_redact(self, source, input_filename, telemetry_data):
        textareas = self.get_text_areas_from_east(source)
        return textareas

    def get_text_areas_from_east(self, source):
        print("performing text detection with EAST")
        image = source.copy()

        # EAST requires h and w to be multiples of 32
        H, W = image.shape[:2]
        resized_height = H - (H % 32)
        resized_width = W - (W % 32)
        rW = W / float(resized_width)
        rH = H / float(resized_height)
        image = cv2.resize(image, (resized_width, resized_height))
        (H, W) = image.shape[:2]

        layerNames = ["feature_fusion/Conv_7/Sigmoid", "feature_fusion/concat_3"]

        # load the pre-trained EAST detector
        net = cv2.dnn.readNet(self.path_to_east_text_detector)

        # construct a blob from the image and then perform a forward pass of
        #   the model to obtain the two output layer sets
        blob = cv2.dnn.blobFromImage(
            image, 1.0, (W, H), (123.68, 116.78, 103.94), swapRB=True, crop=False
        )
        start = time.time()
        net.setInput(blob)
        (scores, geometry) = net.forward(layerNames)
        end = time.time()
        print("text detection took"+ str(int(math.ceil(end - start)))+ " seconds")

        (numRows, numCols) = scores.shape[2:4]
        rects = []
        confidences = []

        for y in range(0, numRows):
            # extract the scores(probabilities), followed by the geometry
            # data used to derive potential bounding box coordinates that
            # surround text
            scoresData = scores[0, 0, y]
            xData0 = geometry[0, 0, y]
            xData1 = geometry[0, 1, y]
            xData2 = geometry[0, 2, y]
            xData3 = geometry[0, 3, y]
            anglesData = geometry[0, 4, y]

            for x in range(0, numCols):
                if scoresData[x] < self.min_confidence:
                    continue
                (offsetX, offsetY) = (x * 4.0, y * 4.0)
                angle = anglesData[x]
                cos = np.cos(angle)
                sin = np.sin(angle)
                h = xData0[x] + xData2[x]
                w = xData1[x] + xData3[x]
                endX = int(offsetX + (cos * xData1[x]) + (sin * xData2[x]))
                endY = int(offsetY - (sin * xData1[x]) + (cos * xData2[x]))
                startX = int(endX - w)
                startY = int(endY - h)
                rects.append((startX, startY, endX, endY))
                confidences.append(scoresData[x])

        boxes = non_max_suppression(np.array(rects), probs=confidences)

        text_areas = []
        for (startX, startY, endX, endY) in boxes:
            startX = int(startX * rW)
            startY = int(startY * rH)
            endX = int(endX * rW)
            endY = int(endY * rH)
            text_areas.append([(startX, startY), (endX, endY)])

        print("text detection complete")
        return text_areas

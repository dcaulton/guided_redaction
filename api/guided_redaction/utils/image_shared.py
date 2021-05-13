import base64
import cv2
import numpy as np

def get_base64_image_string(cv2_image):
    image_bytes = cv2.imencode(".png", cv2_image)[1].tostring()
    image_base64 = base64.b64encode(image_bytes)
    image_base64_string = image_base64.decode('utf-8')
    return image_base64_string

def get_cv2_image_from_base64_string(img_base64):
    img_bytes = base64.b64decode(img_base64)
    nparr = np.fromstring(img_bytes, np.uint8)
    cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return cv2_image

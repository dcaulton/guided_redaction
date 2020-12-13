from .controller_t1 import T1Controller                                         
from guided_redaction.analyze.classes.GetScreens import GetScreens


class GetScreensController(T1Controller):

    def get_screens(self, request_data):
        response_data = {}
        image_url = request_data.get('image_url')
        generate_statistics = request_data.get('generate_statistics', True)
        cv2_image = self.get_cv2_image_from_url(image_url)
        get_screens_worker = GetScreens(generate_statistics=generate_statistics)
        response_data = get_screens_worker.get_screens(cv2_image)
        return response_data

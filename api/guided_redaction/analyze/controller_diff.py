from .controller_t1 import T1Controller


class DiffController(T1Controller):

    def __init__(self):
        self.debug = False

    def find_diff(self, request_data):
        response_obj = self.get_empty_t1_response_obj()
        return response_obj


class FocusFinder:

    def __init__(self, focus_finder_meta, *args, **kwargs):
        super(FocusFinder, self).__init__(*args, **kwargs)
        self.focus_finder_meta = focus_finder_meta
        self.debug = focus_finder_meta.get('debug', False)

    def find_focus(self, cv2_image, prev_cv2_image, ocr_matches_in, prev_ocr_matches_in, other_t1_matches_in):
        match_obj = {}
        match_stats = {}
        masks = {}

        return match_obj, match_stats, masks 


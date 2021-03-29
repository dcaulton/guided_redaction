import cv2
import numpy as np
import imutils


class DataSifterRedactor:

    def __init__(self, data_sifter_meta, *args, **kwargs):
        super(DataSifter, self).__init__(*args, **kwargs)
        self.data_sifter_meta = data_sifter_meta
        self.debug = data_sifter_meta.get('debug', False)
        self.app_data = self.data_sifter_meta
        self.ocr_rowcol_maker = OcrRowColMaker()
        self.min_app_score = 200
        self.fuzz_match_threshold = 70
        self.fast_pass_app_score_threshold = 500

    def redact_or_replace(self, cv2_image, match_obj):
        for match_obj_id in match_obj:
            one_match_record = match_obj[match_obj_id]


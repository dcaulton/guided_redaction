class OcrMovieAnalyzer:

    def __init__(self, debug=False):
        self.debug = debug

    def collect_one_frame(self, rtas):
        apps = {}
        sorted_rtas = self.order_recognized_text_areas_by_geometry(rtas)

        return_obj = {
            'apps': apps,
            'sorted_rtas': sorted_rtas,
        }
        return return_obj

    def order_recognized_text_areas_by_geometry(self, raw_rtas):
        response_rtas = []
        rtas_by_id = {}
        for rta in raw_rtas:
            rtas_by_id[rta['id']] = rta
        rows = sorted(raw_rtas, key = lambda i: i['start'][1])
        # merge rows that are only a few pixels off from each others
        current_y = -200
        row_y_bunches = {}
        for row in rows:
            if row['start'][1] - current_y > 10:
                current_y = row['start'][1]
                row_y_bunches[current_y] = [row['id']]
                continue
            row_y_bunches[current_y].append(row['id'])
        for rco_key in sorted(row_y_bunches.keys()):
            x_keys = []
            for rta_id in row_y_bunches[rco_key]:
                x_keys.append(rtas_by_id[rta_id])
            x_keys_sorted = sorted(x_keys, key = lambda i: i['start'][0])
            response_rtas.append(x_keys_sorted)

        if self.debug:
            print('==========================ocr rta rows bunched by y, then sorted by x:')
            for row in response_rtas:
                print('----------- new row')
                for rta in row:
                    print('{} {}'.format(rta['start'], rta['text']))
            
        return response_rtas

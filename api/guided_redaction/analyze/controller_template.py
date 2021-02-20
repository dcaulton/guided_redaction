import cv2
from django.conf import settings
from guided_redaction.utils.classes.FileWriter import FileWriter
from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher


class TemplateController(T1Controller):

    def __init__(self):
        self.file_writer = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        self.template = None

    def scan_template(self, request_data):
        matches = {'movies': {}}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
          source_movies = movies['source']
          del movies['source']
        template_id = list(request_data['tier_1_scanners']['template'].keys())[0]
        self.template = request_data['tier_1_scanners']['template'][template_id]
        template_matcher = TemplateMatcher(self.template)
        match_app_id = ''
        if 'app_id' in self.template['attributes']:
            match_app_id = self.template['attributes']['app_id']
        match_statistics = {}
        for anchor in self.template.get("anchors"):
            anchor_image = template_matcher.get_match_image_for_anchor(anchor)
            start = anchor.get("start")
            end = anchor.get("end")
            size = (end[0] - start[0], end[1] - start[1])
            anchor_id = anchor.get("id")
            if 'movies' not in match_statistics:
                match_statistics = {'movies': {}}
            for movie_url in movies:
                if movie_url not in match_statistics['movies']:
                    match_statistics['movies'][movie_url] = {'framesets': {}}
                movie = movies[movie_url]
                if not movie:
                    print('no movie error for {}'.format(movie_url))
                    continue
                framesets = movie["framesets"]
                for frameset_hash in framesets:
                    print('scanning frameset {}'.format(frameset_hash))
                    frameset = framesets[frameset_hash]
                    if match_app_id:
                        frameset_contains_app = False
                        all_match_objs_have_app_ids = True
                        for match_obj_key in frameset:
                            match_obj = frameset[match_obj_key]
                            if 'app_id' in match_obj:
                                if match_obj['app_id'] == match_app_id:
                                    frameset_contains_app = True
                            else:
                                all_match_objs_have_app_ids = False
                        if all_match_objs_have_app_ids and not frameset_contains_app:
                            continue

                    self.build_matches_for_one_frameset(
                        size, anchor_image, anchor_id, movie_url, matches, match_statistics, frameset_hash, 
                        frameset, source_movies, template_matcher
                    )
        matches['statistics'] = match_statistics
        return matches

    def build_matches_for_one_frameset(self, size, anchor_image, anchor_id, movie_url, matches, match_statistics, 
            frameset_hash, frameset, source_movies, template_matcher):
        if frameset_hash not in match_statistics['movies'][movie_url]['framesets']:
            match_statistics['movies'][movie_url]['framesets'][frameset_hash] = {}
        if 'images' in frameset:
            one_image_url = frameset["images"][0]
        else:
            one_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]

        target_image = self.get_cv2_image_from_url(one_image_url, self.file_writer)
        if type(target_image) == type(None):
            print('error loading template source image')
            return
        target_image = self.trim_target_image_to_t1_inputs(target_image, frameset)
        match_obj = template_matcher.get_template_coords(
            target_image, anchor_image, anchor_id, movie_url
        )
        match_statistics['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = \
            match_obj['match_metadata']
        match_counter = 0
        while match_obj['match_found']:
            (match_coords, match_scale) = match_obj['match_coords']
            if movie_url not in matches['movies']:
                matches['movies'][movie_url] = {}
                matches['movies'][movie_url]['framesets'] = {}
            if frameset_hash not in matches['movies'][movie_url]['framesets']:
                matches['movies'][movie_url]['framesets'][frameset_hash] = {}

            build_obj = {
                'location': match_coords,
                'size': size,
                'scale': match_scale,
                'anchor_id': anchor_id,
                'scanner_type': 'template',
            }
            build_key = '{}-{}'.format(anchor_id, match_counter)
            matches['movies'][movie_url]['framesets'][frameset_hash][build_key] = build_obj

            if self.template['fetch_multiple'] == 'yes':
                end_coords = (
                    match_coords[0] + size[0],
                    match_coords[1] + size[1]
                )
                # black out where we matched on the target image
                cv2.rectangle(
                    target_image,
                    match_coords,
                    end_coords,
                    (0, 0, 0),
                    -1,
                )
                match_obj = template_matcher.get_template_coords(
                    target_image, anchor_image, anchor_id, movie_url, [match_scale]
                )
                match_counter += 1
            else:
               match_obj['match_found'] = False

    def trim_target_image_to_t1_inputs(self, target_image, tier_1_record):
        if len(tier_1_record.keys()) == 1 and list(tier_1_record.keys())[0] == 'image':
            return target_image # it's a virgin frameset, not t1
        for match_obj_id in tier_1_record:
            match_obj = tier_1_record[match_obj_id]
            if 'mask' in match_obj:
                mask_image = self.get_cv2_image_from_base64_string(match_obj['mask'])
                target_image = cv2.bitwise_and(target_image, mask_image)
                continue
            if 'location' in match_obj  \
                and 'size' in match_obj \
                and match_obj['scanner_type'] == 'selected_area':
                start = match_obj['location']
                end = [
                    match_obj['location'][0] + match_obj['size'][0],
                    match_obj['location'][1] + match_obj['size'][1],
                ]
                height = target_image.shape[0]
                width = target_image.shape[1]
                cv2.rectangle(
                    target_image,
                    (0,0),
                    (start[0], height),
                    (0, 0, 0),
                    -1,
                )
                cv2.rectangle(
                    target_image,
                    (end[0],0),
                    (width, height),
                    (0, 0, 0),
                    -1,
                )
                if len(start) > 1 and type(start[1]) == int:
                    cv2.rectangle(
                        target_image,
                        (0,0),
                        (width, start[1]),
                        (0, 0, 0),
                        -1,
                    )
                    cv2.rectangle(
                        target_image,
                        (start[0],end[1]),
                        (end[0], height),
                        (0, 0, 0),
                        -1,
                    )
                return target_image
        return target_image

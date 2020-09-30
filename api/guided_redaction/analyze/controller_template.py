import cv2
from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
import numpy as np
from django.conf import settings
import requests

requests.packages.urllib3.disable_warnings()


class TemplateController:

    def __init__(self):
        pass

    def scan_template(self, request_data):
        matches = {'movies': {}}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
          source_movies = movies['source']
          del movies['source']
        template_id = list(request_data['tier_1_scanners']['template'].keys())[0]
        template = request_data['tier_1_scanners']['template'][template_id]
        template_matcher = TemplateMatcher(template)
        match_app_id = ''
        if 'app_id' in template['attributes']:
            match_app_id = template['attributes']['app_id']
        match_statistics = {}
        for anchor in template.get("anchors"):
            match_image = template_matcher.get_match_image_for_anchor(anchor)
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
                    if frameset_hash not in match_statistics['movies'][movie_url]['framesets']:
                        match_statistics['movies'][movie_url]['framesets'][frameset_hash] = {}
                    if 'images' in frameset:
                        one_image_url = frameset["images"][0]
                    else:
                        one_image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
                    oi_response = requests.get(
                      one_image_url,
                      verify=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
                    )
                    one_image = oi_response.content
                    if one_image:
                        oi_nparr = np.fromstring(one_image, np.uint8)
                        target_image = cv2.imdecode(oi_nparr, cv2.IMREAD_COLOR)
                        target_image = self.trim_target_image_to_t1_inputs(target_image, frameset)
                        match_obj = template_matcher.get_template_coords(
                            target_image, match_image
                        )
                        match_statistics['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = \
                            match_obj['match_metadata']
                        if match_obj['match_found']:
                            (temp_coords, temp_scale) = match_obj['match_coords']
                            if movie_url not in matches['movies']:
                                matches['movies'][movie_url] = {}
                                matches['movies'][movie_url]['framesets'] = {}
                            if frameset_hash not in matches['movies'][movie_url]['framesets']:
                                matches['movies'][movie_url]['framesets'][frameset_hash] = {}
                            matches['movies'][movie_url]['framesets'][frameset_hash][anchor_id] = {}
                            matches_for_anchor = \
                                matches['movies'][movie_url]['framesets'][frameset_hash][anchor_id]
                            matches_for_anchor['location'] = temp_coords
                            matches_for_anchor['size'] = size
                            matches_for_anchor['scale'] = temp_scale
                            matches_for_anchor['scanner_type'] = 'template'
        matches['statistics'] = match_statistics
        return matches

    #TODO make sure this works, a unit test would be nice
    def trim_target_image_to_t1_inputs(self, target_image, tier_1_record):
        if len(tier_1_record.keys()) == 1 and list(tier_1_record.keys())[0] == 'image':
            return target_image # it's a virgin frameset, not t1
        for t1_subscanner_id in tier_1_record:
            t1_subscanner = tier_1_record[t1_subscanner_id]
            if 'location' in t1_subscanner  \
                and 'size' in t1_subscanner \
                and t1_subscanner['scanner_type'] == 'selected_area':
                start = t1_subscanner['location']
                end = [
                    t1_subscanner['location'][0] + t1_subscanner['size'][0],
                    t1_subscanner['location'][1] + t1_subscanner['size'][1],
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


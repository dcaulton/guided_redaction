from .controller_t1 import T1Controller
from guided_redaction.analyze.classes.MeshMatchFinder import MeshMatchFinder


class MeshMatchController(T1Controller):

    def __init__(self):
        self.debug = True

    def process_mesh_match(self, request_data):
        response_movies = {}
        source_movies = {}
        movies = request_data.get('movies')
        if 'source' in movies:
            source_movies = movies['source']
            del movies['source']
        movie_url = list(movies.keys())[0]
        movie = movies[movie_url]
        source_movie = source_movies[movie_url]

        mesh_match_id = list(request_data["tier_1_scanners"]['mesh_match'].keys())[0]
        mesh_match_meta = request_data["tier_1_scanners"]['mesh_match'][mesh_match_id]

        finder = MeshMatchFinder(mesh_match_meta)

        response_movies[movie_url] = {}
        response_movies[movie_url]['framesets'] = {}
        most_recent_t1_frameset = {}
        most_recent_t1_frameset_hash = ''
        ordered_hashes = self.get_frameset_hashes_in_order(source_movie['frames'], source_movie['framesets'])
        meshes = {}  
        mesh_statistics = {'movies': {}}
        mesh_statistics['movies'][movie_url] = {'framesets': {}}
        for frameset_hash in ordered_hashes:
            if frameset_hash in movie['framesets']:
                most_recent_t1_frameset = movie['framesets'][frameset_hash]
                most_recent_t1_frameset_hash = frameset_hash
                continue
            if not most_recent_t1_frameset:
                continue
            image_url = source_movies[movie_url]['framesets'][frameset_hash]['images'][0]
            if self.debug:
                image_name = image_url.split('/')[-1]
                print('meshmmatch trying image {} with mr hash {}'.format(image_name, most_recent_t1_frameset_hash))
            cv2_image = self.get_cv2_image_from_url(image_url)
            if type(cv2_image) == type(None):
                print('error fetching first image for mesh match')
                continue
            if most_recent_t1_frameset_hash not in meshes:
                mr_image_url = source_movies[movie_url]['framesets'][most_recent_t1_frameset_hash]['images'][0]
                mr_cv2_image = self.get_cv2_image_from_url(mr_image_url)
                if type(mr_cv2_image) == type(None):
                    print('error fetching second image for mesh match')
                    continue
                meshes = {}  # this algo only cares about the most recent one anyway
                meshes[most_recent_t1_frameset_hash] = finder.build_mesh(most_recent_t1_frameset, mr_cv2_image)
            match_obj, match_stats = finder.match_mesh(
                meshes[most_recent_t1_frameset_hash], 
                most_recent_t1_frameset,
                cv2_image
            )
            if match_obj:
                response_movies[movie_url]['framesets'][frameset_hash] = {}
                response_movies[movie_url]['framesets'][frameset_hash][match_obj['id']] = match_obj
            mesh_statistics['movies'][movie_url]['framesets'][frameset_hash] = match_stats
        return response_movies, mesh_statistics

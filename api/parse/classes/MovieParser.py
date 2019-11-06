import cv2
#from cv2 import imread, imwrite, VideoWriter, VideoWriter_fourcc, VideoCapture
from operator import add
import os
import uuid

# Handles getting from a series of images to a movie and vise versa
class MovieParser():

    debug = False
    input_filename = ''
    input_frames_per_second = 1
    output_frames_per_second = 1
    working_dir = ''
    scan_method = ''
    image_hash_size = 8;

    def __init__(self, args):
        self.debug = args.get('debug', False)
        self.working_dir= args.get('working_dir')
        self.input_frames_per_second = args.get('ifps', 1)
        self.output_frames_per_second = args.get('ofps', 1)
        self.scan_method = args.get('scan_method')
        self.movie_url = args.get('movie_url')

        working_uuid = str(uuid.uuid4())
        self.unique_working_dir = os.path.join(self.working_dir, working_uuid)
        os.mkdir(self.unique_working_dir)

    def split_movie(self):
        print('splitting movie into frames at ', self.unique_working_dir) if self.debug else None
        video_object = cv2.VideoCapture(self.movie_url)
        success = True
        read_count = 0
        created_count = 0
        files_created = []
        try:
            while success:
                read_count += 1
                filename = "frame_{:05d}.png".format(read_count)
                success, image = video_object.read()
                filename_full = os.path.join(self.unique_working_dir, filename)
                if success:
                    if self.input_frames_per_second > self.output_frames_per_second:
                        if read_count % (60 / self.output_frames_per_second) != 0:
                            # drop frames not needed for output based on FPS
                            print('dropping frame number ', str(read_count),' due to output_fps') if self.debug else None
                            continue
                    cv2.imwrite(filename_full, image)
                    files_created.append(filename_full)
                    created_count += 1
        except Exception as e:
            print('exception encountered unzipping movie frames: ', e)
        print("{} frames created".format(str(created_count))) if self.debug else None
        return files_created

    def load_and_hash_frames(self, input_file_list):
        # we are passed a list of file urls.
        unique_frames = {}
        for input_full_path in input_file_list:
            input_filename = os.path.basename(input_full_path)
            image = cv2.imread(input_full_path)
            self.advance_one_frame(image, input_full_path, unique_frames)
        return unique_frames

    def advance_one_frame(self, image, image_filename, unique_frames):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        current_hash = self.get_hash(gray)
        if current_hash in unique_frames.keys():
            unique_frames[current_hash].append(image_filename)
        else:
            unique_frames[current_hash] = [image_filename]

    def get_hash(self, image):
        resized = cv2.resize(image, (self.image_hash_size+1, self.image_hash_size))
        diff = resized[:, 1:] > resized[:, :-1]
        the_hash = sum([2**i for (i,v) in enumerate(diff.flatten()) if v])
        return the_hash


    def zip_movie(self, files_to_zip=[], output_fullpath='output/output.mp4'):
        print('zipping frames into movie at ', output_fullpath) if self.debug else None
        fps = self.output_frames_per_second
        if files_to_zip:
            img = cv2.imread(files_to_zip[0])
            cap_size = (img.shape[1], img.shape[0])
        fourcc = cv2.VideoWriter_fourcc('a', 'v', 'c', '1')
        writer = cv2.VideoWriter(output_fullpath, fourcc, fps, cap_size, True)
        num_frames = len(files_to_zip)
        for count, output_frame_full_path in enumerate(files_to_zip):
            percent_done = str(count+1) + '/' + str(num_frames)
            frame = cv2.imread(output_frame_full_path)
            success = writer.write(frame)
        writer.release()

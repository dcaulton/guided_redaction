import numpy as np
import cv2
import random
import requests
import matplotlib.pyplot as plt
import uuid


class ChartMaker:

    def __init__(self, chart_info, job_data, file_writer, verify_file_url):
        self.chart_info = chart_info
        self.job_data = job_data
        self.file_writer = file_writer
        self.verify_file_url = verify_file_url

    def make_charts(self):
        if self.chart_info['chart_type'] == 'template_match':
            return self.make_template_match_charts()
        elif self.chart_info['chart_type'] == 'ocr_match':
            return self.make_ocr_match_charts()
        elif self.chart_info['chart_type'] == 'selected_area':
            return self.make_selected_area_charts()
        elif self.chart_info['chart_type'] == 'ocr_scene_analysis_match':
            return self.make_ocr_scene_analysis_charts()
        raise Exception('unrecognized chart type')

    def get_frameset_hash_for_image(self, movie, image_url):
        for frameset_hash in movie['framesets']:
            if image_url in movie['framesets'][frameset_hash]['images']:
                return frameset_hash

    def get_frameset_hashes_in_order(self, movie):
        build_framesets = []
        for frame in movie['frames']:
            frameset_hash = self.get_frameset_hash_for_image(movie, frame)
            if frameset_hash not in build_framesets:
                build_framesets.append(frameset_hash)
        return build_framesets


    def get_ocr_match_percent(self, request_data):
        if 'ocr' in request_data['tier_1_scanners'] and request_data['tier_1_scanners']['ocr']:
            first_key = list(request_data['tier_1_scanners']['ocr'].keys())[0]
            ocr_rule = request_data['tier_1_scanners']['ocr'][first_key]
            return ocr_rule['match_percent']
        return 0

    def get_movie_dimensions(self, movie):
        for frameset_hash in movie['framesets']:
            image_url = movie['framesets'][frameset_hash]['images'][0]
            pic_response = requests.get(
              image_url,
              verify=self.verify_file_url,
            )
            image = pic_response.content
            if not image:
                return (0,0)
            nparr = np.fromstring(image, np.uint8)
            cv2_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return cv2_image.shape[:2]
        return (0,0)

    def make_selected_area_charts(self):
        build_chart_data = {}
        for job_id in self.job_data:
            job_req_data = self.job_data[job_id]['request_data']
            sam_key = list(job_req_data['tier_1_scanners']['selected_area'].keys())[0]
            sam = job_req_data['tier_1_scanners']['selected_area'][sam_key]
            if sam['select_type'] == 'flood':
                legend = 'type: flood fill, {}%'.format(str(sam['tolerance']))
                build_chart_data['operation'] = legend
            else:
                legend = 'type: {}'.format(str(sam['select_type']))
                build_chart_data['operation'] = legend
            build_chart_data['name'] = sam['name']
            job_resp_data = self.job_data[job_id]['response_data']
            for movie_url in job_resp_data['movies']:
                build_chart_data[movie_url] = {'data': []}
                if 'source' in job_req_data['movies']:
                    source_movie = job_req_data['movies']['source'][movie_url]
                else:
                    source_movie = job_req_data['movies'][movie_url]
                image_shape = self.get_movie_dimensions(source_movie)
                total_pixel_count = image_shape[0] * image_shape[1] 
                framesets_in_order = self.get_frameset_hashes_in_order(source_movie)
                for frameset_hash in framesets_in_order:
                    mask = np.zeros(image_shape, dtype='uint8')
                    for sa_zone_id in job_resp_data['movies'][movie_url]['framesets'][frameset_hash]:
                        sa_zone = job_resp_data['movies'][movie_url]['framesets'][frameset_hash][sa_zone_id]
                        if 'location' in sa_zone and 'size' in sa_zone:
                            cv2.rectangle(
                                mask, 
                                tuple(sa_zone['location']), 
                                tuple(sa_zone['size']), 
                                255, 
                                -1
                            )
                    white_pixel_count = cv2.countNonZero(mask)
                    print('bippa babba {}'.format(white_pixel_count))
                    print('mama {}'.format(total_pixel_count))
                    normalized_pixel_count = white_pixel_count / total_pixel_count 
                    build_chart_data[movie_url]['data'].append(normalized_pixel_count)
                    #for debugging, remove when mask offset problem is fixed
                    movie_name = movie_url.split('/')[-1]
                    movie_uuid = movie_name.split('.')[0]
                    cv2.imwrite('/Users/dcaulton/Desktop/junk/frameset_'+movie_uuid+'__'+frameset_hash+'_debug.png', mask)

        charts = self.make_selected_area_charts_from_build_data(build_chart_data)
        return charts

    def make_selected_area_charts_from_build_data(self, build_chart_data):
        movies = {}
        the_uuid = str(uuid.uuid4())
        self.file_writer.create_unique_directory(the_uuid)
        for movie_number, movie_url in enumerate(build_chart_data):
            if movie_url in ['operation', 'name']:
                continue
            plt.figure(movie_number)
            chart_data = build_chart_data[movie_url]['data']
            rand_color = [random.random(), random.random(), random.random()]
            x_ints = list(range(1, len(chart_data)+1))
            operation = build_chart_data['operation']

            plt.plot(
                x_ints, 
                chart_data, 
                color=rand_color, 
                marker='o', 
                linestyle='none', 
                label=operation,
            )
            top_title = plt.text(-0.0,1.15, "Selected Area Chart")
            plt.ylabel('% pixels selected')
            plt.axis([1, 100, 0, 1])
            movie_name = movie_url.split('/')[-1]
            plt.title('{}\n{}'.format(build_chart_data['name'], movie_name))
            movie_uuid = movie_name.split('.')[0]

            lgd = plt.legend(bbox_to_anchor=(0., -0.25, 1., .102), loc='lower left',
                ncol=1, mode="expand", borderaxespad=0.)

            file_fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                the_uuid, 
                'selected_area_chart_' + movie_uuid + '.png')

            plt.savefig(
                file_fullpath, 
                bbox_extra_artists=(lgd, top_title), 
                bbox_inches='tight',
                transparent=True,
            )
            plot_url = self.file_writer.get_url_for_file_path(file_fullpath)
            movies[movie_url] = [plot_url]
        return movies

    def make_ocr_scene_analysis_charts(self):
        build_chart_data = {'movies': {}}
        for job_id in self.job_data:
            job_req_data = self.job_data[job_id]['request_data']
            job_resp_data = self.job_data[job_id]['response_data']
            stats = job_resp_data['statistics']
            for movie_url in stats['movies']:
                build_chart_data[movie_url] = {}
                if 'source' in job_req_data['movies']:
                    source_movie = job_req_data['movies']['source'][movie_url]
                else:
                    source_movie = job_req_data['movies'][movie_url]
                stats_framesets = stats['movies'][movie_url]['framesets']
                if not stats_framesets: 
                    continue
                for frameset_hash in stats['movies'][movie_url]['framesets']:
                    frame_dimensions = stats['movies'][movie_url]['framesets'][frameset_hash]['frame_dimensions']
                    build_chart_data[movie_url][frameset_hash] = {}
                    app_hits_for_hash = {}
                    if movie_url in job_resp_data['movies'] and \
                            frameset_hash in job_resp_data['movies'][movie_url]['framesets']:
                        app_hits_for_hash = job_resp_data['movies'][movie_url]['framesets'][frameset_hash]
                    ordered_rtas = stats['movies'][movie_url]['framesets'][frameset_hash]['ordered_rtas']
                    rta_scores = stats['movies'][movie_url]['framesets'][frameset_hash]['rta_scores']
                    for app_name in rta_scores: 
                        app_info = {}
                        matched_score = 0
                        print('building chart for frameset {} app {}'.format(frameset_hash, app_name))
                        high_score = 0
                        best_row_scores = []
                        best_row_rta_coords = []
                        for row_number in rta_scores[app_name]:
                            for col_number in rta_scores[app_name][row_number]:
                                if rta_scores[app_name][row_number][col_number]['total_score'] > high_score:
                                    best_row_scores = rta_scores[app_name][row_number][col_number]['app_row_scores']
                                    best_row_rta_coords = rta_scores[app_name][row_number][col_number]['app_row_rta_coords']
                                    high_score = rta_scores[app_name][row_number][col_number]['total_score']
#                        print('best match for {} is row scores {} row rta coords {}'.format(
#                            app_name, best_row_scores, best_row_rta_coords))

                        super_best_row_data = []
                        for row_number, row in enumerate(best_row_scores):
                            for col_number, col in enumerate(row):
                                score = best_row_scores[row_number][col_number]
                                rta_coords = best_row_rta_coords[row_number][col_number]
                                rta = ordered_rtas[rta_coords[0]][rta_coords[1]]
                                if score > 0:
                                    super_best_row_data.append({
                                        'score': score,
                                        'centroid': rta['centroid'],
                                    })

                        build_chart_data[movie_url][frameset_hash][app_name] = {
                            'best_row_data': super_best_row_data,
                        }

        charts = self.make_ocr_scene_analysis_charts_from_build_data(build_chart_data, frame_dimensions)
        return charts

    def make_ocr_scene_analysis_charts_from_build_data(self, build_chart_data, frame_dimensions):
        movies = {}
        the_uuid = str(uuid.uuid4())
        self.file_writer.create_unique_directory(the_uuid)
        counter = 0
        for movie_url in build_chart_data:
            movies[movie_url] = {}
            movie_name = movie_url.split('/')[-1]
            movie_uuid = movie_name.split('.')[0]
            for frameset_hash in build_chart_data[movie_url]:
                if 'framesets' not in movies[movie_url]:
                    movies[movie_url]['framesets'] = {}
                counter += 1
                plt.figure(counter)
                plt.axis([0, frame_dimensions[0], 0, frame_dimensions[1]])
                file_fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                    the_uuid, 
                    'osa_chart_' + movie_uuid + '_' + frameset_hash + '.png')
                for app_name in build_chart_data[movie_url][frameset_hash]:
                    x = []
                    y = []
                    sizes = []
                    colors = []
                    chart_data = build_chart_data[movie_url][frameset_hash][app_name]['best_row_data']
                    rand_color = [random.random(), random.random(), random.random()]
                    for item in chart_data:
                        x.append(item['centroid'][0])
                        y.append(frame_dimensions[1] - item['centroid'][1])
                        score = (item['score'] - 50) * 2
                        sizes.append(score)
                        colors.append(rand_color)

                    plt.scatter(
                        x, 
                        y, 
                        s=sizes, 
                        c=colors, 
                        alpha=0.5
                    )
                top_title = plt.text(-0.0, 1.15 * frame_dimensions[1], "Ocr Scene Analysis Chart")
                plt.title('{}\nframeset hash {}'.format(movie_name, frameset_hash))
                plt.savefig(
                    file_fullpath, 
#                    bbox_extra_artists=(lgd, top_title), 
                    bbox_inches='tight',
#                    transparent=True,
                )
                plot_url = self.file_writer.get_url_for_file_path(file_fullpath)
                movies[movie_url]['framesets'][frameset_hash] = plot_url
        return movies


    def make_ocr_match_charts(self):
        build_chart_data = {}
        for job_id in self.job_data:
            job_req_data = self.job_data[job_id]['request_data']
            job_resp_data = self.job_data[job_id]['response_data']
            stats = job_resp_data['statistics']
            build_chart_data['match_percent'] = self.get_ocr_match_percent(job_req_data)
            for movie_url in stats['movies']:
                build_chart_data[movie_url] = {}
                if 'source' in job_req_data['movies']:
                    source_movie = job_req_data['movies']['source'][movie_url]
                else:
                    source_movie = job_req_data['movies'][movie_url]
                framesets_in_order = self.get_frameset_hashes_in_order(source_movie)
                stats_framesets = stats['movies'][movie_url]['framesets']
                if not stats_framesets: 
                    continue
                for frameset_hash in framesets_in_order:
                    if frameset_hash not in stats_framesets:
                        continue
                    for match_phrase in stats_framesets[frameset_hash]:
                        if match_phrase not in build_chart_data[movie_url]:
                            build_chart_data[movie_url][match_phrase] = []
                        build_chart_data[movie_url][match_phrase].append(
                            float(stats_framesets[frameset_hash][match_phrase]['percent'] / 100)
                        )

        charts = self.make_ocr_match_charts_from_build_data(build_chart_data)
        return charts

    def make_ocr_match_charts_from_build_data(self, build_chart_data):
        movies = {}
        the_uuid = str(uuid.uuid4())
        self.file_writer.create_unique_directory(the_uuid)
        for movie_number, movie_url in enumerate(build_chart_data):
            if movie_url in ['match_percent']:
                continue
            plt.figure(movie_number)
            for match_number, match_phrase in enumerate(build_chart_data[movie_url]):
                desc = match_phrase
                chart_data = build_chart_data[movie_url][match_phrase]
                rand_color = [random.random(), random.random(), random.random()]
                x_ints = list(range(1, len(chart_data)+1))
                decimal_match_percent = float(build_chart_data['match_percent'] / 100.0)
                mp_data = [decimal_match_percent] * len(chart_data)

                if match_number == 0:
                    plt.plot(
                        x_ints, 
                        mp_data, 
                        color=rand_color, 
                        label='match threshold for all'
                    )

                plt.plot(
                    x_ints, 
                    chart_data, 
                    color=rand_color, 
                    marker='o', 
                    linestyle='none', 
                    label=match_phrase,
                )
                top_title = plt.text(-0.0,1.15, "Ocr Match Chart")
                plt.ylabel('match percent')
                plt.axis([1, 100, 0, 1])
                movie_name = movie_url.split('/')[-1]
                plt.title('Ocr matches for\n{}'.format(movie_name))
                movie_uuid = movie_name.split('.')[0]

                lgd = plt.legend(bbox_to_anchor=(0., -0.32, 1., .102), loc='lower left',
                    ncol=1, mode="expand", borderaxespad=0.)

                file_fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                    the_uuid, 
                    'ocr_match_chart_' + movie_uuid + '.png')
            plt.savefig(
                file_fullpath, 
                bbox_extra_artists=(lgd,top_title), 
                bbox_inches='tight',
                transparent=True,
            )
            plot_url = self.file_writer.get_url_for_file_path(file_fullpath)
            movies[movie_url] = [plot_url]
        return movies

    def make_template_match_charts(self):
        build_chart_data = {}
        for job_id in self.job_data:
            job_req_data = self.job_data[job_id]['request_data']
            job_resp_data = self.job_data[job_id]['response_data']
            stats = job_resp_data['statistics']
            for movie_url in stats['movies']:
                build_chart_data[movie_url] = {}
                for template_id in job_req_data['tier_1_scanners']['template']:
                    template = job_req_data['tier_1_scanners']['template'][template_id]
                    build_chart_data[movie_url][template_id] = {
                        'match_percent': template['match_percent'],
                        'name': template['name'],
                        'anchor_scale_counts': {},
                    }
                if 'source' in job_req_data['movies']:
                    source_movie = job_req_data['movies']['source'][movie_url]
                else:
                    source_movie = job_req_data['movies'][movie_url]
                framesets_in_order = self.get_frameset_hashes_in_order(source_movie)

                scale_counts = {}
                stats_framesets = stats['movies'][movie_url]['framesets']
                if not stats_framesets: 
                    continue
                for frameset_hash in framesets_in_order:
                    for anchor_id in stats_framesets[frameset_hash]:
                        if anchor_id not in build_chart_data[movie_url][template_id]:
                            build_chart_data[movie_url][template_id][anchor_id] = []
                        if anchor_id not in scale_counts:
                            scale_counts[anchor_id] = {}
                        build_chart_data[movie_url][template_id][anchor_id].append(
                            float(stats_framesets[frameset_hash][anchor_id]['percent'])
                        )
                        scale = stats_framesets[frameset_hash][anchor_id]['scale']
                        if scale not in scale_counts:
                            scale_counts[anchor_id][scale] = 0
                        scale_counts[anchor_id][scale] += 1

                for anchor in template['anchors']:
                    anchor_id = anchor['id']
                    best_scale_count = sorted(
                        scale_counts[anchor_id].items(), key=lambda item: item[1]
                    )[-1][0]
                    build_chart_data[movie_url][template_id]['anchor_scale_counts'][anchor_id] = \
                        best_scale_count

        charts = self.make_template_match_charts_from_build_data(build_chart_data)
        return charts

    def make_template_match_charts_from_build_data(self, build_chart_data):
        movies = {}
        the_uuid = str(uuid.uuid4())
        self.file_writer.create_unique_directory(the_uuid)
        for movie_number, movie_url in enumerate(build_chart_data):
            plt.figure(movie_number)
            for template_id in build_chart_data[movie_url]:
                for anchor_id in build_chart_data[movie_url][template_id]:
                    if anchor_id in ['name', 'match_percent', 'anchor_scale_counts']:
                        continue
                    scale_for_anchor = \
                        build_chart_data[movie_url][template_id]['anchor_scale_counts'][anchor_id]
                    chart_data = build_chart_data[movie_url][template_id][anchor_id]
                    x_ints = list(range(1, len(chart_data)+1))
                    decimal_match_percent = \
                        float(build_chart_data[movie_url][template_id]['match_percent']) / 100.0
                    mp_data = [decimal_match_percent] * len(chart_data)
                    desc = anchor_id + ' : ' 
                    desc += 'match=' + \
                        str(build_chart_data[movie_url][template_id]['match_percent']) + '% '
                    desc += 'scale=' + scale_for_anchor

                    rand_color = [random.random(), random.random(), random.random()]
                    plt.plot(
                        x_ints, 
                        mp_data, 
                        color=rand_color, 
                        label=desc
                    )

                    plt.plot(
                        x_ints, 
                        chart_data, 
                        color=rand_color, 
                        marker='o', 
                        linestyle='none', 
                    )
                    top_title = plt.text(-0.0,1.15, "Template Match Chart")
                    plt.ylabel('match percent')
                    plt.axis([1, 100, 0, 1])
                    movie_name = movie_url.split('/')[-1]
                    plt.title('{}\n{}'.format(
                        build_chart_data[movie_url][template_id]['name'],
                        movie_name,
                    ))
                    movie_uuid = movie_name.split('.')[0]

                    lgd = plt.legend(bbox_to_anchor=(0., -0.25, 1., .102), loc='lower left',
                        ncol=1, mode="expand", borderaxespad=0.)

                    file_fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                        the_uuid, 
                        'template_match_chart_' + movie_uuid + '__' + template_id + '.png')
            plt.savefig(
                file_fullpath, 
                bbox_extra_artists=(lgd,top_title), 
                bbox_inches='tight',
                transparent=True,
             )
            plot_url = self.file_writer.get_url_for_file_path(file_fullpath)
            movies[movie_url] = [plot_url]
        return movies

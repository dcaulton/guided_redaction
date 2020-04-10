import numpy as np
import matplotlib.pyplot as plt
import uuid


class ChartMaker:

    def __init__(self, chart_info, job_data, file_writer):
        self.chart_info = chart_info
        self.job_data = job_data
        self.file_writer = file_writer

    def make_charts(self):
        if self.chart_info['chart_type'] == 'template_match':
            return self.make_template_match_chart()
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

    def make_template_match_chart(self):
        # assume one template multiple anchors for now
        charts = []
        build_chart_data = {}
        for job_id in self.job_data:
            job_req_data = self.job_data[job_id]['request_data']
            template_ids = list(job_req_data['templates'].keys())
            if template_ids:
                template = job_req_data['templates'][template_ids[0]]
                for anchor in template['anchors']:
                    build_chart_data[anchor['id']] = {}
            job_resp_data = self.job_data[job_id]['response_data']
            stats = job_resp_data['statistics']
            for movie_url in job_resp_data['movies']:
                build_chart_data[movie_url] = {}
                for template_id in job_req_data['templates']:
                    template = job_req_data['templates'][template_id]
                    build_chart_data[movie_url][template_id] = {
                        'match_percent': template['match_percent'],
                        'name': template['name'],
                    }
                if 'source' in job_req_data['movies']:
                    source_movie = job_req_data['movies']['source'][movie_url]
                else:
                    source_movie = job_req_data['movies'][movie_url]
                framesets_in_order = self.get_frameset_hashes_in_order(source_movie)
                for anchor_id in stats:
                    match_framesets = stats[anchor_id]['movies'][movie_url]['framesets']
                    if not match_framesets: 
                        continue
                    build_chart_data[movie_url][template_id][anchor_id] = []
                    for frameset_hash in framesets_in_order:
                        build_chart_data[movie_url][template_id][anchor_id].append(
                            match_framesets[frameset_hash]['percent']
                        )

        for movie_url in build_chart_data:
            the_uuid = str(uuid.uuid4())
            self.file_writer.create_unique_directory(the_uuid)
            for template_id in build_chart_data[movie_url]:
                for anchor_id in build_chart_data[movie_url][template_id]:
                    if anchor_id in ['name', 'match_percent']:
                        continue
                    print('plotting {}'.format(build_chart_data[movie_url][template_id][anchor_id]))
                    plt.plot(build_chart_data[movie_url][template_id][anchor_id])
                    plt.ylabel('match percent')
                    plt.xlabel('time')
                    plt.title('Match statistics for template {} movie {}'.format(
                        build_chart_data[movie_url][template_id]['name'],
                        movie_url,
                    ))
                    file_fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(
                        the_uuid, 
                        'template_match_chart_' + template_id + '__' + anchor_id + '.png')
                    plt.savefig(file_fullpath)
                    plot_url = self.file_writer.get_url_for_file_path(file_fullpath)
                    charts.append(plot_url)
        return charts

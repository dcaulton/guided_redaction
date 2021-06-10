import os
import datetime
import uuid
import math
import numpy as np
import cv2
import math
import json
from django.conf import settings
import requests

from guided_redaction.jobs.models import Job
from guided_redaction.utils.task_shared import (
    get_pipeline_for_job
)
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.models import Pipeline


class PipelineJobStatusController:

    def __init__(self, file_writer):
        self.file_writer = file_writer
        self.jobs = {}
        self.node_statuses = {}
        self.node_ids_by_row = {}
        self.node_status_image = 'http://localhost:8080/30a0d9ad-8bd1-4525-9f8e-da819eb7cef9/frame_00000.png',
        self.node_coords = {}
        self.cell_size = 50
        self.parent_job_id = ''

    def build_status(self, job):
        self.parent_job_id = job.id
        pipeline = get_pipeline_for_job(job)
        if not pipeline:
            return {'errors': 'job is not a top level pipeline job' }
        self.content = json.loads(pipeline.content)
        first_node_id = self.get_first_node_id()
        self.build_node_ids_by_row(first_node_id, 0)
        self.build_jobs(job)
        self.build_node_statuses()
        self.build_node_coords()
        self.build_node_status_image()

        return {                                                       
            'node_status_image': self.node_status_image,
            'node_statuses': self.node_statuses,
        }

    def build_node_status_image(self):
        canvas = np.ones((self.canvas_height, self.canvas_width, 3), dtype='uint8') * 255
        self.add_node_edges_to_image(canvas)
        for row_key in sorted(self.node_ids_by_row.keys()):
            for col_index, node_id in enumerate(self.node_ids_by_row[row_key]):
                center = (
                    math.floor(self.node_coords[node_id][0] + .5*self.cell_size),
                    math.floor(self.node_coords[node_id][1] + .5*self.cell_size)
                )
                status_color = self.get_node_status_color(node_id)
                cv2.circle(canvas, center, math.floor(self.cell_size/2), status_color, -1)
                cv2.circle(canvas, center, math.floor(self.cell_size/2), (0,0,0), 2)
                self.add_node_operation_to_image(canvas, node_id, center)
                self.add_node_name_to_image(canvas, node_id, center)
                self.add_node_percent_complete_to_image(canvas, node_id, center)

        workdir_uuid = self.get_parent_job_workdir_uuid()
        filename_uuid = str(uuid.uuid4())
        outfilename = 'pipeline_status_graph_' + filename_uuid + '.png'
        fullpath = self.file_writer.build_file_fullpath_for_uuid_and_filename(workdir_uuid, outfilename)
        file_url = self.file_writer.write_cv2_image_to_filepath(canvas, fullpath)
        self.node_status_image = file_url

    def get_parent_job_workdir_uuid(self):
        parent_job = self.jobs[self.parent_job_id]
        pjrd = json.loads(parent_job.request_data)
        if 'movies' in pjrd:
            movie_url = ''
            for movie_url in pjrd['movies'].keys():
                if movie_url != 'source': 
                    break
            if movie_url:
                movie_uuid = movie_url.split('/')[-2]
                if movie_uuid: 
                    return movie_uuid
            return str(uuid.uuid4())

    def get_node_status_color(self, node_id):
        status = self.node_statuses[node_id]['status']
        if status == 'success':
            return (200, 255, 200)
        if status == 'failed':
            return (200, 200, 255)
        if status == 'running':
            return (255, 200, 200)
        return (255, 255, 255)

    def add_node_percent_complete_to_image(self, canvas, node_id, center):
        if self.node_statuses[node_id]['status'] != 'running':
            return
        if self.node_statuses[node_id]['percent_complete'] == 0:
            return
        num_degrees = int(360 * (self.node_statuses[node_id]['percent_complete'] / 100))
        end_angle = num_degrees + 270
        past_zero = False
        if end_angle > 360:
            past_zero = True
            end_angle -= 360
        if past_zero:
            cv2.ellipse(
                canvas, # image, 
                center, # center, 
                (math.floor(self.cell_size/2), math.floor(self.cell_size/2)), # axes, 
                0, # angle, 
                270, # startAngle, 
                360, # endAngle, 
                (130, 230, 255), # orangish, 
                5, # thickness
            )
            cv2.ellipse(
                canvas, # image, 
                center, # center, 
                (math.floor(self.cell_size/2), math.floor(self.cell_size/2)), # axes, 
                0, # angle, 
                0, # startAngle, 
                end_angle, # endAngle, 
                (130, 230, 255), # orangish, 
                5, # thickness
            )
        else:
            cv2.ellipse(
                canvas, # image, 
                center, # center, 
                (math.floor(self.cell_size/2), math.floor(self.cell_size/2)), # axes, 
                0, # angle, 
                270, # startAngle, 
                end_angle, # endAngle, 
                (130, 230, 255), # orangish, 
                5, # thickness
            )

    def add_node_edges_to_image(self, canvas):
        for originating_node_id in self.content['edges']:
            target_ids = self.content['edges'][originating_node_id]
            for tid in target_ids:
                source_center = (
                    math.floor(self.node_coords[originating_node_id][0] + .5*self.cell_size),
                    math.floor(self.node_coords[originating_node_id][1] + .5*self.cell_size)
                )
                target_center = (
                    math.floor(self.node_coords[tid][0] + .5*self.cell_size),
                    math.floor(self.node_coords[tid][1] + .5*self.cell_size)
                )
                cv2.line(canvas, source_center, target_center, (0,0,0), 2)

    def add_node_operation_to_image(self, canvas, node_id, center):
        short_type = self.get_short_type(self.content['node_metadata']['node'][node_id]['type'])
        font_scale = .75
        if len(short_type) > 2:
            text_origin = (
                math.floor(center[0]-self.cell_size/2), 
                math.floor(center[1]+self.cell_size/5)
            )
            font_scale = .6
        elif len(short_type) == 2:
            text_origin = (
                math.floor(center[0]-self.cell_size/2.5), 
                math.floor(center[1]+self.cell_size/5)
            )
        else:
            text_origin = (
                math.floor(center[0]-self.cell_size/4), 
                math.floor(center[1]+self.cell_size/5)
            )

        cv2.putText(
            canvas,
            short_type,
            text_origin,
            cv2.FONT_HERSHEY_SIMPLEX, #font
            font_scale, #fontScale,
            (0,0,0), #fontColor,
            2 #lineType
        )
    def add_node_name_to_image(self, canvas, node_id, center):
        name = self.content['node_metadata']['node'][node_id]['name']
        short_type = self.get_short_type(self.content['node_metadata']['node'][node_id]['type'])
        if len(short_type) > 2:
            text_origin = (
                math.floor(center[0]+self.cell_size/3.5), 
                math.floor(center[1]+self.cell_size/5)
            )
        elif len(short_type) == 2:
            text_origin = (
                math.floor(center[0]+self.cell_size/4), 
                math.floor(center[1]+self.cell_size/5)
            )
        else:
            text_origin = (
                math.floor(center[0]+self.cell_size/10), 
                math.floor(center[1]+self.cell_size/5)
            )
        cv2.putText(
            canvas,
            name,
            text_origin,
            cv2.FONT_HERSHEY_SIMPLEX, #font
            .45, #fontScale,
            (0,0,0), #fontColor,
            1 #lineType
        )

    def get_node_task_description(self, node_id):
        node = self.content['node_metadata']['node'][node_id]
        desc_part2 = ''
        if node['type'] in ('template', 'selected_area', 'mesh_match', 'data_sifter', 'ocr', 'selection_grower') :
            scanner = self.content['node_metadata']['tier_1_scanners'][node['type']][node['entity_id']]
            desc_part2 = ' - ' + scanner['name']
        elif node['type'] == 'pipeline': 
            if node['entity_id'] and Pipeline.objects.filter(pk=node['entity_id']).exists():
                desc_part2 = ' - ' + Pipeline.objects.get(pk=node['entity_id']).name
        return node['type'] + desc_part2

    def get_short_type(self, long_type):
        if long_type == 'noop':
            return 'N'
        elif long_type == 'template':
            return 'T'
        elif long_type == 'selected_area':
            return 'SA'
        elif long_type == 'mesh_match':
            return 'MM'
        elif long_type == 'data_sifter':
            return 'DS'
        elif long_type == 'focus_finder':
            return 'FF'
        elif long_type == 't1_filter':
            return 'T1F'
        elif long_type == 'selection_grower':
            return 'SG'
        elif long_type == 'split_and_hash':
            return 'S|H'
        elif long_type == 'redact':
            return 'R'
        elif long_type == 'zip':
            return 'Z'
        elif long_type == 't1_sum':
            return 'SUM'
#            return '\u03A3'
        elif long_type == 't1_dif':
            return 'DIF'
        elif long_type == 'pipeline':
            return 'P'
        elif long_type == 'intersect':
            return 'IN'
        else:
            print('dont know about type {}'.format(long_type))
            return '?'

    def build_node_coords(self):
        num_rows = len(self.node_ids_by_row)
        num_cols = 1
        for row_key in self.node_ids_by_row:
            if len(self.node_ids_by_row[row_key]) > num_cols:
                num_cols = len(self.node_ids_by_row[row_key])
        # cells, space between cells and margin of 25 on both sides
        self.canvas_width = (num_cols * 2 * self.cell_size)
        self.canvas_height = (num_rows * 2 * self.cell_size)
        x_center = math.floor(self.canvas_width / 2)
        for row_key in sorted(self.node_ids_by_row.keys()):
            node_y = math.floor(self.cell_size/2 + (row_key*2 * self.cell_size))
            num_cols_this_row = len(self.node_ids_by_row[row_key])
            row_width = num_cols_this_row * self.cell_size + (num_cols_this_row - 1) * self.cell_size
            for col_index, node_id in enumerate(self.node_ids_by_row[row_key]):
                if num_cols_this_row % 2 == 0:  # even num of cols
                    centerline_col = (num_cols_this_row - 1) / 2
                    if col_index < centerline_col: # its left of center
                        spots_to_left = math.ceil(centerline_col - col_index)
                        x_val = math.floor(x_center - 1.5*self.cell_size - (spots_to_left-1)*2*self.cell_size)
                        coords = (x_val, node_y)
                    else:   # its to the right of center
                        spots_to_right = math.ceil(col_index - centerline_col)
                        x_val = math.floor(x_center + .5*self.cell_size + (spots_to_left-1)*2*self.cell_size)
                        coords = (x_val, node_y)
                else:  # odd num of cols
                    centerline_col = (num_cols_this_row - 1) / 2
                    if col_index == centerline_col:
                        coords = (math.floor(x_center - .5*self.cell_size), node_y)
                    elif col_index < centerline_col:
                        spots_to_left = math.ceil(centerline_col - col_index)
                        x_val = math.floor(x_center - 2*self.cell_size - (spots_to_left-1)*2*self.cell_size)
                        coords = (x_val, node_y)
                    else:
                        spots_to_right = math.ceil(col_index - centerline_col)
                        x_val = math.floor(x_center + self.cell_size + (spots_to_left-1)*2*self.cell_size)
                        coords = (x_val, node_y)
                self.node_coords[node_id] = coords

    def get_first_node_id(self):
        all_node_ids = list(self.content['node_metadata']['node'].keys())
        edges = self.content['edges']
        for originating_node_id in edges:
            target_ids = edges[originating_node_id]
            for id in target_ids:
                if id in all_node_ids:
                    all_node_ids.remove(id)
        if len(all_node_ids) != 1:
            print('error, we have more than one start node for this graph')
            return 
        return all_node_ids[0]

    def build_node_ids_by_row(self, node_id, node_level):
        edges = self.content['edges']
        if node_level not in self.node_ids_by_row:
            self.node_ids_by_row[node_level] = []
        if node_id not in self.node_ids_by_row[node_level]:
            self.node_ids_by_row[node_level].append(node_id)

        if node_id in edges.keys():
            for child_node_id in edges[node_id]:
                self.build_node_ids_by_row(child_node_id, node_level+1)
        # TODO massage the row so that child nodes are directly below their own parents
        
    def build_jobs(self, parent_job):
        self.jobs[parent_job.id] = parent_job
        for child in parent_job.children.all():
            if Attribute.objects.filter(job=child).filter(name='node_id').exists:
                nid_attr = Attribute.objects.filter(job=child).filter(name='node_id').first()
                if nid_attr:
                    self.jobs[nid_attr.value] = child

    def build_node_statuses(self):
        all_node_ids = []
        for row_key in sorted(self.node_ids_by_row.keys()):
            for col_index, node_id in enumerate(self.node_ids_by_row[row_key]):
                all_node_ids.append(node_id)
        for node_id in all_node_ids:
            node = self.content['node_metadata']['node'][node_id]
            build_operation = self.get_node_task_description(node_id)
            if node_id in self.jobs:
                job = self.jobs[node_id]
                request_data = {} 
                if job.request_data:
                    request_data = json.loads(job.request_data)
                input_frameset_count = 0
                if 'movies' in request_data:
                    for movie_url in request_data['movies']:
                        if movie_url == 'source':
                            continue
                        if 'framesets' not in request_data['movies'][movie_url]:
                            continue
                        input_frameset_count += len(request_data['movies'][movie_url]['framesets'])
                response_data = {}
                if job.response_data:
                    response_data = json.loads(job.response_data)
                output_frameset_count = 0
                if 'movies' in response_data:
                    for movie_url in response_data['movies']:
                        if 'framesets' not in response_data['movies'][movie_url]:
                            continue
                        output_frameset_count += len(response_data['movies'][movie_url]['framesets'])
                job = self.jobs[node_id]
                updated_interval = (datetime.datetime.now(datetime.timezone.utc) - job.updated)
                updated_minutes = math.floor(updated_interval.seconds / 60)

                build_obj = {
                    'operation': build_operation,
                    'name': node['name'],
                    'node_sequence': all_node_ids.index(node_id),
                    'status': job.status,
                    'percent_complete': math.floor(round(job.percent_complete, 2) * 100),
                    'minutes_since_last_updated': updated_minutes,
                    'framesets_in': input_frameset_count,
                    'framesets_out': output_frameset_count,
                    'job_id': str(job.id),
                }
                self.node_statuses[node_id] = build_obj
            else:
                build_obj = {
                    'operation': build_operation,
                    'name': node['name'],
                    'node_sequence': all_node_ids.index(node_id),
                    'status': 'not yet created',
                    'percent_complete': 0,
                    'framesets_in': 0,
                    'framesets_out': 0,
                    'percent_matched': 0,
                    'job_id': '',
                }
                self.node_statuses[node_id] = build_obj

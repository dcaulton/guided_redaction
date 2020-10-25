#from guided_redaction.analyze.classes.TemplateMatcher import TemplateMatcher
import math
import json
from django.conf import settings
import requests

from guided_redaction.jobs.models import Job
from guided_redaction.utils.task_shared import (
    get_pipeline_for_job
)
from guided_redaction.attributes.models import Attribute


class PipelineJobStatusController:

    def __init__(self, file_writer):
        self.file_writer = file_writer
        self.jobs = {}
        self.node_statuses = {}
        self.node_ids_by_row = {}

    def build_status(self, job):
        pipeline = get_pipeline_for_job(job)
        if not pipeline:
            return {'errors': 'job is not a top level pipeline job' }
        self.content = json.loads(pipeline.content)
        first_node_id = self.get_first_node_id()
        self.build_node_ids_by_row(first_node_id, 0)
        self.build_jobs(job)
        self.build_node_statuses()

        return {                                                       
            'node_status_image': 'http://localhost:8080/30a0d9ad-8bd1-4525-9f8e-da819eb7cef9/frame_00000.png',
            'node_statuses': self.node_statuses,
        }
    
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
        
    def build_jobs(self, parent_job):
        for child in parent_job.children.all():
            if Attribute.objects.filter(job=child).filter(name='node_id').exists:
                nid_attr = Attribute.objects.filter(job=child).filter(name='node_id').first()
                if nid_attr:
                    self.jobs[nid_attr.value] = child

    def build_node_statuses(self):
        all_node_ids = list(self.content['node_metadata']['node'].keys()) 
        for node_id in all_node_ids:
            if node_id in self.jobs:
                job = self.jobs[node_id]
                build_obj = {
                    'operation': job.operation,
                    'status': job.status,
                    'percent_complete': str(math.floor(round(job.percent_complete, 2) * 100)) + '%',
                    'frames_seen': 0,
                    'frames_matched': 0,
                    'percent_matched': 0,
                }
                self.node_statuses[node_id] = build_obj
            else:
                node = self.content['node_metadata']['node'][node_id]
                build_obj = {
                    'operation': node['type'],
                    'status': 'not yet created',
                    'percent_complete': 0,
                    'frames_seen': 0,
                    'frames_matched': 0,
                    'percent_matched': 0,
                }
                self.node_statuses[node_id] = build_obj

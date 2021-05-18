import uuid
import pytz
import hashlib
import json
from datetime import datetime

from django.conf import settings
from django.db import models

from guided_redaction.attributes.models import Attribute
from guided_redaction.utils.external_payload_utils import (
    save_external_payloads,
    get_data_from_disk_for_model_instance,
    delete_external_payloads
)
from guided_redaction.utils.classes.FileWriter import FileWriter


class Job(models.Model):

    created_on = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=36)
    description = models.CharField(max_length=255)
    app = models.CharField(max_length=255)
    operation = models.CharField(max_length=255)
    sequence = models.IntegerField()
    percent_complete = models.FloatField(default=0)
    request_data = models.TextField(null=True)
    request_data_path = models.CharField(max_length=255, null=True)
    request_data_checksum = models.CharField(max_length=255, null=True)
    response_data = models.TextField(null=True)
    response_data_path = models.CharField(max_length=255, null=True)
    response_data_checksum = models.CharField(max_length=255, null=True)
    parent = models.ForeignKey(
        'Job', on_delete=models.CASCADE, null=True, related_name="children", unique=False
    )
    workbook = models.ForeignKey(
        'workbooks.Workbook', on_delete=models.CASCADE, null=True
    )

    EXTERNAL_PAYLOAD_FIELDS = ['response_data', 'request_data']
    MIN_PERCENT_COMPLETE_INCREMENT = .05
    MAX_DB_PAYLOAD_SIZE = 1000000  

    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'status': self.status,
            'percent_complete': self.percent_complete,
            'app': self.app,
            'operation': self.operation,
            'parent_id': str(self.parent_id),
        }
        return disp_hash.__str__()

    def save(self, *args, **kwargs):
        percent_complete = self.get_percent_complete()
        if percent_complete != self.percent_complete:
            self.percent_complete = percent_complete

        save_external_payloads(self) 

        # because we override from_db() because of external payloads and because 
        #  it doesn't look like super() is doing what we want on from_db (probably because 
        #  it's a classmethod), we have to force an internal variable here.  we're duplicating the 
        #  behavior from django's from_db()
        if self.id:
            self._state.adding = False

        super(Job, self).save(*args, **kwargs)

        if self.parent:
            self.parent.update_percent_complete()
        else:
            if hasattr(settings,'SUPPRESS_WEBSOCKETS') and settings.SUPPRESS_WEBSOCKETS:
                return
            self.broadcast_percent_complete()

    def quick_save(self, *args, **kwargs):
        # only use this if you are saving non-payload changes, non percent complete changes, like status 
        super(Job, self).save(*args, **kwargs)

    def re_initialize_as_running(self):
        self.status = 'running'
        self.percent_complete = 0
        self.response_data = '{}'
        self.response_data_path = ''

    def get_wall_clock_run_time_string(self):
        seconds = (self.updated - self.created_on).seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        wall_clock_run_time = '{}:{:02d}:{:02d}'.format(hours, minutes, seconds)
        return wall_clock_run_time 

    def as_dict(self):
        children = Job.objects.filter(parent_id=self.id).order_by('sequence')
        child_ids = [str(child.id) + ' : ' + child.operation for child in children]
        pretty_time = self.pretty_date(self.created_on)
        seconds = (self.updated - self.created_on).seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        wall_clock_run_time = self.get_wall_clock_run_time_string()

        build_attributes = {}
        if Attribute.objects.filter(job=self).exists():
            attributes = Attribute.objects.filter(job=self)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value

        build_request_data = str(self.request_data or '{}')
        build_response_data = str(self.response_data or '{}')

        job_data = {
            'id': str(self.id),
            'status': self.status,
            'description': self.description,
            'created_on': str(self.created_on),
            'updated': str(self.updated),
            'pretty_created_on': pretty_time,
            'percent_complete': self.percent_complete,
            'wall_clock_run_time': wall_clock_run_time,
            'app': self.app,
            'operation': self.operation,
            'workbook_id': str(self.workbook_id or ''),
            'parent_id': str(self.parent_id or ''),
            'request_data': build_request_data,
            'response_data': build_response_data,
            'sequence': self.sequence,
            'children': child_ids,
            'attributes': build_attributes,
        }
        return job_data

    def as_dict_recursive(self, build_obj):
        build_obj[self.id] = self.as_dict()
        for child in Job.objects.filter(parent_id=self.id):
            build_obj[child.id] = child.as_dict_recursive(build_obj)
        return build_obj

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = cls(*values)
        get_data_from_disk_for_model_instance(instance)
        return instance

    def get_data_from_disk(self):
        get_data_from_disk_for_model_instance(self)

    def broadcast_percent_complete(self):
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'redact-jobs',
                {
                    'type': 'jobs_message',
                    'job_id': str(self.id),
                    'status': str(self.status),
                    'percent_complete': self.percent_complete,
                }
            )

        except Exception:
            pass

    def delete(self):
        keep_attrs = Attribute.objects.filter(name='file_dir_user').filter(job=self)
        if keep_attrs:
            for keep_attr in keep_attrs:
                keep_attr.job = None
                keep_attr.save()
        delete_external_payloads(self)
        super(Job, self).delete()

    def add_owner(self, owner_id):
        Attribute(
            name='user_id',
            value=owner_id,
            job=self,
        ).save()

    def change_is_big_enough(self, percent_complete):
        if self.percent_complete == 0 and self.status == 'running':
            # just got picked up, send a heads up
            return True
        if self.percent_complete == percent_complete:
            return False
        if abs(self.percent_complete - percent_complete) > \
            self.MIN_PERCENT_COMPLETE_INCREMENT:
            return True
        return False

    def is_cv_worker_task(self):
        if Attribute.objects.filter(job=self).exists():
            attributes = Attribute.objects.filter(job=self)
            for attribute in attributes:
                if attribute.name == 'cv_worker_id':
                    return True
        return False

    def get_cv_worker_id(self):
        if Attribute.objects.filter(job=self).exists():
            attributes = Attribute.objects.filter(job=self)
            for attribute in attributes:
                if attribute.name == 'cv_worker_id':
                    return attribute.value
        return False

    def get_cv_worker_type(self):
        if Attribute.objects.filter(job=self).exists():
            attributes = Attribute.objects.filter(job=self)
            for attribute in attributes:
                if attribute.name == 'cv_worker_type':
                    return attribute.value
        return False

    def get_file_dirs(self):
        file_dirs = []
        if Attribute.objects.filter(job=self).filter(name='file_dir_user').exists():
            for attr in Attribute.objects.filter(job=self).filter(name='file_dir_user'):
                dirname = attr.value.split(':')[-2]
                file_dirs.append(dirname)
        return file_dirs

    def get_percent_complete(self):
        if self.status in ['success', 'failed']: 
            return 1
        if self.status == 'created': 
            return 0

        child_time_fractions = {}
        ctf_attr = Attribute.objects \
            .filter(job=self) \
            .filter(name='child_time_fractions') \
            .first()
        if ctf_attr:
            child_time_fractions = json.loads(ctf_attr.value)
        child_operation_count = 1
        children = self.__class__.objects.filter(parent=self)
        if children.count():
            child_operation_count = children.count()
        aoc_attr = Attribute.objects \
            .filter(job=self) \
            .filter(name='anticipated_operation_count') \
            .first()
        if aoc_attr and children.count() and int(aoc_attr.value) > children.count():
            child_operation_count = int(aoc_attr.value)

        percent_complete = 0
        for child in children:
            multiplier = 1
            if child_time_fractions and child.operation in child_time_fractions:
                multiplier = child_time_fractions[child.operation]
            this_childs_part = (child.percent_complete / child_operation_count) * multiplier
            percent_complete += this_childs_part

        if self.change_is_big_enough(percent_complete):
            return percent_complete
        else:
            return self.percent_complete

    def update_percent_complete(self):
        percent_complete = self.get_percent_complete()
        if percent_complete == self.percent_complete:
            # allow initial 'running' save to take and bubble upward,
            # for that case %comp stays at zero, status changes.
            # this ultimately lets the top job broadcast that it has been picked up
            if percent_complete > 0:
                return 

        self.percent_complete = percent_complete
        self.save()

        if self.parent:
            self.parent.update_percent_complete()

    def harvest_failed_child_job_errors(self, children):
        all_errors = []
        for child in children:
            if not child.response_data:
                continue
            child_response = json.loads(child.response_data)
            if 'errors' in child_response:
                all_errors += child_response['errors']
        self.response_data = json.dumps(all_errors)

    def pretty_date(self, time=False):
        """
        Get a datetime object or a int() Epoch timestamp and return a
        pretty string like 'an hour ago', 'Yesterday', '3 months ago',
        'just now', etc
        """
        now = datetime.utcnow()
        now = now.replace(tzinfo=pytz.utc)
        if type(time) is int:
            diff = now - datetime.fromtimestamp(time)
        elif isinstance(time,datetime):
            diff = now - time
        elif not time:
            diff = now - now
        second_diff = diff.seconds
        day_diff = diff.days

        if day_diff < 0:
            return ''

        if day_diff == 0:
            if second_diff < 10:
                return "just now"
            if second_diff < 60:
                return str(second_diff) + " seconds ago"
            if second_diff < 120:
                return "a minute ago"
            if second_diff < 3600:
                return str(second_diff // 60) + " minutes ago"
            if second_diff < 7200:
                return "an hour ago"
            if second_diff < 86400:
                return str(second_diff // 3600) + " hours ago"
        if day_diff == 1:
            return "yesterday"
        if day_diff < 7:
            return str(day_diff) + " days ago"
        if day_diff < 31:
            return str(day_diff // 7) + " weeks ago"
        if day_diff < 365:
            return str(day_diff // 30) + " months ago"
        return str(day_diff // 365) + " years ago"

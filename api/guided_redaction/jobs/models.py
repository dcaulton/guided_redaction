import uuid
import pytz
import hashlib
import json
from datetime import datetime

from django.conf import settings
from django.db import models

from guided_redaction.attributes.models import Attribute
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
        'Job', on_delete=models.CASCADE, null=True, related_name="children"
    )
    workbook = models.ForeignKey(
        'workbooks.Workbook', on_delete=models.CASCADE, null=True
    )

    MIN_PERCENT_COMPLETE_INCREMENT = .05
    MAX_DB_PAYLOAD_SIZE = 5000000  

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

        if self.response_data and len(self.response_data) > self.MAX_DB_PAYLOAD_SIZE:
            checksum = hashlib.md5(self.response_data.encode('utf-8')).hexdigest()
            if self.response_data_checksum != checksum:
                print('saving job response data to disk, its {} bytes'.format(len(self.response_data)))
                self.response_data_checksum = checksum
                directory = self.get_current_directory('response')
                self.response_data_path = \
                    self.save_data_to_disk(self.response_data, directory, 'response')
                self.response_data = '{}'

        if self.request_data and len(self.request_data) > self.MAX_DB_PAYLOAD_SIZE:
            checksum = hashlib.md5(self.request_data.encode('utf-8')).hexdigest()
            if self.request_data_checksum != checksum:
                self.request_data_checksum = checksum
                print('saving job request data to disk, its {} bytes'.format(len(self.request_data)))
                directory = self.get_current_directory('request')
                self.request_data_path = self.save_data_to_disk(self.request_data, directory, 'request')
                self.request_data = '{}'

        super(Job, self).save(*args, **kwargs)

        if self.parent:
            self.parent.update_percent_complete()
        else:
            if hasattr(settings,'SUPPRESS_WEBSOCKETS') and settings.SUPPRESS_WEBSOCKETS:
                return
            self.broadcast_percent_complete()

    def as_dict(self):
        children = Job.objects.filter(parent_id=self.id).order_by('sequence')
        child_ids = [str(child.id) + ' : ' + child.operation for child in children]
        pretty_time = self.pretty_date(self.created_on)
        wall_clock_run_time = str(self.updated - self.created_on)

        build_attributes = {}
        if Attribute.objects.filter(job=self).exists():
            attributes = Attribute.objects.filter(job=self)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value

        build_request_data = str(self.request_data)
        build_response_data = str(self.response_data)

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
            'workbook_id': str(self.workbook_id),
            'parent_id': str(self.parent_id),
            'request_data': build_request_data,
            'response_data': build_response_data,
            'children': child_ids,
            'attributes': build_attributes,
        }
        return job_data

    def as_dict_recursive(self, build_obj):
        build_obj[self.id] = self.as_dict()
        for child in Job.objects.filter(parent_id=self.id):
            build_obj[child.id] = child.as_dict_recursive(build_obj)
        return build_obj

    def get_current_directory(self, request_or_response):
        if request_or_response == 'request' and self.request_data_path:
            return self.request_data_path.split('/')[-2]
        if request_or_response == 'response' and self.response_data_path:
            return self.response_data_path.split('/')[-2]

    def get_data_from_disk(self):
        if self.request_data_path or self.response_data_path:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            if self.request_data_path:
                self.request_data = fw.get_text_data_from_filepath(self.request_data_path)
            if self.response_data_path:
                self.response_data = fw.get_text_data_from_filepath(self.response_data_path)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = cls(*values)
        instance.get_data_from_disk()
        return instance

    def save_data_to_disk(self, data, directory, request_or_response='request'):
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        if not directory:
            directory = str(uuid.uuid4())
            fw.create_unique_directory(directory)
        filename_uuid = str(uuid.uuid4())
        file_name = request_or_response + '_' + filename_uuid + '_data.json'
        outfilepath = fw.build_file_fullpath_for_uuid_and_filename(directory, file_name)
        fw.write_text_data_to_filepath(data, outfilepath)

        return outfilepath

    def broadcast_percent_complete(self):
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

    def delete(self):
        keep_attrs = Attribute.objects.filter(name='file_dir_user').filter(job=self)
        if keep_attrs:
            for keep_attr in keep_attrs:
                keep_attr.job = None
                keep_attr.save()
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

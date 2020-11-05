import uuid
import json

from django.conf import settings
from django.db import models

from guided_redaction.attributes.models import Attribute


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
    request_data = models.BinaryField(max_length=4000000000, null=True)
    response_data = models.BinaryField(max_length=4000000000, null=True)
    parent = models.ForeignKey(
        'Job', on_delete=models.CASCADE, null=True, related_name="children"
    )
    workbook = models.ForeignKey(
        'workbooks.Workbook', on_delete=models.CASCADE, null=True
    )

    MIN_PERCENT_COMPLETE_INCREMENT = .05

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

        if type(self.request_data) == str:
            self.request_data = bytes(self.request_data, encoding='utf8')
        if type(self.response_data) == str:
            self.response_data = bytes(self.response_data, encoding='utf8')

        super(Job, self).save(*args, **kwargs)

        if self.parent:
            self.parent.update_percent_complete()
        else:
            if hasattr(settings,'SUPPRESS_WEBSOCKETS') and settings.SUPPRESS_WEBSOCKETS:
                return
            self.broadcast_percent_complete()

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


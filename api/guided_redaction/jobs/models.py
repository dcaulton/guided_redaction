import uuid
from django.db import models
import json
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
    request_data = models.TextField(null=True)
    response_data = models.TextField(null=True)
    parent = models.ForeignKey('Job', on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey('workbooks.Workbook', on_delete=models.CASCADE, null=True)

    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'status': self.status,
            'app': self.app,
            'operation': self.operation,
            'parent_id': str(self.parent_id),
        }
        return disp_hash.__str__()

    def update_parent_percent_complete(self):
        if not self.parent:
            return
        self.parent.update_percent_complete()

    def change_is_big_enough(self, percent_complete, min_step):
        if self.percent_complete == percent_complete:
            return False
        if abs(self.percent_complete - percent_complete) > min_step:
            return True
        return False

    def update_percent_complete(self, percent_complete=None, propogate=True, min_step=.01):
        if percent_complete:
            if not self.change_is_big_enough(percent_complete, min_step):
                return
            self.percent_complete = percent_complete
            self.save()
            if propogate:
                self.update_parent_percent_complete()
            return

        children = self.__class__.objects.filter(parent=self)

        child_time_fractions = {}
        ctf_attr = Attribute.objects.filter(job=self).filter(name='child_time_fractions').first()
        if ctf_attr:
            child_time_fractions = json.loads(ctf_attr.value)

        if child_time_fractions:
            build_percent = 0.0
            for operation_name in child_time_fractions:
                # e.g, .2 if this job is 1/5 of the parent jobs time spent
                time_fraction = child_time_fractions[operation_name]
                operation_children = children.filter(operation=operation_name)
                completed_children_count = operation_children.filter(status__in=['success', 'failed']).count()
                raw_percent_complete = float(completed_children_count / operation_children.count())
                scaled_percent_complete = time_fraction * raw_percent_complete
                build_percent += scaled_percent_complete
            if not self.change_is_big_enough(percent_complete, min_step):
                return
            self.percent_complete = percent_complete
            self.save()
        else:
            completed_children_count = children.filter(status__in=['success', 'failed']).count()
            percent_complete = float(completed_children_count / children.count())
            if not self.change_is_big_enough(percent_complete, min_step):
                return
            self.percent_complete = percent_complete
            self.save()

        if propogate:
            self.update_parent_percent_complete()

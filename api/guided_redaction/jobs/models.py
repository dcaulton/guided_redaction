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

    def save(self, *args, **kwargs):
        if self.status in ['success', 'failed']: 
            self.percent_complete = 1
        super(Job, self).save(*args, **kwargs)
        self.update_parent_percent_complete()

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
        if children.count() == 0 and propogate:
            self.update_parent_percent_complete()
            return

        child_time_fractions = {}
        ctf_attr = Attribute.objects.filter(job=self).filter(name='child_time_fractions').first()
        if ctf_attr:
            child_time_fractions = json.loads(ctf_attr.value)
        anticipated_operation_count = 1
        aoc_attr = Attribute.objects.filter(job=self).filter(name='anticipated_operation_count').first()
        if aoc_attr:
            anticipated_operation_count = int(aoc_attr.value)

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
            coc = self.get_completed_operation_count(children)
            percent_complete = 0
            for operation_name in coc:
                op_percent_complete = coc[operation_name]['complete'] / coc[operation_name]['total']
                percent_complete += op_percent_complete / anticipated_operation_count

            if not self.change_is_big_enough(percent_complete, min_step):
                return
            self.percent_complete = percent_complete
            self.save()

        if propogate:
            self.update_parent_percent_complete()

    def get_completed_operation_count(self, children):
        operations = {}
        for child in children:
            if child.operation not in operations:
                operations[child.operation] = {'total': 0, 'complete': 0}
            operations[child.operation]['total'] += 1
            if child.status in ['success', 'failed']:
                operations[child.operation]['complete'] += 1
        return operations

    def harvest_failed_child_job_errors(self, children):
        all_errors = []
        for child in children:
            if not child.response_data:
                continue
            child_response = json.loads(child.response_data)
            if 'errors' in child_response:
                all_errors += child_response['errors']
        self.response_data = json.dumps(all_errors)


from guided_redaction.attributes.models import Attribute

def get_pipeline_for_job(job):
    if not job:
        return
    if Attribute.objects.filter(job=job, name='pipeline_job_link').exists():
        return Attribute.objects.filter(job=job, name='pipeline_job_link').first().pipeline

def evaluate_children(operation, child_operation, children):
    all_children = 0
    completed_children = 0
    failed_children = 0
    for child in children:
        if child.operation == child_operation:
            all_children += 1
            if child.status == 'success':
                completed_children += 1
            elif child.status == 'failed':
                failed_children += 1
    print('CHILDREN FOR {}: {} COMPLETE: {} FAILED: {}'.format(
        operation, all_children, completed_children, failed_children
    ))
    if all_children == 0:
        return 'build_child_tasks'
    elif all_children == completed_children:
        return 'wrap_up'
    elif all_children > 0:
        return 'noop'
    elif failed_children > 0:
        return 'abort'

def job_has_anticipated_operation_count_attribute(job):
    if Attribute.objects.filter(job=job).filter(name='anticipated_operation_count').exists():
        return True

def make_anticipated_operation_count_attribute_for_job(job, the_count):
    attribute = Attribute(
        name='anticipated_operation_count',
        value=the_count,
        job=job,
    )
    attribute.save()


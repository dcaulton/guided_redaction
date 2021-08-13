from guided_redaction.attributes.models import Attribute
from guided_redaction.jobs.models import Job


class PreserveJobController:

    def preserve_job(self, job):
        if Attribute.objects.filter(job=job).filter(name='auto_delete_age').exists:
            the_attr = Attribute.objects.filter(job=job).filter(name='auto_delete_age').first()
            if the_attr != 'never':
                the_attr.delete()
                Attribute(
                    name='auto_delete_age',
                    value='never',
                    job=job,
                ).save()
        else:
            Attribute(
                name='auto_delete_age',
                value='never',
                job=job,
            ).save()
        return {}

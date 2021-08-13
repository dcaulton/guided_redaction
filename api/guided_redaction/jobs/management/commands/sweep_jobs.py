from django.core.management.base import BaseCommand

from guided_redaction.jobs.tasks import sweep


class Command(BaseCommand):
    help = """Sweeps away old jobs to make sure there are not too many.
        Removes the oldest jobs, except those jobs that have an 
        auto_delete_age of "never", until only "keep" number of jobs remain.
        Also attempts to clear all detritus left behind by the job.
    """

    def add_arguments(self, parser):
        parser.add_argument("-k", "--keep", type=int, default=None,
            help="Number of jobs to keep."
        )

    def handle(self, *args, **options):
        keep = options["keep"]
        sweep(options["keep"])

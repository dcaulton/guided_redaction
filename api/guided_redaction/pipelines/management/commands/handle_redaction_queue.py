from django.conf import settings
from django.core.management.base import BaseCommand

from base.settings import AltSettings
from guided_redaction.pipelines.batch import RedactionQueueHandler


class Command(BaseCommand):
    help = "Reads redaction requests off the redaction queue and handles them"

    def add_arguments(self, parser):
        parser.add_argument("-c", "--count", default=0, type=int,
            help="Number of violation events to fetch from the queue before "
                "closing. If count=0 (the default) then loop runs forever."
        )
        parser.add_argument("-a", "--storage-account-name-setting",
            default="STORAGE_ACCOUNT_NAME",
            help="The name of the setting with the queue's storage account name. "
                'Default is "STORAGE_ACCOUNT_NAME"'
        )
        parser.add_argument("-k", "--storage-account-key-setting",
            default="STORAGE_ACCOUNT_KEY",
            help="The name of the setting with the queue's storage account key. "
                'Default is "STORAGE_ACCOUNT_KEY"'
        )
        parser.add_argument("-p", "--peek", action="store_true",
            help='When provided, handler will "peek" at the queue rather than '
                "removing items from it."
        )
        parser.add_argument("-q", "--queue-name", default=None,
            help='The name of the violation queue. Default is value of'
            'settings.REDACTION_QUEUE_NAME'
        )
        parser.add_argument("-r", "--restart", action="store_true",
            help='deletes and restarts all jobs. Useful for after pod'
                ' restarts'
        )
        parser.add_argument("-t", "--throttle", type=int, default=None,
            help='Maximum number of Jobs that can be running at one time. '
                'Defaults to settings.REDACT_BATCH_JOB_THROTTLE'
        )
        parser.add_argument("-w", "--throttle-wait", type=int, default=None,
            help='Time to wait between throttle-condition checks.'
        )

    def handle(self, *args, **options):
        count = options["count"]
        sa_name = getattr(settings, options["storage_account_name_setting"])
        sa_key = getattr(settings, options["storage_account_key_setting"])
        queue_name = options["queue_name"] or settings.REDACTION_QUEUE_NAME
        restart = options["restart"]
        peek = options["peek"]
        throttle = options["throttle"] or settings.REDACT_BATCH_JOB_THROTTLE
        throttle_wait = options["throttle_wait"] or 60

        class HandlerSettings(AltSettings):
            STORAGE_ACCOUNT_NAME = sa_name
            STORAGE_ACCOUNT_KEY = sa_key

        handler = RedactionQueueHandler(queue_name, HandlerSettings(settings))
        handler.run(
            count=count,
            peek=peek,
            throttle=throttle,
            restart=restart,
            throttle_wait=throttle_wait
        )

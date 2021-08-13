import logging
from gt.tasks import post_gt_event

from parse_dt import now

logger = logging.getLogger(__name__)

event_source = "983705bb-a241-4ffb-b777-da3b1aa98fbf"

def post_data_redacted_event(
    account, lob, global_id, transaction_id, recording_id, source_details=None
):
    logger.info('Sending "Data Redacted" signal')
    event_type = "e59528dc-78a1-460f-8dc4-7dcc9b1d749e"
    post_gt_event.apply_async(
        (
            event_source,
            event_type,
            int(account),
            int(lob),
            int(global_id),
            transaction_id,
            recording_id,
            now(),
            source_details
        ),
        queue="celery"
    )

def post_no_redaction_data_found_event(
    account, lob, global_id, transaction_id, recording_id, source_details=None
):
    event_type = "1722c7dd-d782-4a58-98c3-c0af534b623d"
    logger.info('No "Redaction Data Found" signal')
    post_gt_event.apply_async(
        (
            event_source,
            event_type,
            int(account),
            int(lob),
            int(global_id),
            transaction_id,
            recording_id,
            now(),
            source_details
        ),
        queue="celery"
    )

def post_redacted_video_saved_event(
    account, lob, global_id, transaction_id, recording_id, source_details=None
):
    logger.info('No "Redacted Video Saved" signal')
    event_type = "259a5d67-dafa-4581-a3c6-dc068156543d"
    post_gt_event.apply_async(
        (
            event_source,
            event_type,
            int(account),
            int(lob),
            int(global_id),
            transaction_id,
            recording_id,
            now(),
            source_details
        ),
        queue="celery"
    )

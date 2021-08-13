from celery import shared_task


@shared_task()
def gt_events(channel_name, account_id, date, batch=1000):
    pass

@shared_task()
def run_event_engine(meta):
    pass

@shared_task()
def post_gt_event(
    event_source, event_type, account, lob, global_id, gtid, source_record_id,
    timestamp=None, source_details=None,
):
    pass

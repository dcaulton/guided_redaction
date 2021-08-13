import logging
from time import sleep, time

import simplejson as json
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.exceptions import ChannelFull
from channels.layers import get_channel_layer
from django.conf import settings

from .consumers import send_sig
from . import cache


logger = logging.getLogger(__name__)

channel_layer = get_channel_layer()
#send = async_to_sync(channel_layer.send)
send = ''


@shared_task(time_limit=1)
def send_to_channel(channel_name, content):
    try:
        send(channel_name, content)
    except ChannelFull:
        logger.warning(f"Channel {channel_name} full. Closing connection")
        send_sig(channel_name, {"signal": "stop", "content": None})


@shared_task(time_limit=10)
def send_to_channel10(channel_name, content):
    try:
        send(channel_name, content)
    except ChannelFull:
        logger.warning(f"Channel {channel_name} full. Closing connection")
        send_sig(channel_name, {"signal": "stop", "content": None})


@shared_task(time_limit=30)
def send_to_channel30(channel_name, content):
    try:
        send(channel_name, content)
    except ChannelFull:
        logger.warning(f"Channel {channel_name} full. Closing connection")
        send_sig(channel_name, {"signal": "stop", "content": None})

@shared_task(time_limit=60)
def send_to_channel60(channel_name, content):
    try:
        send(channel_name, content)
    except ChannelFull:
        logger.warning(f"Channel {channel_name} full. Closing connection")
        send_sig(channel_name, {"signal": "stop", "content": None})


class SendHandler(object):

    def __init__(self, channel_name, sync, time_limit=1, sleep_time=0.01):
        self.channel_name = channel_name
        self.max_open_results = getattr(settings, "BASE_TASKS_MAX_OPEN_RESULTS", 1)
        self.max_wait = getattr(settings, "BASE_TASKS_RESEND_WAIT", 10)
        self.max_attempts = getattr(settings, "BASE_TASKS_MAX_SEND_ATTEMPTS", 2)
        self.send_function = get_send_function(self.channel_name, sync, time_limit)
        self.sleep_time = sleep_time if sleep_time > 0 else 0.01
        self.sent = {}

    @property
    def open_sends(self):
        return { k:v for k, v in self.sent.items() if not v["ack"] }

    def send(self, content, key=None, attempt=1, sleep_time=None, hold=False):
        sleep_time = sleep_time or self.sleep_time
        max_open = 1 if hold else self.max_open_results
        while len(list(self.open_sends.keys())) >= max_open:
            sleep(sleep_time)
            sig = get_sig(self.channel_name)
            if sig["signal"] == "ack":
                self.ack(sig["key"])
            elif sig["signal"] is not None:
                send_sig(self.channel_name, sig)
                self.do_send(content, key, attempt)
                return
            for ky, open_send in list(self.open_sends.items()):
                if open_send["created"] + self.max_wait < time():
                    self.resend(ky)
        self.do_send(content, key, attempt)

    __call__ = send

    def ack(self, key):
        sent_item = self.sent[key]
        try:
            del sent_item["content"]
        except KeyError:
            logger.warning(f"Error acking {key}")
        sent_item["ack"] = True
            
    def do_send(self, content, key, attempt):
        result = self.send_function(content)
        if key is not None:
            self.sent[key] = {
                "content": content,
                "created": time(),
                "attempts": attempt,
                "result": result,
                "ack": False
            }

    def resend(self, key):
        resend = self.sent[key]
        if not resend["ack"] and resend["attempts"] < self.max_attempts:
            resend["attempts"] += 1
            try:
                self.send(resend["content"], key, attempt=resend["attempts"])
            except KeyError:
                logger.warning(f"can't resend acked {key}")
        else:
            self.ack(key)
    

def get_blocking_send_function(channel_name, sync, time_limit=1, sleep_time=0.01):
    return SendHandler(channel_name, sync, time_limit, sleep_time)

def get_blocking_send_functionx(channel_name, sync, time_limit=1, sleep_time=0.01):
    max_open_results = getattr(settings, "BASE_TASKS_MAX_OPEN_RESULTS", 1)
    send_function = get_send_function(channel_name, sync, time_limit)
    result_list = []
    def blocking_send_json(content, sleep_time=sleep_time, hold=False):
        [
            result_list.remove(result) for result in result_list
            if result.state in ("SUCCESS", "FAILURE")
        ]
        max_open = 1 if hold else max_open_results
        while len(result_list) >= max_open:
            sleep(sleep_time)
            [
                result_list.remove(result) for result in result_list
                if result.state in ("SUCCESS", "FAILURE")
            ]
        result = send_function(content)
        result_list.append(result)
    return blocking_send_json

def get_send_function(channel_name, sync=False, time_limit=1):
    if time_limit <= 1:
        task = send_to_channel
    elif time_limit <= 10:
        task = send_to_channel10
    elif time_limet <= 30:
        task = send_to_channel30
    else:
        task = send_to_channel60
    if sync:
        apply_method = task.apply
    else:
        apply_method = task.apply_async

    def do_send(*args, **kwargs):
        args = [channel_name] + list(args)
        return apply_method(args=args, kwargs=kwargs)

    return do_send

def get_sig(channel_name):
    sig = cache.pop(channel_name + '-control', stack=False)
    if sig is None:
        return {"signal": None, "content": None}
    content = json.loads(sig.decode('utf-8'))
    return content

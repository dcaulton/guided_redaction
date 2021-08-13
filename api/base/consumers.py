import logging

from channels.generic.websocket import JsonWebsocketConsumer
from django.conf import settings

import simplejson as json
from . import cache

logger = logging.getLogger(__name__)


class JsonWebsocketCeleryConsumer(JsonWebsocketConsumer):
    groups = ["scan-rule"]

    def connect(self):
        self.accept()
        logger.info(f"Accepting channel {self.channel_name}")

    def disconnect(self, close_code):
        if close_code != 1000:
            logger.info(f"Disconnecting channel {self.channel_name}")
            send_sig(self.channel_name, {"signal": "stop", "content": None})

    def receive_json(self, content):
        signal = content.get("signal", "start")
        payload = content.get("content", content)
        if signal == "start":
            if hasattr(self, "get_task_args"):
                args = self.get_task_args(payload)
            else:
                args = []
            if hasattr(self, "get_task_kwargs"):
                kwargs = self.get_task_kwargs(payload)
            else:
                kwargs = {}
            sync = payload.get("synchronous")
            if sync:
                kwargs["sync"] = sync
                self.task.apply(args=args, kwargs=kwargs)
            else:
                self.task.apply_async(args=args, kwargs=kwargs)
        else:
            send_sig(self.channel_name, content)

    def notify_close(self, content):
        self.close(1000)  # 1000 = normal close

    def notify_content(self, content):
        self.send_json(content)

    def notify_error(self, content):
        self.send_json(content)

    def notify_ping(self, content):
        self.send_json({"type": "notify.ping"})


def send_sig(channel_name, content):
    cache.push(
        channel_name + "-control",
        json.dumps(content).encode('utf-8')
    )

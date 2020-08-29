import json

from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync

from base import consumers


class GuidedRedactionConsumer(JsonWebsocketConsumer):
    def connect(self):
        group_name = 'redact-jobs'
        async_to_sync(self.channel_layer.group_add)(group_name, self.channel_name)
        self.accept()

    def jobs_message(self, event):
        self.send(json.dumps(event))

import simplejson as json
from base import viewsets
from rest_framework.response import Response

from django.shortcuts import render
from django.conf import settings
import requests
import base64


class LinkViewSetLearnDev(viewsets.ViewSet):
    def create(self, request):
        if not request_data.get("image_urls"):
            return self.error(["image_urls is required"], status_code=400)
        learn_dev_url = 'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/1435f669-773a-4e1e-ae0a-c43f46995178/d6ed106c-f662-4dcd-83e5-c82be77eae8d/'
        headers = {
          'Content-Type': 'multipart/form-data',
          'Authorization': 'Token 1579c82fcaeff643bc1a8a01540fc2696ce4332d',
        }
        image_url = 'http://localhost:3000/images/fire_b.jpg'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri = 'data:image/png;base64,' + image_base64.decode()

        post_data = {
            'image_data': data_uri,
        }
        learn_response = requests.post(
            learn_dev_url,
            headers=headers,
            data=post_data
        )
        print(learn_response)
        print(learn_response.text)



        return Response( {
            "nice": 'day',
        })

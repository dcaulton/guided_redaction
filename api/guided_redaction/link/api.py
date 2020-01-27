import simplejson as json
from base import viewsets
from rest_framework.response import Response

from django.shortcuts import render
from django.conf import settings
import requests
import base64
import binascii
import os


class LinkViewSetLearnDev(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("image_urls"):
            return self.error(["image_urls is required"], status_code=400)
        learn_dev_url = 'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/1435f669-773a-4e1e-ae0a-c43f46995178/d6ed106c-f662-4dcd-83e5-c82be77eae8d/'
        image_url = 'http://localhost:3000/images/fire_a.png'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri_1 = 'data:image/png;base64,' + image_base64.decode()
        image_url = 'http://localhost:3000/images/fire_b.png'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri_2 = 'data:image/png;base64,' + image_base64.decode()

        post_data = {
          'image_data': data_uri_2,
        }
        requests.packages.urllib3.disable_warnings()
        form_data, content_type = self.encode_multipart_formdata(post_data)
        learn_response = requests.post(
            learn_dev_url, 
            data=form_data,
            headers={
              'Content-Type': content_type,
              'Authorization': 'Token 1579c82fcaeff643bc1a8a01540fc2696ce4332d',
            },
            verify=False,
            allow_redirects=False
        )
        print(learn_response)
        print(learn_response.headers)

        return Response( {
            "nice": 'day',
        })

    def encode_multipart_formdata(self, fields):
        boundary = binascii.hexlify(os.urandom(16)).decode('ascii')

        body = (
            "".join("--%s\r\n"
                    "Content-Disposition: form-data; name=\"%s\"\r\n"
                    "\r\n"
                    "%s\r\n" % (boundary, field, value)
                    for field, value in fields.items()) +
            "--%s--\r\n" % boundary
        )

        content_type = "multipart/form-data; boundary=%s" % boundary

        return body, content_type

class LinkViewSetJunkSniffer(viewsets.ViewSet):
    def create(self, request):
        import pdb; pdb.set_trace()
        print('===================MANGO============================================')
        print(request.data.keys())
        print(request.headers)
        if not request.data.get("image_data"):
            return self.error(["image_data is required"], status_code=400)
        print('imcoming data is {} long '.format(len(request.data['image_data'])))
        return Response( {
            "poopsy": 'daisy',
        })

class LinkViewSetCanReach(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("url"):
            return self.error(["url is required"], status_code=400)
        can_reach = False
        url = request.data.get('url')
        try:
            response = requests.head(url)
            if response.status_code == 200:
                return Response({"can_reach": True})
            return Response({"can_reach": False})
        except Exception as e:
            print('can reach exception: ', e)
            return Response({"can_reach": False})

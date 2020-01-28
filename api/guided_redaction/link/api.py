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
        learn_dev_url = request.data.get(
            'learn_dev_url', 
            'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/1435f669-773a-4e1e-ae0a-c43f46995178/d6ed106c-f662-4dcd-83e5-c82be77eae8d/')
        auth_token = request.data.get('learn_dev_auth_token', '1579c82fcaeff643bc1a8a01540fc2696ce4332d')
        data_uris = []
        image_urls = request.data.get('image_urls')
        for image_url in image_urls:
            image_binary = requests.get(image_url).content
            image_base64 = base64.b64encode(image_binary)
            data_uri = 'data:image/png;base64,' + image_base64.decode()
            data_uris.append(data_uri)

        form_data, content_type = self.build_image_data_formdata(data_uris)
        requests.packages.urllib3.disable_warnings()
        learn_response = requests.post(
            learn_dev_url, 
            data=form_data,
            headers={
              'Content-Type': content_type,
              'Authorization': 'Token ' + auth_token,
            },
            verify=False,
            allow_redirects=False
        )

        landing_page = learn_response.headers.get('Location')
        if not landing_page:
            return self.error(['could not get edit url from learn response'], status_code=400)

        return Response( {
            "learn_edit_url": landing_page,
        })

    def build_image_data_formdata(self, data_uris):
        # This one is specialized to take three images and put them in the image_data parameter
        boundary = binascii.hexlify(os.urandom(16)).decode('ascii')
        content_type = "multipart/form-data; boundary=%s" % boundary
        body = (
            "".join("--%s\r\n"
                    "Content-Disposition: form-data; name=\"image_data\"\r\n"
                    "\r\n"
                    "%s\r\n" % (boundary, data_uri)
                    for data_uri in data_uris) +
            "--%s--\r\n" % boundary
        )
        return body, content_type

    def encode_multipart_formdata(self, fields):
        # This one works for non-repeating elements
        boundary = binascii.hexlify(os.urandom(16)).decode('ascii')
        content_type = "multipart/form-data; boundary=%s" % boundary
        body = (
            "".join("--%s\r\n"
                    "Content-Disposition: form-data; name=\"%s\"\r\n"
                    "\r\n"
                    "%s\r\n" % (boundary, field, value)
                    for field, value in fields.items()) +
            "--%s--\r\n" % boundary
        )
        return body, content_type

class LinkViewSetJunkSniffer(viewsets.ViewSet):
    def create(self, request):
        print(request.data.keys())
        print(request.headers)
        print(request.data)
        return Response( {
            "got": "it",
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

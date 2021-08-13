import base64
import binascii
import os
import ssl
import re
import requests
from traceback import format_exc

from django.conf import settings
from django.shortcuts import render
from rest_framework.response import Response
import simplejson as json

from base import viewsets

class LinkViewSetLearn(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("image_urls"):
            return self.error(["image_urls is required"], status_code=400)
            
        learn_url = request.data.get(
            'learn_url', 
            'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/6956de85-d9b5-4fd2-a8b2-45e2f06a4daa/7412597f-794b-4245-8289-4e92a1845a9a/'
        )
        if request.data.get('target_instance') == 'learn_prod':
            learn_url = request.data.get(
                'learn_url', 
                'https://onelearn.sykes.com/microlearning/mixer/create/b875eab9-c486-40ae-9b86-13027d0d7e90/494c2b08-112c-472f-8b71-d0a2e4f55939/'
            )

        data_uris = []
        image_urls = request.data.get('image_urls')
        for image_url in image_urls:
            image_binary = requests.get(
                image_url,
                verify=False,
            ).content
            image_base64 = base64.b64encode(image_binary)
            data_uri = 'data:image/png;base64,' + image_base64.decode()
            data_uris.append(data_uri)

        form_data, content_type = self.build_image_data_formdata(data_uris)
        requests.packages.urllib3.disable_warnings()
        if (not os.environ.get('PYTHONHTTPSVERIFY', '') and
            getattr(ssl, '_create_unverified_context', None)):
            ssl._create_default_https_context = ssl._create_unverified_context
        learn_response = requests.post(
            learn_url, 
            data=form_data,
            headers={
              'Content-Type': content_type,
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
            if 200 <= response.status_code < 300:
                return Response({"can_reach": True})
            return Response({"can_reach": False})
        except Exception as e:
            print(format_exc())
            return Response({"can_reach": False})

class LinkViewSetProxy(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("method"):
            return self.error(["method is required"], status_code=400)
        if not request.data.get("url"):
            return self.error(["url is required"], status_code=400)
        the_url = request.data.get('url')

        if request.data.get('method') == 'GET': 
            response = requests.get(
                the_url,
                verify=False,
            )
            if 200 <= response.status_code < 300:
                return Response({"response": response.content})
        return self.error(response.content, status_code=400)

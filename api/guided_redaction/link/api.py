import simplejson as json
from base import viewsets
from rest_framework.response import Response

from django.shortcuts import render
from django.conf import settings
import requests
import base64
import binascii
import os
import ssl
import re


class LinkViewSetLearnDev(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("image_urls"):
            return self.error(["image_urls is required"], status_code=400)
        learn_dev_url = request.data.get(
            'learn_dev_url', 
            'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/6956de85-d9b5-4fd2-a8b2-45e2f06a4daa/7412597f-794b-4245-8289-4e92a1845a9a/'
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
            learn_dev_url, 
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
            if response.status_code == 200:
                return Response({"can_reach": True})
            return Response({"can_reach": False})
        except Exception as e:
            print('can reach exception: ', e)
            return Response({"can_reach": False})

class LinkViewSetGetTelemetryRows(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("raw_data_url"):
            return self.error(["raw_data_url is required"], status_code=400)
        if not request.data.get("transaction_id"):
            return self.error(["transaction_id is required"], status_code=400)
        url = request.data.get('raw_data_url')
        transaction_id = request.data['transaction_id']
        try:
            response = requests.get(
                url,
                verify=False,
            ).content
            txn_id_regex = re.compile(transaction_id)
            datetime_regex = re.compile('(\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d)')
            by_date = {}
            resp_lines = response.splitlines()
            for line in resp_lines:
                line_as_string = line.decode('utf-8')
                if txn_id_regex.search(line_as_string):
                    match = datetime_regex.search(line_as_string)
                    if match:
                      the_datetime_string = match.group(1)
                      if the_datetime_string not in by_date:
                        by_date[the_datetime_string] = []
                    by_date[the_datetime_string].append(line_as_string)
            matching_lines = []
            for the_datetime_string in sorted(list(by_date.keys())):
              for line_as_string in by_date[the_datetime_string]:
                matching_lines.append(line_as_string)
            return Response({"lines": matching_lines})
        except Exception as e:
            print('get telemetry data exception: ', e)
            return Response({"lines": []})

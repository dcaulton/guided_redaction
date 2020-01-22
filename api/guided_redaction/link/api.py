import simplejson as json
from base import viewsets
from rest_framework.response import Response

from django.shortcuts import render
from django.conf import settings
import requests
import base64


class LinkViewSetLearnDev(viewsets.ViewSet):
    def create(self, request):
        if not request.data.get("image_urls"):
            return self.error(["image_urls is required"], status_code=400)
        learn_dev_url = 'http://localhost:8000/api/v1/link/junk-sniffer'
#        learn_dev_url = 'https://osmae2lnxs117.amer.sykes.com/microlearning/mixer/create/1435f669-773a-4e1e-ae0a-c43f46995178/d6ed106c-f662-4dcd-83e5-c82be77eae8d/'
        headers = {
          'Content-Type': 'multipart/form-data',
#          'Content-Type': 'multipart/form-data;boundary=!!!DONKEY_CHOW!!!',
#          'Content-Type': 'image/png',
#          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Token 1579c82fcaeff643bc1a8a01540fc2696ce4332d',
        }
        image_url = 'http://localhost:3000/images/ss1.png'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri_1 = 'data:image/png;base64,' + image_base64.decode()
        image_url = 'http://localhost:3000/images/ss2.png'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri_2 = 'data:image/png;base64,' + image_base64.decode()
        image_url = 'http://localhost:3000/images/ss3.png'
        image_binary = requests.get(image_url).content
        image_base64 = base64.b64encode(image_binary)
        data_uri_3 = 'data:image/png;base64,' + image_base64.decode()
        print('data uri 1 is {} long'.format(len(data_uri_1)))
        print('data uri 2 is {} long'.format(len(data_uri_2)))
        print('data uri 3 is {} long'.format(len(data_uri_3)))
        fh = open('/Users/dcaulton/Desktop/funky.txt', 'w')
        fh.writelines(data_uri_1)
        fh.close()

        post_data = {
            'image_data': [
                data_uri_1,
                data_uri_2,
                data_uri_3
            ],
        }
        post_data2 = '''
        --!!!DONKEY_CHOW!!!
        Content-Disposition: form-data; name=image_data',

        {}
        --!!!DONKEY_CHOW!!!
        '''.format(data_uri_1)

#        learn_response = requests.post( \
#            learn_dev_url, 
#            data=post_data
#        )
        requests.packages.urllib3.disable_warnings()
#        learn_response = requests.post( learn_dev_url, data=post_data)
        learn_response = requests.post(
            learn_dev_url, 
            data=post_data2,
            headers=headers,
            verify=False,
            allow_redirects=False
        )
#        learn_response = requests.post( learn_dev_url, data=post_data, headers=headers, verify=False, allow_redirects=False)
        print(learn_response)
        print(learn_response.text)
        print(learn_response.headers)

        return Response( {
            "nice": 'day',
        })

class LinkViewSetJunkSniffer(viewsets.ViewSet):
    def create(self, request):
        print('================= holla back girl')
        import pdb; pdb.set_trace()
        if not request.data.get("image_data"):
            return self.error(["image_data is required"], status_code=400)
        print('MANNNNNNGGGGGOOOOO')
        print(request.data)
        print('imcoming data is {} long '.format(len(request.data['image_data'])))
        return Response( {
            "poopsy": 'daisy',
        })

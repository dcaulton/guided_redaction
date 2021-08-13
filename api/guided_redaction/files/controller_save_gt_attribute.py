import requests

from django.conf import settings

class SaveGTAttributeController():

    def __init__(self):
        pass

    def save_gt_attribute(self, request_data):
        response_obj = {
            'status': 'success',
            'receipt_data': [],
        }

        account_id = request_data.get('original_account_id')
        timestamp = request_data.get('original_timestamp')
        transaction_id = request_data.get('original_transaction_id')
        call_obj = {
          "specifier": {
            "account": account_id,
            "transaction_id": transaction_id,
          },
          "attribute": {
            "attrName": "RecordingKey",
            "attrId": "",
            "attrValue": "<redacted_recording_id>",
            "sourceDateTime": timestamp,
            "attrSourceName": "redaction: <original_recording_id>"
          }
        }
        new_file_info = request_data.get('new_file_info')
        headers = {f"Authorization": f"Api-Key {settings.LOCAL_API_KEY}"}
        url = '/api/v2/gt-attributes'

        for movie_obj in new_file_info:
            if movie_obj.get('status') != 'success':
                continue
            source_url = movie_obj.get('source_movie_url')
            source_recording_id = movie_obj.get('source_movie_recording_id')
            new_recording_id = movie_obj.get('recording_id')
            if not source_recording_id or not new_recording_id:
                continue
            call_obj['attribute']['attrSourceName'] = 'redaction: ' + source_recording_id
            call_obj['attribute']['attrValue'] = new_recording_id
            response = requests.post(url, json=call_obj, headers=headers)
            
            one_call_resp_obj = {
                'status': 'failed',
                'orig_recording_id': source_recording_id,
                'new_recording_id': new_recording_id,
            }
            if 200 <= response.status_code < 300:
                one_call_resp_obj['status'] = 'success'
            response_obj['receipt_data'].append(one_call_resp_obj)

        return response_obj

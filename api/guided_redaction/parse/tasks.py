from celery import shared_task                                                  
import json                                                                     
from guided_redaction.jobs.models import Job                                    
from guided_redaction.parse.views import ParseViewSetSplitAndHashMovie
                                                                                
@shared_task                                                                    
def split_and_hash_movie(job_uuid):                                                    
    job = Job.objects.filter(uuid=job_uuid).first()                             
    if job:                                                                     
        job.status = 'running'                                                  
        job.save()                                                              
        print('scanning template for job ', job_uuid)                           
        request_data = json.loads(job.request_data)                             
        pvssahm = ParseViewSetSplitAndHashMovie()                                    
        response_data = pvssahm.process_create_request(request_data)              
        if response_data['errors_400']:                                         
            job.status = 'failed'                                               
            job.response_data = json.dumps(response_data['errors_400'])         
        elif response_data['errors_422']:                                       
            job.status = 'failed'                                               
            job.response_data = json.dumps(response_data['errors_422'])         
        else:                                                                   
            job.response_data = json.dumps(response_data['response_data'])      
            job.status = 'success'                                              
        job.save()                                                              
    else:                                                                       
        print('error, calling split_and_hash_movie on nonexistent job: ', job_uuid) 

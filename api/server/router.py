from rest_framework import routers                                              
                                                                                
router = None                                                                   
                                                                                
                                                                                
def get_router():                                                               
    global router                                                               
    if not router:                                                              
        router = routers.DefaultRouter(trailing_slash=False)                    
    return router                                                               


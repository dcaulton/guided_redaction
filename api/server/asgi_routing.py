from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.wsgi import get_wsgi_application
import server.asgi as local_asgi

#import gt.asgi_routing
#import inspector.asgi_routing
#import scan_rule.asgi_routing
import guided_redaction.asgi_routing
from server.router import get_asgi_router
import server.urls 

asgi_router = get_asgi_router()
wsgi_application = get_wsgi_application()
asgi_application = local_asgi.application
 
application = ProtocolTypeRouter({
    'http': asgi_application,
#    'http': AuthMiddlewareStack(URLRouter(asgi_router.urls)),
#    'http': URLRouter(server.urls.router.urls),
#    'http': AuthMiddlewareStack(URLRouter(server.urls.router.urls)),
    'websocket': AuthMiddlewareStack(URLRouter(asgi_router.urls))
})

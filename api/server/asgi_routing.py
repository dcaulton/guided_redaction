from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.wsgi import get_wsgi_application

#import gt.asgi_routing
#import inspector.asgi_routing
#import scan_rule.asgi_routing
import guided_redaction.asgi_routing
from server.router import get_asgi_router

asgi_router = get_asgi_router()
wsgi_application = get_wsgi_application()
 
application = ProtocolTypeRouter({
#    'http': wsgi_application,
    'http': AuthMiddlewareStack(URLRouter(asgi_router.urls)),
    'websocket': AuthMiddlewareStack(URLRouter(asgi_router.urls))
})

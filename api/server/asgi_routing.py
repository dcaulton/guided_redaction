from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

import guided_redaction.asgi_routing
from server.router import get_asgi_router
import server.urls 

asgi_router = get_asgi_router()
 
application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(URLRouter(asgi_router.urls))
})

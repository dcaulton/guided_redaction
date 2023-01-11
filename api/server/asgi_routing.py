from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

#import gt.asgi_routing
#import inspector.asgi_routing
#import scan_rule.asgi_routing
import guided_redaction.asgi_routing
from server.router import get_asgi_router

router = get_asgi_router()

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'websocket': AuthMiddlewareStack(URLRouter(router.urls))
})

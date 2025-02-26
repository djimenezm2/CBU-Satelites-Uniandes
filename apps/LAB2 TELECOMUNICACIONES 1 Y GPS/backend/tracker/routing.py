from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^/?cbusatelites/lab2/ws/devices/?$', consumers.DeviceConsumer.as_asgi()),
]
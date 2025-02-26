from django.apps import AppConfig
import os
import sys

class TrackerConfig(AppConfig):
    name = 'tracker'

    def ready(self):
        from .mqtt_client import start_mqtt_client
        start_mqtt_client()

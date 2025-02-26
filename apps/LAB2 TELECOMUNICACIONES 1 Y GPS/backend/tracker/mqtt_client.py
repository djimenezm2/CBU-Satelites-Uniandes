import json
import ssl
import threading
import time
import datetime
from django.utils.dateparse import parse_datetime
import paho.mqtt.client as mqtt
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from tracker.models import DeviceLocation
from django.conf import settings
from django.db import close_old_connections
import sys

class MQTTClient:
    def __init__(self):
        mqtt_config = settings.CONFIG.get('mqtt', {})
        self.host = mqtt_config.get('host')
        self.port = int(mqtt_config.get('port', 8883))
        self.username = mqtt_config.get('username')
        self.password = mqtt_config.get('password')
        # Usamos el topic definido en el config o por defecto "CBUSATELITES"
        self.topic = mqtt_config.get('topic', 'CBUSATELITES')
        self.client = mqtt.Client()
        self.configure_client()

    def configure_client(self):
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
        # Configura TLS/SSL (se asume que el certificado es provisto por el servidor)
        self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc):
        client.subscribe(self.topic)

    def on_message(self, client, userdata, msg):
        try:
            close_old_connections()
            payload = msg.payload.decode('utf-8')
            data = json.loads(payload)
            device_id = data.get('ID')

            if not device_id:
                return

            # Convertir la fecha recibida a un objeto datetime
            fechaHora_str = data.get('fechaHora')

            # Transformar de formato "MM/DD/YYYY HH:MM:SS.sss" a "YYYY-MM-DD HH:MM:SS"
            fechaHora_obj = datetime.datetime.strptime(fechaHora_str, "%m/%d/%Y %H:%M:%S.%f")

            # Convertirlo a formato ISO 8601 compatible con Django
            fechaHora_iso = fechaHora_obj.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

            # Convertir a objeto datetime Django
            fechaHora = parse_datetime(fechaHora_iso)

            # Actualiza o crea el registro de la ubicación
            DeviceLocation.objects.update_or_create(
                device_id=device_id,
                defaults={
                    'latitud': data.get('latitud'),
                    'longitud': data.get('longitud'),
                    'velocidad': data.get('velocidad'),
                    'satelites': data.get('satelites'),
                    'hdop': data.get('hdop'),
                    'fechaHora': fechaHora,
                }
            )

            # Enviar actualización vía Channels a todos los clientes conectados
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "send_device_update",
                    "data": data,
                }
            )
        except Exception as e:
            print("Error al procesar el mensaje:", e)

    def connect_and_loop(self):
        while True:
            try:
                print("Intentando conectar al broker MQTT...")
                self.client.connect(self.host, self.port, 60)
                print("Conectado al broker MQTT")
                self.client.loop_forever()
            except Exception as e:
                print("Error en el loop MQTT:", e)
            # Espera unos segundos antes de reintentar la conexión
            time.sleep(5)

    def on_disconnect(self, client, userdata, rc):
        print("Desconectado del broker MQTT con código:", rc)
        self.connect_and_loop(self)


    def start(self):
        sys.stdout.flush()
        thread = threading.Thread(target=self.connect_and_loop)
        thread.daemon = True
        thread.start()

# Función de conveniencia para iniciar el cliente MQTT
def start_mqtt_client():
    mqtt_client = MQTTClient()
    mqtt_client.start()

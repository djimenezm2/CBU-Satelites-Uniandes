import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from tracker.models import DeviceLocation
from django.db import close_old_connections, connection

# Variables globales para el reset
RESET_ATTEMPTS = 0
RESET_BLOCKED_UNTIL = None
RESET_PASSWORD = "cubesat1u"  # Define la contraseña deseada

def is_reset_blocked():
    global RESET_BLOCKED_UNTIL
    if RESET_BLOCKED_UNTIL is None:
        return False
    if datetime.datetime.now() < RESET_BLOCKED_UNTIL:
        return True
    else:
        RESET_BLOCKED_UNTIL = None
        return False

def increment_reset_attempts():
    global RESET_ATTEMPTS, RESET_BLOCKED_UNTIL
    RESET_ATTEMPTS += 1
    if RESET_ATTEMPTS >= 3:
        RESET_BLOCKED_UNTIL = datetime.datetime.now() + datetime.timedelta(minutes=5)
        RESET_ATTEMPTS = 0  # Reiniciamos el contador

def reset_reset_attempts():
    global RESET_ATTEMPTS
    RESET_ATTEMPTS = 0

class DeviceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("devices", self.channel_name)
        await self.accept()

        # Enviar la información inicial (persistencia) desde la DB
        devices = await self.get_all_devices()
        init_message = {
            "type": "init",
            "devices": devices
        }
        await self.send(text_data=json.dumps(init_message))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("devices", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            # Detectar mensaje de reset
            if data.get("type") == "reset":
                password = data.get("password", "")
                if is_reset_blocked():
                    await self.send(text_data=json.dumps({
                        "type": "reset_error",
                        "message": "Funcionalidad de reset bloqueada. Intente más tarde."
                    }))
                else:
                    if password != RESET_PASSWORD:
                        increment_reset_attempts()
                        await self.send(text_data=json.dumps({
                            "type": "reset_error",
                            "message": "Contraseña incorrecta."
                        }))
                    else:
                        reset_reset_attempts()
                        # Borrar todos los dispositivos en la DB
                        await self.reset_devices()
                        # Notificar a todos los clientes que se reseteó la aplicación
                        reset_message = {"type": "reset_success"}
                        await self.channel_layer.group_send("devices", {
                            "type": "send_reset",
                            "data": reset_message
                        })
            # Aquí puedes manejar otros tipos de mensajes
        except Exception as e:
            print("Error al procesar el mensaje:", e)

    async def send_device_update(self, event):
        data = event['data']
        await self.send(text_data=json.dumps(data))

    async def send_reset(self, event):
        data = event['data']
        await self.send(text_data=json.dumps(data))

    @sync_to_async
    def get_all_devices(self):
        close_old_connections()

        qs = DeviceLocation.objects.all().values()
        devices = []
        for device in qs:
            nuevo = {}
            # Renombramos 'device_id' a 'ID' para que coincida con el front
            nuevo["ID"] = device.get("device_id")
            nuevo["latitud"] = float(device.get("latitud"))
            nuevo["longitud"] = float(device.get("longitud"))
            nuevo["velocidad"] = float(device.get("velocidad"))
            nuevo["satelites"] = device.get("satelites")
            nuevo["hdop"] = float(device.get("hdop"))
            fecha = device.get("fechaHora")
            if fecha:
                micro_segundos = fecha.microsecond // 10000
                nuevo["fechaHora"] = fecha.strftime("%m/%d/%Y %H:%M:%S.") + f"{micro_segundos:02d}"
            devices.append(nuevo)
        # Cerramos la conexión para forzar una nueva en la siguiente operación
        connection.close()
        return devices

    @sync_to_async
    def reset_devices(self):
        close_old_connections()
        DeviceLocation.objects.all().delete()
        connection.close()

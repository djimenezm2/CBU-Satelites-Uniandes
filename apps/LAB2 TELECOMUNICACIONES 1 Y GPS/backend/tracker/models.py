from django.db import models

class DeviceLocation(models.Model):
    device_id = models.CharField(max_length=255, unique=True, primary_key=True, db_index=True)
    latitud = models.DecimalField(max_digits=15, decimal_places=12)
    longitud = models.DecimalField(max_digits=15, decimal_places=12)
    velocidad = models.DecimalField(max_digits=5, decimal_places=2)
    satelites = models.IntegerField()
    hdop = models.DecimalField(max_digits=4, decimal_places=2)
    fechaHora = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'device_location'
    def __str__(self):
        return f"Dispositivo {self.device_id}"

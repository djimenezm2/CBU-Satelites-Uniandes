from django.http import JsonResponse
from django.views.decorators.http import require_POST
from tracker.models import DeviceLocation

@require_POST
def wipe_database(request):
    DeviceLocation.objects.all().delete()
    return JsonResponse({'status': 'ok', 'message': 'Base de datos borrada.'})

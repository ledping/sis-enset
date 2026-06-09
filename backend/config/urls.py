from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.journal.views import DashboardView
 
urlpatterns = [
    path('admin/',              admin.site.urls),
    path('api/auth/',           include('apps.users.urls')),
    path('api/documents/',      include('apps.documents.urls')),
    path('api/memoires/',       include('apps.memoires.urls')),
    path('api/dashboard/',      DashboardView.as_view(), name='dashboard'),
    path('api/messages/',       include('apps.messagerie.urls')),
    path('api/notifications/',  include('apps.notifications.urls')),
    path('api/sessions/',       include('apps.sessions_reseau.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

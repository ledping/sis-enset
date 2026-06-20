from django.contrib import admin
from .models import AppelInterne, SignalAppel


@admin.register(AppelInterne)
class AppelInterneAdmin(admin.ModelAdmin):
    list_display = ('id', 'appelant', 'destinataire', 'type_appel', 'statut', 'started_at', 'answered_at', 'ended_at', 'duree_secondes')
    list_filter = ('type_appel', 'statut', 'started_at')
    search_fields = ('appelant__username', 'destinataire__username', 'appelant__first_name', 'destinataire__first_name')


@admin.register(SignalAppel)
class SignalAppelAdmin(admin.ModelAdmin):
    list_display = ('id', 'appel', 'type_signal', 'emetteur', 'destinataire', 'lu', 'created_at')
    list_filter = ('type_signal', 'lu', 'created_at')

from django.contrib import admin
from .models import MessageInterne


@admin.register(MessageInterne)
class MessageInterneAdmin(admin.ModelAdmin):
    list_display = ('objet', 'expediteur', 'destinataire', 'lu', 'created_at')
    list_filter = ('lu', 'created_at')
    search_fields = ('objet', 'contenu', 'expediteur__username', 'destinataire__username')

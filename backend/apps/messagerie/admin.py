from django.contrib import admin
from .models import MessageInterne, PieceJointeMessage


class PieceJointeMessageInline(admin.TabularInline):
    model = PieceJointeMessage
    extra = 0
    readonly_fields = ('nom_original', 'type_fichier', 'taille', 'est_vocal', 'created_at')


@admin.register(MessageInterne)
class MessageInterneAdmin(admin.ModelAdmin):
    list_display = ('objet', 'expediteur', 'destinataire', 'lu', 'created_at')
    list_filter = ('lu', 'created_at')
    search_fields = ('objet', 'contenu', 'expediteur__username', 'destinataire__username')
    inlines = [PieceJointeMessageInline]


@admin.register(PieceJointeMessage)
class PieceJointeMessageAdmin(admin.ModelAdmin):
    list_display = ('nom_original', 'message', 'est_vocal', 'taille', 'created_at')
    list_filter = ('est_vocal', 'created_at')
    search_fields = ('nom_original', 'message__objet')

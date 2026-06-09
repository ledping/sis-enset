from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('titre', 'user', 'type', 'lu', 'created_at')
    list_filter = ('type', 'lu', 'created_at')
    search_fields = ('titre', 'message', 'user__username', 'user__first_name', 'user__last_name')

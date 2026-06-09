from django.conf import settings
from django.db import models


class Notification(models.Model):
    class TypeNotification(models.TextChoices):
        INFO = 'INFO', 'Information'
        MESSAGE = 'MESSAGE', 'Message interne'
        VALIDATION = 'VALIDATION', 'Validation'
        REJET = 'REJET', 'Rejet'
        SYSTEME = 'SYSTEME', 'Système'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    titre = models.CharField(max_length=180)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TypeNotification.choices, default=TypeNotification.INFO)
    lien = models.CharField(max_length=220, blank=True)
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f'{self.titre} -> {self.user}'


def notifier(user, titre, message, type_notification=Notification.TypeNotification.INFO, lien=''):
    if not user:
        return None
    return Notification.objects.create(
        user=user,
        titre=titre,
        message=message,
        type=type_notification,
        lien=lien,
    )

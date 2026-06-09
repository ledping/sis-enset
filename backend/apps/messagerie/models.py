from django.conf import settings
from django.db import models


class MessageInterne(models.Model):
    expediteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_recus')
    objet = models.CharField(max_length=180)
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Message interne'
        verbose_name_plural = 'Messages internes'

    def __str__(self):
        return f'{self.objet} - {self.expediteur} -> {self.destinataire}'

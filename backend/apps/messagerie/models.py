from django.conf import settings
from django.db import models


def message_attachment_upload_path(instance, filename):
    message_id = instance.message_id or 'nouveau'
    kind = 'vocaux' if instance.est_vocal else 'pieces_jointes'
    return f'messages/{message_id}/{kind}/{filename}'


class MessageInterne(models.Model):
    expediteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_recus')
    objet = models.CharField(max_length=180)
    contenu = models.TextField(blank=True)
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Message interne'
        verbose_name_plural = 'Messages internes'

    def __str__(self):
        return f'{self.objet} - {self.expediteur} -> {self.destinataire}'


class PieceJointeMessage(models.Model):
    message = models.ForeignKey(MessageInterne, related_name='pieces_jointes', on_delete=models.CASCADE)
    fichier = models.FileField(upload_to=message_attachment_upload_path)
    nom_original = models.CharField(max_length=255)
    type_fichier = models.CharField(max_length=120, blank=True)
    taille = models.PositiveIntegerField(default=0)
    est_vocal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Piece jointe de message'
        verbose_name_plural = 'Pieces jointes de messages'

    def __str__(self):
        return self.nom_original

from django.conf import settings
from django.db import models
from django.utils import timezone


class AppelInterne(models.Model):
    class TypeAppel(models.TextChoices):
        AUDIO = 'audio', 'Audio'
        VIDEO = 'video', 'Video'

    class Statut(models.TextChoices):
        SONNERIE = 'sonnerie', 'En sonnerie'
        ACTIF = 'actif', 'En cours'
        REFUSE = 'refuse', 'Refuse'
        MANQUE = 'manque', 'Manque'
        TERMINE = 'termine', 'Termine'
        ANNULE = 'annule', 'Annule'

    appelant = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='appels_lances', on_delete=models.CASCADE)
    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='appels_recus', on_delete=models.CASCADE)
    type_appel = models.CharField(max_length=10, choices=TypeAppel.choices, default=TypeAppel.AUDIO)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.SONNERIE)
    started_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duree_secondes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Appel interne'
        verbose_name_plural = 'Appels internes'

    def __str__(self):
        return f'{self.appelant} -> {self.destinataire} ({self.type_appel})'

    def close(self, statut=None):
        now = timezone.now()
        self.ended_at = now
        if statut:
            self.statut = statut
        if self.answered_at:
            self.duree_secondes = max(0, int((now - self.answered_at).total_seconds()))
        self.save(update_fields=['ended_at', 'statut', 'duree_secondes'])


class SignalAppel(models.Model):
    class TypeSignal(models.TextChoices):
        INCOMING = 'incoming', 'Appel entrant'
        ACCEPTED = 'accepted', 'Accepte'
        REFUSED = 'refused', 'Refuse'
        OFFER = 'offer', 'Offre WebRTC'
        ANSWER = 'answer', 'Reponse WebRTC'
        ICE = 'ice', 'Candidat ICE'
        ENDED = 'ended', 'Termine'
        CANCELLED = 'cancelled', 'Annule'

    appel = models.ForeignKey(AppelInterne, related_name='signaux', on_delete=models.CASCADE)
    emetteur = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='signaux_envoyes', on_delete=models.CASCADE)
    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='signaux_recus', on_delete=models.CASCADE)
    type_signal = models.CharField(max_length=20, choices=TypeSignal.choices)
    payload = models.JSONField(default=dict, blank=True)
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['destinataire', 'lu', 'created_at']),
            models.Index(fields=['appel', 'created_at']),
        ]
        verbose_name = 'Signal appel'
        verbose_name_plural = 'Signaux appels'

    def __str__(self):
        return f'{self.type_signal} / appel {self.appel_id}'

from django.db import models  # type: ignore[import]
from django.conf import settings  # type: ignore[import]
 
 
class JournalActivite(models.Model):
 
    class TypeAction(models.TextChoices):
        CONNEXION      = 'CONNEXION',      'Connexion'
        DECONNEXION    = 'DECONNEXION',    'Déconnexion'
        DEPOT          = 'DEPOT',          'Dépôt document'
        TELECHARGEMENT = 'TELECHARGEMENT', 'Téléchargement'
        CONSULTATION   = 'CONSULTATION',   'Consultation'
        MODIFICATION   = 'MODIFICATION',   'Modification'
        SUPPRESSION    = 'SUPPRESSION',    'Suppression'
        VALIDATION     = 'VALIDATION',     'Validation'
 
    utilisateur  = models.ForeignKey(settings.AUTH_USER_MODEL,
                       on_delete=models.SET_NULL, null=True)
    action       = models.CharField(max_length=20, choices=TypeAction.choices)
    description  = models.CharField(max_length=500)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Journal d\'activité'
 
    def __str__(self):
        return f'[{self.timestamp.strftime("%d/%m %H:%M")}] {self.utilisateur} — {self.action}'
 
 
def log(user, action, description, ip=None):
    """Fonction helper pour journaliser une action."""
    JournalActivite.objects.create(
        utilisateur=user, action=action,
        description=description, ip_address=ip
    )

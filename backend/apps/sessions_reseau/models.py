from django.db import models
from django.conf import settings
from django.utils import timezone
 
 
class SessionReseau(models.Model):
 
    utilisateur     = models.ForeignKey(settings.AUTH_USER_MODEL,
                          on_delete=models.SET_NULL, null=True)
    ip_address      = models.GenericIPAddressField()
    mac_address     = models.CharField(max_length=17, blank=True)
    debut           = models.DateTimeField(default=timezone.now)
    fin             = models.DateTimeField(null=True, blank=True)
    mikrotik_ok     = models.BooleanField(default=False)
 
    class Meta:
        ordering = ['-debut']
        verbose_name = 'Session réseau'
 
    @property
    def duree_str(self):
        ref = self.fin or timezone.now()
        delta = ref - self.debut
        h, rem = divmod(int(delta.total_seconds()), 3600)
        m = rem // 60
        return f'{h}h{m:02d}m'
 
    def __str__(self):
        return f'{self.utilisateur} — {self.ip_address} ({self.debut.strftime("%d/%m %H:%M")})'

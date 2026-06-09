from django.db import models
from django.conf import settings


class Memoire(models.Model):

    class Niveau(models.TextChoices):
        DIPET1 = 'DIPET1', 'DIPET I (Niveau 3)'
        DIPET2 = 'DIPET2', 'DIPET II (Niveau 5)'

    class Statut(models.TextChoices):
        SOUMIS = 'SOUMIS', 'Soumis'
        PREVALIDE = 'PREVALIDE', 'Prévalidé automatiquement'
        VALIDE = 'VALIDE', 'Archivé'
        REJETE = 'REJETE', 'Rejeté'

    titre = models.CharField(max_length=400)
    auteur_nom = models.CharField(max_length=200)
    encadreur = models.CharField(max_length=200)
    departement = models.CharField(max_length=100)
    filiere = models.CharField(max_length=100)
    niveau = models.CharField(max_length=10, choices=Niveau.choices)
    annee_academique = models.CharField(max_length=9)
    resume = models.TextField()
    mots_cles = models.CharField(max_length=500, blank=True)
    fichier_pdf = models.FileField(upload_to='memoires/')
    statut = models.CharField(max_length=12, choices=Statut.choices, default=Statut.SOUMIS)
    depose_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='memoires_deposes',
    )
    commentaire_validation = models.TextField(blank=True)
    nb_telechargements = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-annee_academique', 'titre']
        verbose_name = 'Mémoire'
        verbose_name_plural = 'Mémoires'

    def __str__(self):
        return f'{self.titre} — {self.auteur_nom} ({self.annee_academique})'

    @property
    def est_complet_pour_prevalidation(self):
        required_texts = [
            self.titre,
            self.auteur_nom,
            self.encadreur,
            self.departement,
            self.filiere,
            self.niveau,
            self.annee_academique,
            self.resume,
        ]
        return all(str(value).strip() for value in required_texts) and bool(self.fichier_pdf)

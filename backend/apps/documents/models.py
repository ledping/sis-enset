from django.db import models
from django.conf import settings
 
 
class Document(models.Model):
    """Ressource pédagogique déposée par un enseignant."""
 
    class TypeDocument(models.TextChoices):
        COURS       = 'COURS',       'Cours'
        TD          = 'TD',          'Travaux Dirigés'
        TP          = 'TP',          'Travaux Pratiques'
        EXAMEN      = 'EXAMEN',      'Examen'
        CORRIGE     = 'CORRIGE',     'Corrigé'
        SUPPORT     = 'SUPPORT',     'Support pédagogique'
        ADMIN       = 'ADMIN',       'Note administrative'
 
    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente de validation'
        VALIDE     = 'VALIDE',     'Validé'
        REJETE     = 'REJETE',     'Rejeté'
 
    titre           = models.CharField(max_length=300)
    description     = models.TextField(blank=True)
    type_doc        = models.CharField(max_length=20, choices=TypeDocument.choices)
    fichier         = models.FileField(upload_to='documents/')
    auteur          = models.ForeignKey(settings.AUTH_USER_MODEL,
                          on_delete=models.SET_NULL, null=True,
                          related_name='documents')
    departement     = models.CharField(max_length=100)
    filiere         = models.CharField(max_length=100, blank=True)
    niveau          = models.IntegerField(null=True, blank=True)
    annee_academique= models.CharField(max_length=9, blank=True)
    statut          = models.CharField(max_length=20, choices=Statut.choices,
                          default=Statut.EN_ATTENTE)
    nb_telechargements = models.IntegerField(default=0)
    nb_consultations   = models.IntegerField(default=0)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering            = ['-created_at']
        verbose_name        = 'Document'
        verbose_name_plural = 'Documents'
 
    def __str__(self): return f'{self.titre} ({self.type_doc})'

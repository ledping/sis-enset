from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """Utilisateur personnalisé avec rôle et département."""

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur'
        CHEF_DEPT = 'CHEF_DEPT', 'Chef de Département'
        ENSEIGNANT = 'ENSEIGNANT', 'Enseignant'
        ETUDIANT = 'ETUDIANT', 'Étudiant'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ETUDIANT)
    departement = models.CharField(max_length=100, blank=True)
    filiere = models.CharField(max_length=100, blank=True)
    niveau = models.IntegerField(null=True, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to='photos/', null=True, blank=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_enseignant(self):
        return self.role == self.Role.ENSEIGNANT

    @property
    def is_etudiant(self):
        return self.role == self.Role.ETUDIANT

    @property
    def is_chef_dept(self):
        return self.role == self.Role.CHEF_DEPT


class MatriculeEtudiantAutorise(models.Model):
    """Liste blanche des matricules autorisés à créer automatiquement un compte étudiant."""

    matricule = models.CharField(max_length=80, unique=True)
    nom = models.CharField(max_length=120)
    prenom = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    departement = models.CharField(max_length=100, default='Genie Informatique')
    filiere = models.CharField(max_length=100, blank=True)
    niveau = models.IntegerField(null=True, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    consomme = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['matricule']
        verbose_name = 'Matricule étudiant autorisé'
        verbose_name_plural = 'Matricules étudiants autorisés'

    def __str__(self):
        return f'{self.matricule} - {self.nom}'


class ParametresValidation(models.Model):
    """Paramètres du workflow semi-automatique."""

    publication_auto_cours = models.BooleanField(default=True)
    publication_auto_td = models.BooleanField(default=True)
    publication_auto_tp = models.BooleanField(default=True)
    publication_auto_support = models.BooleanField(default=True)
    validation_obligatoire_examens = models.BooleanField(default=True)
    validation_obligatoire_corriges = models.BooleanField(default=True)
    prevalidation_auto_memoires = models.BooleanField(default=True)
    auto_activation_etudiants = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paramètres de validation'
        verbose_name_plural = 'Paramètres de validation'

    def __str__(self):
        return 'Workflow semi-automatique SIS ENSET'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

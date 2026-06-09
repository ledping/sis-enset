from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import MatriculeEtudiantAutorise, ParametresValidation, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'email', 'role', 'filiere', 'niveau', 'actif')
    list_filter = ('role', 'actif', 'filiere', 'niveau')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'filiere')
    fieldsets = UserAdmin.fieldsets + (
        ('Informations ENSET', {'fields': ('role', 'departement', 'filiere', 'niveau', 'telephone', 'photo', 'actif')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations ENSET', {'fields': ('role', 'departement', 'filiere', 'niveau', 'telephone', 'actif')}),
    )


@admin.register(MatriculeEtudiantAutorise)
class MatriculeEtudiantAutoriseAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom', 'prenom', 'filiere', 'niveau', 'consomme')
    list_filter = ('consomme', 'filiere', 'niveau')
    search_fields = ('matricule', 'nom', 'prenom', 'email')


@admin.register(ParametresValidation)
class ParametresValidationAdmin(admin.ModelAdmin):
    list_display = ('id', 'publication_auto_cours', 'publication_auto_td', 'publication_auto_tp', 'prevalidation_auto_memoires', 'auto_activation_etudiants', 'updated_at')

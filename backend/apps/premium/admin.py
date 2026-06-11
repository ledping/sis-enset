from django.contrib import admin
from .models import AchatMemoire, HistoriqueTelechargement, PaiementAcces, ParametresPremium, PlanAcces, PortefeuilleUtilisateur


@admin.register(ParametresPremium)
class ParametresPremiumAdmin(admin.ModelAdmin):
    list_display = ('beneficiaire', 'orange_money_numero', 'mtn_momo_numero', 'updated_at')


@admin.register(PlanAcces)
class PlanAccesAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type_plan', 'prix', 'credits_documents', 'credits_memoires', 'actif', 'ordre')
    list_filter = ('type_plan', 'actif')
    search_fields = ('nom',)


@admin.register(PortefeuilleUtilisateur)
class PortefeuilleUtilisateurAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'telechargements_documents_credits', 'credits_memoires', 'total_depense', 'updated_at')
    search_fields = ('utilisateur__username', 'utilisateur__first_name', 'utilisateur__last_name')


@admin.register(PaiementAcces)
class PaiementAccesAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'plan', 'montant', 'moyen', 'statut', 'created_at', 'date_validation')
    list_filter = ('statut', 'moyen', 'plan')
    search_fields = ('utilisateur__username', 'reference', 'numero_payeur')


@admin.register(AchatMemoire)
class AchatMemoireAdmin(admin.ModelAdmin):
    list_display = ('memoire', 'utilisateur', 'montant_estime', 'part_auteur_estimee', 'created_at')
    search_fields = ('memoire__titre', 'utilisateur__username')


@admin.register(HistoriqueTelechargement)
class HistoriqueTelechargementAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'type_ressource', 'gratuit', 'via_credit', 'created_at')
    list_filter = ('type_ressource', 'gratuit', 'via_credit')
    search_fields = ('utilisateur__username', 'document__titre', 'memoire__titre')

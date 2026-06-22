from django.contrib import admin

from .models import (
    AchatDocument,
    AchatMemoire,
    AuditPremium,
    HistoriqueTelechargement,
    PaiementAcces,
    ParametresPremium,
    PlanAcces,
    PortefeuilleUtilisateur,
    PromotionPremium,
)


@admin.register(ParametresPremium)
class ParametresPremiumAdmin(admin.ModelAdmin):
    list_display = (
        'beneficiaire',
        'orange_money_numero',
        'mtn_momo_numero',
        'quota_documents_gratuits_mensuel',
        'pourcentage_auteur',
        'updated_at',
    )
    readonly_fields = ('updated_at',)


@admin.register(PlanAcces)
class PlanAccesAdmin(admin.ModelAdmin):
    list_display = (
        'nom',
        'type_plan',
        'prix',
        'ancien_prix',
        'credits_documents',
        'credits_memoires',
        'badge',
        'actif',
        'ordre',
    )
    list_filter = ('type_plan', 'actif')
    search_fields = ('nom', 'description', 'badge')
    ordering = ('ordre', 'prix')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PromotionPremium)
class PromotionPremiumAdmin(admin.ModelAdmin):
    list_display = (
        'titre',
        'actif',
        'memoires_gratuits',
        'documents_gratuits',
        'date_debut',
        'date_fin',
        'cree_par',
        'created_at',
    )
    list_filter = ('actif', 'memoires_gratuits', 'documents_gratuits', 'created_at')
    search_fields = ('titre', 'message', 'cree_par__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PortefeuilleUtilisateur)
class PortefeuilleUtilisateurAdmin(admin.ModelAdmin):
    list_display = (
        'utilisateur',
        'telechargements_documents_credits',
        'credits_memoires',
        'total_depense',
        'updated_at',
    )
    search_fields = ('utilisateur__username', 'utilisateur__first_name', 'utilisateur__last_name')
    readonly_fields = ('updated_at',)


@admin.register(PaiementAcces)
class PaiementAccesAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'plan', 'montant', 'moyen', 'statut', 'created_at', 'date_validation')
    list_filter = ('statut', 'moyen', 'plan')
    search_fields = ('utilisateur__username', 'reference', 'numero_payeur')
    readonly_fields = ('created_at', 'date_validation')


@admin.register(AchatDocument)
class AchatDocumentAdmin(admin.ModelAdmin):
    list_display = ('document', 'utilisateur', 'gratuit', 'credit_utilise', 'created_at')
    list_filter = ('gratuit', 'credit_utilise')
    search_fields = ('document__titre', 'utilisateur__username')
    readonly_fields = ('created_at',)


@admin.register(AchatMemoire)
class AchatMemoireAdmin(admin.ModelAdmin):
    list_display = ('memoire', 'utilisateur', 'montant_estime', 'part_auteur_estimee', 'created_at')
    search_fields = ('memoire__titre', 'utilisateur__username')
    readonly_fields = ('created_at',)


@admin.register(HistoriqueTelechargement)
class HistoriqueTelechargementAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'type_ressource', 'gratuit', 'via_credit', 'created_at')
    list_filter = ('type_ressource', 'gratuit', 'via_credit')
    search_fields = ('utilisateur__username', 'document__titre', 'memoire__titre')
    readonly_fields = ('created_at',)


@admin.register(AuditPremium)
class AuditPremiumAdmin(admin.ModelAdmin):
    list_display = ('action', 'acteur', 'utilisateur_cible', 'paiement', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('acteur__username', 'utilisateur_cible__username', 'description')
    readonly_fields = ('action', 'acteur', 'utilisateur_cible', 'paiement', 'description', 'ip_address', 'created_at')

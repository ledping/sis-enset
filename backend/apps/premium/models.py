from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class PlanAcces(models.Model):
    class TypePlan(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Pack documents'
        MEMOIRE = 'MEMOIRE', 'Pack memoires'
        MIXTE = 'MIXTE', 'Pack mixte'

    nom = models.CharField(max_length=120)
    type_plan = models.CharField(max_length=20, choices=TypePlan.choices, default=TypePlan.DOCUMENT)
    description = models.TextField(blank=True)
    prix = models.PositiveIntegerField(help_text='Prix en FCFA')
    ancien_prix = models.PositiveIntegerField(null=True, blank=True, help_text='Prix barré affiché en période promotionnelle')
    credits_documents = models.PositiveIntegerField(default=0, help_text='Nombre de telechargements documents accordes')
    credits_memoires = models.PositiveIntegerField(default=0, help_text='Nombre de telechargements memoires accordes')
    badge = models.CharField(max_length=80, blank=True, help_text='Exemple : Promo, Recommande, Lancement')
    actif = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre', 'prix']
        verbose_name = 'Plan d acces'
        verbose_name_plural = 'Plans d acces'

    def __str__(self):
        return f'{self.nom} - {self.prix} FCFA'


class ParametresPremium(models.Model):
    orange_money_numero = models.CharField(max_length=30, default='696781788')
    mtn_momo_numero = models.CharField(max_length=30, default='680345705')
    beneficiaire = models.CharField(max_length=180, default='Departement ENSET Douala')
    note_paiement = models.TextField(
        blank=True,
        default='Apres paiement, renseignez la reference de transaction et ajoutez une capture ou un recu comme preuve.'
    )
    quota_documents_gratuits_mensuel = models.PositiveIntegerField(default=3)
    pourcentage_auteur = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    message_annonce = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Parametres premium'
        verbose_name_plural = 'Parametres premium'

    def __str__(self):
        return 'Parametres de paiement premium'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PromotionPremium(models.Model):
    titre = models.CharField(max_length=150)
    message = models.TextField()
    date_debut = models.DateTimeField(null=True, blank=True)
    date_fin = models.DateTimeField(null=True, blank=True)
    memoires_gratuits = models.BooleanField(default=False)
    documents_gratuits = models.BooleanField(default=False)
    actif = models.BooleanField(default=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='promotions_premium_creees')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-actif', '-created_at']
        verbose_name = 'Promotion premium'
        verbose_name_plural = 'Promotions premium'

    def __str__(self):
        return self.titre

    def est_active(self):
        now = timezone.now()
        if not self.actif:
            return False
        if self.date_debut and now < self.date_debut:
            return False
        if self.date_fin and now > self.date_fin:
            return False
        return True

    @classmethod
    def active(cls):
        now = timezone.now()
        return cls.objects.filter(actif=True).filter(
            models.Q(date_debut__isnull=True) | models.Q(date_debut__lte=now),
            models.Q(date_fin__isnull=True) | models.Q(date_fin__gte=now),
        ).order_by('-created_at')


class PortefeuilleUtilisateur(models.Model):
    utilisateur = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portefeuille_premium')
    telechargements_documents_credits = models.PositiveIntegerField(default=0)
    credits_memoires = models.PositiveIntegerField(default=0)
    total_depense = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Portefeuille premium'
        verbose_name_plural = 'Portefeuilles premium'

    def __str__(self):
        return f'Portefeuille {self.utilisateur}'

    @classmethod
    def get_for_user(cls, user):
        portefeuille, _ = cls.objects.get_or_create(utilisateur=user)
        return portefeuille


class PaiementAcces(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        VALIDE = 'VALIDE', 'Valide'
        REJETE = 'REJETE', 'Rejete'

    class MoyenPaiement(models.TextChoices):
        MTN = 'MTN_MOMO', 'MTN Mobile Money'
        ORANGE = 'ORANGE_MONEY', 'Orange Money'
        BANQUE = 'BANQUE', 'Depot bancaire'
        CAISSE = 'CAISSE', 'Caisse departementale'
        AUTRE = 'AUTRE', 'Autre'

    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='paiements_premium')
    plan = models.ForeignKey(PlanAcces, on_delete=models.SET_NULL, null=True, related_name='paiements')
    montant = models.PositiveIntegerField()
    moyen = models.CharField(max_length=30, choices=MoyenPaiement.choices)
    numero_payeur = models.CharField(max_length=40, blank=True)
    reference = models.CharField(max_length=120, blank=True)
    preuve = models.FileField(upload_to='premium/preuves/', null=True, blank=True)
    commentaire = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    motif_rejet = models.TextField(blank=True)
    valide_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='paiements_premium_valides')
    date_validation = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Paiement premium'
        verbose_name_plural = 'Paiements premium'

    def __str__(self):
        return f'{self.utilisateur} - {self.montant} FCFA - {self.statut}'

    def valider(self, admin_user):
        if self.statut == self.Statut.VALIDE:
            return
        portefeuille = PortefeuilleUtilisateur.get_for_user(self.utilisateur)
        if self.plan:
            portefeuille.telechargements_documents_credits += self.plan.credits_documents
            portefeuille.credits_memoires += self.plan.credits_memoires
        portefeuille.total_depense += self.montant
        portefeuille.save(update_fields=['telechargements_documents_credits', 'credits_memoires', 'total_depense', 'updated_at'])
        self.statut = self.Statut.VALIDE
        self.valide_par = admin_user
        self.date_validation = timezone.now()
        self.save(update_fields=['statut', 'valide_par', 'date_validation'])

    def rejeter(self, admin_user, motif=''):
        self.statut = self.Statut.REJETE
        self.valide_par = admin_user
        self.date_validation = timezone.now()
        self.motif_rejet = motif
        self.save(update_fields=['statut', 'valide_par', 'date_validation', 'motif_rejet'])


class AchatMemoire(models.Model):
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achats_memoires')
    memoire = models.ForeignKey('memoires.Memoire', on_delete=models.CASCADE, related_name='achats_premium')
    montant_estime = models.PositiveIntegerField(default=500)
    part_auteur_estimee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    pourcentage_auteur = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    credit_utilise = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('utilisateur', 'memoire')]
        ordering = ['-created_at']
        verbose_name = 'Achat de memoire'
        verbose_name_plural = 'Achats de memoires'

    def save(self, *args, **kwargs):
        self.part_auteur_estimee = (Decimal(self.montant_estime) * self.pourcentage_auteur / Decimal('100')).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.memoire} achete par {self.utilisateur}'


class HistoriqueTelechargement(models.Model):
    class TypeRessource(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        MEMOIRE = 'MEMOIRE', 'Memoire'

    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='telechargements_premium')
    type_ressource = models.CharField(max_length=20, choices=TypeRessource.choices)
    document = models.ForeignKey('documents.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='historiques_premium')
    memoire = models.ForeignKey('memoires.Memoire', on_delete=models.SET_NULL, null=True, blank=True, related_name='historiques_premium')
    gratuit = models.BooleanField(default=False)
    via_credit = models.BooleanField(default=False)
    commentaire = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Historique de telechargement'
        verbose_name_plural = 'Historiques de telechargement'

    def __str__(self):
        return f'{self.utilisateur} - {self.type_ressource} - {self.created_at:%Y-%m-%d}'


class AuditPremium(models.Model):
    class TypeAction(models.TextChoices):
        PAIEMENT_CREE = 'PAIEMENT_CREE', 'Paiement cree'
        PAIEMENT_VALIDE = 'PAIEMENT_VALIDE', 'Paiement valide'
        PAIEMENT_REJETE = 'PAIEMENT_REJETE', 'Paiement rejete'
        PARAMETRES_MODIFIES = 'PARAMETRES_MODIFIES', 'Parametres modifies'
        RECU_TELECHARGE = 'RECU_TELECHARGE', 'Recu telecharge'
        EXPORT_PAIEMENTS = 'EXPORT_PAIEMENTS', 'Export paiements'
        CONSULTATION_STATS = 'CONSULTATION_STATS', 'Consultation statistiques'
        PLAN_MODIFIE = 'PLAN_MODIFIE', 'Plan premium modifie'
        PROMOTION_CREEE = 'PROMOTION_CREEE', 'Promotion creee'
        PROMOTION_MODIFIEE = 'PROMOTION_MODIFIEE', 'Promotion modifiee'

    acteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audits_premium_effectues')
    utilisateur_cible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audits_premium_subis')
    paiement = models.ForeignKey(PaiementAcces, on_delete=models.SET_NULL, null=True, blank=True, related_name='audits')
    action = models.CharField(max_length=40, choices=TypeAction.choices)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Audit premium'
        verbose_name_plural = 'Audits premium'

    def __str__(self):
        return f'{self.get_action_display()} - {self.created_at:%Y-%m-%d %H:%M}'


def audit_premium(action, acteur=None, utilisateur_cible=None, paiement=None, description='', ip_address=None):
    return AuditPremium.objects.create(
        action=action,
        acteur=acteur if getattr(acteur, 'is_authenticated', False) else None,
        utilisateur_cible=utilisateur_cible,
        paiement=paiement,
        description=description,
        ip_address=ip_address,
    )

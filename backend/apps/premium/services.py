from dataclasses import dataclass
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from apps.users.models import Utilisateur
from .models import AchatDocument, AchatMemoire, HistoriqueTelechargement, ParametresPremium, PortefeuilleUtilisateur, PromotionPremium

PRIX_MEMOIRE_DEFAUT = 500
POURCENTAGE_AUTEUR_DEFAUT = 30


@dataclass
class PremiumDecision:
    allowed: bool
    reason: str = ''
    code: str = ''
    free_remaining: int = 0


class PremiumAccessDenied(Exception):
    def __init__(self, detail, code='payment_required'):
        self.detail = detail
        self.code = code
        super().__init__(detail)


def is_privileged(user):
    return bool(user and user.is_authenticated and user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT, Utilisateur.Role.ENSEIGNANT])


def active_promotion():
    return PromotionPremium.active().first()


def premium_rules():
    params = ParametresPremium.get_solo()
    promo = active_promotion()
    return {
        'params': params,
        'promotion': promo,
        'quota_documents': params.quota_documents_gratuits_mensuel,
        'documents_gratuits_promo': bool(promo and promo.documents_gratuits),
        'memoires_gratuits_promo': bool(promo and promo.memoires_gratuits),
        'pourcentage_auteur': params.pourcentage_auteur,
    }


def month_bounds(now=None):
    now = now or timezone.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def free_document_downloads_used(user):
    start, end = month_bounds()
    return HistoriqueTelechargement.objects.filter(
        utilisateur=user,
        type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
        gratuit=True,
        commentaire__icontains='Quota gratuit',
        created_at__gte=start,
        created_at__lt=end,
    ).count()


def premium_summary(user):
    wallet = PortefeuilleUtilisateur.get_for_user(user)
    rules = premium_rules()
    used = free_document_downloads_used(user)
    quota = rules['quota_documents']
    remaining = max(quota - used, 0)
    promo = rules['promotion']
    return {
        'documents_gratuits_mois': quota,
        'documents_gratuits_utilises': used,
        'documents_gratuits_restants': remaining,
        'telechargements_documents_credits': wallet.telechargements_documents_credits,
        'credits_memoires': wallet.credits_memoires,
        'total_depense': wallet.total_depense,
        'promotion_active': bool(promo),
        'promotion': {
            'id': promo.id,
            'titre': promo.titre,
            'message': promo.message,
            'memoires_gratuits': promo.memoires_gratuits,
            'documents_gratuits': promo.documents_gratuits,
            'date_fin': promo.date_fin,
        } if promo else None,
        'documents_gratuits_promo': rules['documents_gratuits_promo'],
        'memoires_gratuits_promo': rules['memoires_gratuits_promo'],
    }


def user_has_document_access(user, document):
    if is_privileged(user):
        return True
    if premium_rules()['documents_gratuits_promo']:
        return True
    return AchatDocument.objects.filter(utilisateur=user, document=document).exists()


def user_has_memoire_access(user, memoire):
    if is_privileged(user):
        return True
    if premium_rules()['memoires_gratuits_promo']:
        return True
    return AchatMemoire.objects.filter(utilisateur=user, memoire=memoire).exists()


def can_preview_document_download(user, document):
    if user_has_document_access(user, document):
        return PremiumDecision(True, 'Document deja debloque')
    raise PremiumAccessDenied('Apercu complet verrouille. Utilisez 1 credit pour debloquer la consultation complete et le telechargement.', 'document_unlock_required')


def can_preview_memoire_download(user, memoire):
    if user_has_memoire_access(user, memoire):
        return PremiumDecision(True, 'Memoire deja debloque')
    raise PremiumAccessDenied('Apercu complet verrouille. Utilisez 1 credit memoire pour consulter le fichier complet et le telecharger.', 'memoire_unlock_required')


@transaction.atomic
def grant_document_download(user, document):
    rules = premium_rules()
    promo = rules['promotion']

    if is_privileged(user):
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=True,
            commentaire='Acces institutionnel',
        )
        return PremiumDecision(True, 'Acces institutionnel')

    existing = AchatDocument.objects.filter(utilisateur=user, document=document).first()
    if existing:
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=existing.gratuit,
            via_credit=existing.credit_utilise,
            commentaire='Document deja debloque',
        )
        return PremiumDecision(True, 'Document deja debloque')

    if rules['documents_gratuits_promo']:
        AchatDocument.objects.create(
            utilisateur=user,
            document=document,
            gratuit=True,
            credit_utilise=False,
            commentaire=f'Promotion active : {promo.titre}',
        )
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=True,
            commentaire=f'Promotion active : {promo.titre}',
        )
        return PremiumDecision(True, 'Document gratuit pendant la promotion')

    used = free_document_downloads_used(user)
    quota = rules['quota_documents']
    if used < quota:
        AchatDocument.objects.create(
            utilisateur=user,
            document=document,
            gratuit=True,
            credit_utilise=False,
            commentaire='Quota gratuit mensuel',
        )
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=True,
            commentaire='Quota gratuit mensuel',
        )
        return PremiumDecision(True, 'Quota gratuit mensuel', free_remaining=quota - used - 1)

    wallet = PortefeuilleUtilisateur.get_for_user(user)
    if wallet.telechargements_documents_credits > 0:
        wallet.telechargements_documents_credits -= 1
        wallet.save(update_fields=['telechargements_documents_credits', 'updated_at'])
        AchatDocument.objects.create(
            utilisateur=user,
            document=document,
            gratuit=False,
            credit_utilise=True,
            commentaire='Credit document utilise',
        )
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            via_credit=True,
            commentaire='Credit document utilise - acces complet debloque',
        )
        return PremiumDecision(True, 'Credit document utilise')

    raise PremiumAccessDenied(f'Vous avez atteint votre limite gratuite de {quota} documents ce mois-ci. Achetez un pack document pour debloquer des documents supplementaires.', 'document_credit_required')


def grant_document_access(user, document):
    return grant_document_download(user, document)


def grant_memoire_access(user, memoire):
    return grant_memoire_download(user, memoire)


@transaction.atomic
def grant_memoire_download(user, memoire):
    rules = premium_rules()
    promo = rules['promotion']
    if is_privileged(user):
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.MEMOIRE,
            memoire=memoire,
            gratuit=True,
            commentaire='Acces institutionnel',
        )
        return PremiumDecision(True, 'Acces institutionnel')

    if rules['memoires_gratuits_promo']:
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.MEMOIRE,
            memoire=memoire,
            gratuit=True,
            commentaire=f'Promotion active : {promo.titre}',
        )
        return PremiumDecision(True, 'Memoire gratuit pendant la promotion')

    if AchatMemoire.objects.filter(utilisateur=user, memoire=memoire).exists():
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.MEMOIRE,
            memoire=memoire,
            via_credit=False,
            commentaire='Memoire deja achete',
        )
        return PremiumDecision(True, 'Memoire deja achete')

    wallet = PortefeuilleUtilisateur.get_for_user(user)
    if wallet.credits_memoires > 0:
        wallet.credits_memoires -= 1
        wallet.save(update_fields=['credits_memoires', 'updated_at'])
        AchatMemoire.objects.create(
            utilisateur=user,
            memoire=memoire,
            montant_estime=PRIX_MEMOIRE_DEFAUT,
            pourcentage_auteur=rules['pourcentage_auteur'] or POURCENTAGE_AUTEUR_DEFAUT,
            credit_utilise=True,
        )
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.MEMOIRE,
            memoire=memoire,
            via_credit=True,
            commentaire='Credit memoire utilise',
        )
        return PremiumDecision(True, 'Credit memoire utilise')

    raise PremiumAccessDenied('Le mini-article est consultable gratuitement. Le telechargement du memoire complet necessite 1 credit memoire.', 'memoire_credit_required')


def top_memoires_queryset(limit=10):
    return AchatMemoire.objects.values(
        'memoire_id', 'memoire__titre', 'memoire__auteur_nom', 'memoire__departement', 'memoire__filiere'
    ).annotate(
        achats=Count('id'),
        revenu_estime=Sum('montant_estime'),
        part_auteur_estimee=Sum('part_auteur_estimee'),
    ).order_by('-achats', '-revenu_estime')[:limit]

from dataclasses import dataclass
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from apps.users.models import Utilisateur
from .models import AchatMemoire, HistoriqueTelechargement, PortefeuilleUtilisateur

DOCUMENTS_GRATUITS_MOIS = 3
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
        created_at__gte=start,
        created_at__lt=end,
    ).count()


def premium_summary(user):
    wallet = PortefeuilleUtilisateur.get_for_user(user)
    used = free_document_downloads_used(user)
    remaining = max(DOCUMENTS_GRATUITS_MOIS - used, 0)
    return {
        'documents_gratuits_mois': DOCUMENTS_GRATUITS_MOIS,
        'documents_gratuits_utilises': used,
        'documents_gratuits_restants': remaining,
        'telechargements_documents_credits': wallet.telechargements_documents_credits,
        'credits_memoires': wallet.credits_memoires,
        'total_depense': wallet.total_depense,
    }


@transaction.atomic
def grant_document_download(user, document):
    if is_privileged(user):
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=True,
            commentaire='Acces institutionnel',
        )
        return PremiumDecision(True, 'Acces institutionnel')

    used = free_document_downloads_used(user)
    if used < DOCUMENTS_GRATUITS_MOIS:
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            gratuit=True,
            commentaire='Quota gratuit mensuel',
        )
        return PremiumDecision(True, 'Quota gratuit mensuel', free_remaining=DOCUMENTS_GRATUITS_MOIS - used - 1)

    wallet = PortefeuilleUtilisateur.get_for_user(user)
    if wallet.telechargements_documents_credits > 0:
        wallet.telechargements_documents_credits -= 1
        wallet.save(update_fields=['telechargements_documents_credits', 'updated_at'])
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT,
            document=document,
            via_credit=True,
            commentaire='Credit document utilise',
        )
        return PremiumDecision(True, 'Credit document utilise')

    raise PremiumAccessDenied('Vous avez atteint votre limite gratuite de 3 documents ce mois-ci. Achetez un credit document pour debloquer 5 telechargements supplementaires.', 'document_credit_required')


@transaction.atomic
def grant_memoire_download(user, memoire):
    if is_privileged(user):
        HistoriqueTelechargement.objects.create(
            utilisateur=user,
            type_ressource=HistoriqueTelechargement.TypeRessource.MEMOIRE,
            memoire=memoire,
            gratuit=True,
            commentaire='Acces institutionnel',
        )
        return PremiumDecision(True, 'Acces institutionnel')

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
            pourcentage_auteur=POURCENTAGE_AUTEUR_DEFAUT,
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

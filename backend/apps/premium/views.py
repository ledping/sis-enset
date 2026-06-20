from django.db.models import Count, Sum
from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from openpyxl import Workbook
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification, notifier
from apps.users.models import Utilisateur
from .models import (
    AchatMemoire,
    AuditPremium,
    HistoriqueTelechargement,
    PaiementAcces,
    ParametresPremium,
    PlanAcces,
    PortefeuilleUtilisateur,
    PromotionPremium,
    audit_premium,
)
from .pdf_utils import build_receipt_pdf
from .serializers import (
    AchatMemoireSerializer,
    AuditPremiumSerializer,
    HistoriqueTelechargementSerializer,
    PaiementAccesSerializer,
    ParametresPremiumSerializer,
    PlanAccesSerializer,
    PromotionPremiumSerializer,
)
from .services import active_promotion, premium_summary, top_memoires_queryset


class IsAdminOrChef(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def notify_premium_change(actor, titre, message):
    users = Utilisateur.objects.filter(actif=True, is_active=True).exclude(id=actor.id if actor else None)
    for user in users:
        if user.role == Utilisateur.Role.ENSEIGNANT:
            continue
        notifier(user, titre, message, Notification.TypeNotification.INFO, '/premium')


class PlanListView(generics.ListCreateAPIView):
    serializer_class = PlanAccesSerializer

    def get_queryset(self):
        qs = PlanAcces.objects.all()
        if self.request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            qs = qs.filter(actif=True)
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Creation reservee a l administration.'}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        audit_premium(
            AuditPremium.TypeAction.PLAN_MODIFIE,
            acteur=request.user,
            description=f'Nouveau pack premium cree : {response.data.get("nom")}.',
            ip_address=client_ip(request),
        )
        notify_premium_change(
            request.user,
            'Nouvelle offre premium',
            f'Une nouvelle offre est disponible : {response.data.get("nom")}.',
        )
        return response


class PlanDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminOrChef]
    queryset = PlanAcces.objects.all()
    serializer_class = PlanAccesSerializer

    def perform_update(self, serializer):
        old = self.get_object()
        old_values = {
            'nom': old.nom,
            'prix': old.prix,
            'ancien_prix': old.ancien_prix,
            'credits_documents': old.credits_documents,
            'credits_memoires': old.credits_memoires,
            'actif': old.actif,
        }
        plan = serializer.save()
        audit_premium(
            AuditPremium.TypeAction.PLAN_MODIFIE,
            acteur=self.request.user,
            description=(
                f'Pack modifie : {plan.nom}. Ancien prix {old_values["prix"]} FCFA, '
                f'nouveau prix {plan.prix} FCFA. Credits docs {old_values["credits_documents"]}->{plan.credits_documents}, '
                f'credits memoires {old_values["credits_memoires"]}->{plan.credits_memoires}.'
            ),
            ip_address=client_ip(self.request),
        )
        notify_premium_change(
            self.request.user,
            'Mise a jour des offres premium',
            f'Le pack {plan.nom} a ete mis a jour. Consultez la page Acces premium.',
        )


class PremiumMeView(APIView):
    def get(self, request):
        wallet = PortefeuilleUtilisateur.get_for_user(request.user)
        paiements = PaiementAcces.objects.select_related('plan').filter(utilisateur=request.user)[:8]
        achats = AchatMemoire.objects.select_related('memoire').filter(utilisateur=request.user)[:8]
        history = HistoriqueTelechargement.objects.select_related('document', 'memoire').filter(utilisateur=request.user)[:10]
        return Response({
            'summary': premium_summary(request.user),
            'wallet_id': wallet.id,
            'paiements_recents': PaiementAccesSerializer(paiements, many=True, context={'request': request}).data,
            'memoires_achetes': AchatMemoireSerializer(achats, many=True).data,
            'telechargements_recents': HistoriqueTelechargementSerializer(history, many=True).data,
        })


class ParametresPremiumView(APIView):
    def get(self, request):
        return Response(ParametresPremiumSerializer(ParametresPremium.get_solo()).data)

    def patch(self, request):
        if request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Modification reservee a l administration.'}, status=status.HTTP_403_FORBIDDEN)
        params = ParametresPremium.get_solo()
        serializer = ParametresPremiumSerializer(params, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit_premium(
            AuditPremium.TypeAction.PARAMETRES_MODIFIES,
            acteur=request.user,
            description='Modification des parametres premium : numeros, quota gratuit, part auteur ou annonce.',
            ip_address=client_ip(request),
        )
        notify_premium_change(
            request.user,
            'Parametres premium mis a jour',
            'Les regles d acces premium ou les informations de paiement ont ete modifiees.',
        )
        return Response(serializer.data)


class PromotionPremiumListCreateView(generics.ListCreateAPIView):
    serializer_class = PromotionPremiumSerializer

    def get_queryset(self):
        if self.request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return PromotionPremium.active()
        return PromotionPremium.objects.all().order_by('-actif', '-created_at')

    def create(self, request, *args, **kwargs):
        if request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Creation reservee a l administration.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save(cree_par=request.user)
        audit_premium(
            AuditPremium.TypeAction.PROMOTION_CREEE,
            acteur=request.user,
            description=f'Promotion creee : {promotion.titre}. Memoires gratuits={promotion.memoires_gratuits}; Documents gratuits={promotion.documents_gratuits}.',
            ip_address=client_ip(request),
        )
        notify_premium_change(request.user, 'Nouvelle promotion premium', promotion.message)
        return Response(PromotionPremiumSerializer(promotion).data, status=status.HTTP_201_CREATED)


class PromotionPremiumDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminOrChef]
    queryset = PromotionPremium.objects.all()
    serializer_class = PromotionPremiumSerializer

    def perform_update(self, serializer):
        promo = serializer.save()
        audit_premium(
            AuditPremium.TypeAction.PROMOTION_MODIFIEE,
            acteur=self.request.user,
            description=f'Promotion modifiee : {promo.titre}. Active={promo.actif}.',
            ip_address=client_ip(self.request),
        )
        notify_premium_change(self.request.user, 'Promotion premium mise a jour', promo.message)


class PaiementListCreateView(generics.ListCreateAPIView):
    serializer_class = PaiementAccesSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = PaiementAcces.objects.select_related('utilisateur', 'plan', 'valide_par')
        if user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            statut = self.request.query_params.get('statut')
            return qs.filter(statut=statut) if statut else qs
        return qs.filter(utilisateur=user)

    def perform_create(self, serializer):
        paiement = serializer.save()
        audit_premium(
            AuditPremium.TypeAction.PAIEMENT_CREE,
            acteur=self.request.user,
            utilisateur_cible=self.request.user,
            paiement=paiement,
            description=f'Demande de paiement premium creee pour {paiement.montant} FCFA.',
            ip_address=client_ip(self.request),
        )
        if paiement.montant == 0:
            paiement.valider(None)
            audit_premium(
                AuditPremium.TypeAction.PAIEMENT_VALIDE,
                acteur=None,
                utilisateur_cible=self.request.user,
                paiement=paiement,
                description='Pack gratuit active automatiquement selon la politique premium.',
                ip_address=client_ip(self.request),
            )
            notifier(self.request.user, 'Pack premium gratuit active', 'Vos credits gratuits sont maintenant disponibles.', Notification.TypeNotification.INFO, '/premium')
            return
        admins = Utilisateur.objects.filter(role__in=[Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT], actif=True, is_active=True)
        for admin in admins:
            if admin != self.request.user:
                notifier(admin, 'Paiement premium en attente', f'{self.request.user} a soumis un paiement premium de {paiement.montant} FCFA.', Notification.TypeNotification.INFO, '/premium')


class PaiementDecisionView(APIView):
    permission_classes = [IsAdminOrChef]

    def post(self, request, pk, decision):
        paiement = get_object_or_404(PaiementAcces.objects.select_related('utilisateur', 'plan'), pk=pk)
        if decision == 'valider':
            paiement.valider(request.user)
            audit_premium(
                AuditPremium.TypeAction.PAIEMENT_VALIDE,
                acteur=request.user,
                utilisateur_cible=paiement.utilisateur,
                paiement=paiement,
                description=f'Paiement valide : {paiement.montant} FCFA. Credits accordes.',
                ip_address=client_ip(request),
            )
            notifier(
                paiement.utilisateur,
                'Paiement premium valide',
                f'Votre paiement de {paiement.montant} FCFA a ete valide. Vos credits sont disponibles.',
                Notification.TypeNotification.INFO,
                '/premium',
            )
        elif decision == 'rejeter':
            paiement.rejeter(request.user, request.data.get('motif_rejet', ''))
            audit_premium(
                AuditPremium.TypeAction.PAIEMENT_REJETE,
                acteur=request.user,
                utilisateur_cible=paiement.utilisateur,
                paiement=paiement,
                description=paiement.motif_rejet or 'Paiement premium rejete.',
                ip_address=client_ip(request),
            )
            notifier(
                paiement.utilisateur,
                'Paiement premium rejete',
                paiement.motif_rejet or 'Votre paiement premium a ete rejete. Veuillez verifier la preuve transmise.',
                Notification.TypeNotification.REJET,
                '/premium',
            )
        else:
            return Response({'detail': 'Decision invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaiementAccesSerializer(paiement, context={'request': request}).data)


class PremiumStatsView(APIView):
    permission_classes = [IsAdminOrChef]

    def get(self, request):
        audit_premium(
            AuditPremium.TypeAction.CONSULTATION_STATS,
            acteur=request.user,
            description='Consultation du tableau financier premium.',
            ip_address=client_ip(request),
        )
        paiements_valides = PaiementAcces.objects.filter(statut=PaiementAcces.Statut.VALIDE)
        paiements_attente = PaiementAcces.objects.filter(statut=PaiementAcces.Statut.EN_ATTENTE).count()
        achats = AchatMemoire.objects.all()
        total_collecte = paiements_valides.aggregate(total=Sum('montant'))['total'] or 0
        return Response({
            'total_collecte': total_collecte,
            'paiements_en_attente': paiements_attente,
            'paiements_valides': paiements_valides.count(),
            'paiements_rejetes': PaiementAcces.objects.filter(statut=PaiementAcces.Statut.REJETE).count(),
            'memoires_achetes': achats.count(),
            'part_auteur_estimee': achats.aggregate(total=Sum('part_auteur_estimee'))['total'] or 0,
            'top_memoires': list(top_memoires_queryset(10)),
            'documents_telecharges': HistoriqueTelechargement.objects.filter(type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT).count(),
            'plans_actifs': PlanAcces.objects.filter(actif=True).count(),
            'promotion_active': PromotionPremiumSerializer(active_promotion()).data if active_promotion() else None,
        })


class TopMemoiresView(APIView):
    def get(self, request):
        return Response(list(top_memoires_queryset(10)))


class AuditPremiumListView(generics.ListAPIView):
    permission_classes = [IsAdminOrChef]
    serializer_class = AuditPremiumSerializer

    def get_queryset(self):
        qs = AuditPremium.objects.select_related('acteur', 'utilisateur_cible', 'paiement')
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        return qs[:50]


class PaiementReceiptView(APIView):
    def get(self, request, pk):
        paiement = get_object_or_404(PaiementAcces.objects.select_related('utilisateur', 'plan'), pk=pk)
        is_admin = request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]
        if not is_admin and paiement.utilisateur_id != request.user.id:
            return Response({'detail': 'Recu indisponible pour cet utilisateur.'}, status=status.HTTP_403_FORBIDDEN)
        if paiement.statut != PaiementAcces.Statut.VALIDE:
            return Response({'detail': 'Le recu est disponible uniquement apres validation du paiement.'}, status=status.HTTP_400_BAD_REQUEST)
        pdf_bytes, receipt_no = build_receipt_pdf(paiement, ParametresPremium.get_solo())
        audit_premium(
            AuditPremium.TypeAction.RECU_TELECHARGE,
            acteur=request.user,
            utilisateur_cible=paiement.utilisateur,
            paiement=paiement,
            description=f'Telechargement du recu {receipt_no}.',
            ip_address=client_ip(request),
        )
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{receipt_no}.pdf"'
        return response


class PaiementsExportView(APIView):
    permission_classes = [IsAdminOrChef]

    def get(self, request):
        wb = Workbook()
        ws = wb.active
        ws.title = 'Paiements premium'
        headers = ['ID', 'Utilisateur', 'Pack', 'Montant', 'Moyen', 'Numero payeur', 'Reference', 'Statut', 'Date creation', 'Valide par', 'Date validation']
        ws.append(headers)
        for paiement in PaiementAcces.objects.select_related('utilisateur', 'plan', 'valide_par').all():
            ws.append([
                paiement.id,
                paiement.utilisateur.get_full_name() or paiement.utilisateur.username,
                paiement.plan.nom if paiement.plan else '',
                paiement.montant,
                paiement.get_moyen_display(),
                paiement.numero_payeur,
                paiement.reference,
                paiement.get_statut_display(),
                paiement.created_at.strftime('%d/%m/%Y %H:%M') if paiement.created_at else '',
                paiement.valide_par.get_full_name() or paiement.valide_par.username if paiement.valide_par else '',
                paiement.date_validation.strftime('%d/%m/%Y %H:%M') if paiement.date_validation else '',
            ])
        for column in ws.columns:
            length = max(len(str(cell.value or '')) for cell in column)
            ws.column_dimensions[column[0].column_letter].width = min(max(length + 2, 12), 40)
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="export_paiements_premium.xlsx"'
        wb.save(response)
        audit_premium(
            AuditPremium.TypeAction.EXPORT_PAIEMENTS,
            acteur=request.user,
            description='Export Excel des paiements premium.',
            ip_address=client_ip(request),
        )
        return response


class PremiumPolicyView(APIView):
    def get(self, request):
        params = ParametresPremium.get_solo()
        promo = active_promotion()
        promo_data = PromotionPremiumSerializer(promo).data if promo else None
        return Response({
            'titre': 'Politique d acces premium SIS ENSET',
            'documents': f'Chaque etudiant dispose de {params.quota_documents_gratuits_mensuel} telechargements gratuits de documents par mois. Au-dela, les packs documents donnent droit a des telechargements supplementaires selon les credits configures par l administration.',
            'memoires': 'Les articles, resumes et fiches des memoires restent consultables gratuitement. Le telechargement du PDF complet depend des credits memoires, sauf promotion active ou acces institutionnel.',
            'paiements': 'Les paiements sont semi-automatiques : l utilisateur paie sur un numero officiel, transmet une preuve, puis l administration valide ou rejette la demande.',
            'recu': 'Un recu PDF est disponible apres validation du paiement.',
            'auteurs': f'Les achats de memoires sont historises afin d identifier les productions de forte valeur. La part auteur indicative est actuellement de {params.pourcentage_auteur} %.',
            'responsabilite': 'Ce module ne remplace pas la comptabilite officielle. Il sert a tracer les acces numeriques, les paiements et la valorisation documentaire sous controle administratif.',
            'annonce': params.message_annonce,
            'promotion_active': promo_data,
        })


class AdminPlansSeedView(APIView):
    permission_classes = [IsAdminOrChef]

    def post(self, request):
        defaults = [
            {
                'nom': 'Pack Documents',
                'type_plan': PlanAcces.TypePlan.DOCUMENT,
                'description': '1 credit document donnant droit a 5 telechargements supplementaires.',
                'prix': 500,
                'ancien_prix': None,
                'credits_documents': 5,
                'credits_memoires': 0,
                'badge': 'Standard',
                'ordre': 1,
            },
            {
                'nom': 'Pack Memoire',
                'type_plan': PlanAcces.TypePlan.MEMOIRE,
                'description': '1 credit memoire pour telecharger un memoire complet.',
                'prix': 500,
                'ancien_prix': None,
                'credits_documents': 0,
                'credits_memoires': 1,
                'badge': 'Memoire',
                'ordre': 2,
            },
            {
                'nom': 'Pack Recherche',
                'type_plan': PlanAcces.TypePlan.MIXTE,
                'description': 'Pack avantageux pour recherches academiques : 5 memoires et 10 documents.',
                'prix': 2500,
                'ancien_prix': None,
                'credits_documents': 10,
                'credits_memoires': 5,
                'badge': 'Recommande',
                'ordre': 3,
            },
        ]
        created = 0
        for item in defaults:
            _, was_created = PlanAcces.objects.get_or_create(nom=item['nom'], defaults=item)
            created += 1 if was_created else 0
        return Response({'detail': 'Packs premium initialises.', 'created': created})

from django.db.models import Count, Sum
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.notifications.models import Notification, notifier
from apps.users.models import Utilisateur
from .models import AchatMemoire, HistoriqueTelechargement, PaiementAcces, ParametresPremium, PlanAcces, PortefeuilleUtilisateur
from .serializers import AchatMemoireSerializer, HistoriqueTelechargementSerializer, PaiementAccesSerializer, ParametresPremiumSerializer, PlanAccesSerializer
from .services import premium_summary, top_memoires_queryset


class IsAdminOrChef(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


class PlanListView(generics.ListAPIView):
    serializer_class = PlanAccesSerializer

    def get_queryset(self):
        qs = PlanAcces.objects.all()
        if self.request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            qs = qs.filter(actif=True)
        return qs


class PremiumMeView(APIView):
    def get(self, request):
        wallet = PortefeuilleUtilisateur.get_for_user(request.user)
        paiements = PaiementAcces.objects.filter(utilisateur=request.user)[:5]
        achats = AchatMemoire.objects.select_related('memoire').filter(utilisateur=request.user)[:5]
        history = HistoriqueTelechargement.objects.select_related('document', 'memoire').filter(utilisateur=request.user)[:8]
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
        return Response(serializer.data)

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


class PaiementDecisionView(APIView):
    permission_classes = [IsAdminOrChef]

    def post(self, request, pk, decision):
        paiement = PaiementAcces.objects.select_related('utilisateur', 'plan').get(pk=pk)
        if decision == 'valider':
            paiement.valider(request.user)
            notifier(
                paiement.utilisateur,
                'Paiement premium valide',
                f'Votre paiement de {paiement.montant} FCFA a ete valide. Vos credits sont disponibles.',
                Notification.TypeNotification.INFO,
                '/premium',
            )
        elif decision == 'rejeter':
            paiement.rejeter(request.user, request.data.get('motif_rejet', ''))
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
        paiements_valides = PaiementAcces.objects.filter(statut=PaiementAcces.Statut.VALIDE)
        paiements_attente = PaiementAcces.objects.filter(statut=PaiementAcces.Statut.EN_ATTENTE).count()
        achats = AchatMemoire.objects.all()
        total_collecte = paiements_valides.aggregate(total=Sum('montant'))['total'] or 0
        return Response({
            'total_collecte': total_collecte,
            'paiements_en_attente': paiements_attente,
            'paiements_valides': paiements_valides.count(),
            'memoires_achetes': achats.count(),
            'part_auteur_estimee': achats.aggregate(total=Sum('part_auteur_estimee'))['total'] or 0,
            'top_memoires': list(top_memoires_queryset(10)),
            'documents_telecharges': HistoriqueTelechargement.objects.filter(type_ressource=HistoriqueTelechargement.TypeRessource.DOCUMENT).count(),
        })


class TopMemoiresView(APIView):
    def get(self, request):
        return Response(list(top_memoires_queryset(10)))


class AdminPlansSeedView(APIView):
    permission_classes = [IsAdminOrChef]

    def post(self, request):
        defaults = [
            {
                'nom': 'Pack Documents',
                'type_plan': PlanAcces.TypePlan.DOCUMENT,
                'description': '1 credit document donnant droit a 5 telechargements supplementaires.',
                'prix': 500,
                'credits_documents': 5,
                'credits_memoires': 0,
                'ordre': 1,
            },
            {
                'nom': 'Pack Memoire',
                'type_plan': PlanAcces.TypePlan.MEMOIRE,
                'description': '1 credit memoire pour telecharger un memoire complet.',
                'prix': 500,
                'credits_documents': 0,
                'credits_memoires': 1,
                'ordre': 2,
            },
            {
                'nom': 'Pack Recherche',
                'type_plan': PlanAcces.TypePlan.MIXTE,
                'description': 'Pack avantageux pour recherches academiques : 5 memoires et 10 documents.',
                'prix': 2500,
                'credits_documents': 10,
                'credits_memoires': 5,
                'ordre': 3,
            },
        ]
        created = 0
        for item in defaults:
            _, was_created = PlanAcces.objects.get_or_create(nom=item['nom'], defaults=item)
            created += 1 if was_created else 0
        return Response({'detail': 'Packs premium initialises.', 'created': created})

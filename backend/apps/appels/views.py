from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.notifications.models import Notification, notifier
from apps.users.models import Utilisateur
from .models import AppelInterne, SignalAppel
from .serializers import AppelInterneSerializer, SignalAppelSerializer


def other_participant(appel, user):
    return appel.destinataire if appel.appelant_id == user.id else appel.appelant


class AppelStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        destinataire_id = request.data.get('destinataire')
        type_appel = request.data.get('type_appel', AppelInterne.TypeAppel.AUDIO)
        if type_appel not in AppelInterne.TypeAppel.values:
            return Response({'detail': 'Type appel invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if str(destinataire_id) == str(request.user.id):
            return Response({'detail': 'Vous ne pouvez pas vous appeler vous-même.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            destinataire = Utilisateur.objects.get(id=destinataire_id, actif=True, is_active=True)
        except Utilisateur.DoesNotExist:
            return Response({'detail': 'Destinataire introuvable ou inactif.'}, status=status.HTTP_404_NOT_FOUND)

        appel = AppelInterne.objects.create(appelant=request.user, destinataire=destinataire, type_appel=type_appel)
        SignalAppel.objects.create(
            appel=appel,
            emetteur=request.user,
            destinataire=destinataire,
            type_signal=SignalAppel.TypeSignal.INCOMING,
            payload={'type_appel': type_appel},
        )
        notifier(
            destinataire,
            'Appel entrant',
            f'{request.user.get_full_name() or request.user.username} vous appelle en {type_appel}.',
            Notification.TypeNotification.MESSAGE,
            '/messages',
        )
        return Response(AppelInterneSerializer(appel, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AppelRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action')
        try:
            appel = AppelInterne.objects.select_related('appelant', 'destinataire').get(pk=pk, destinataire=request.user)
        except AppelInterne.DoesNotExist:
            return Response({'detail': 'Appel introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if appel.statut not in [AppelInterne.Statut.SONNERIE, AppelInterne.Statut.ACTIF]:
            return Response({'detail': 'Cet appel n’est plus disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'accept':
            appel.statut = AppelInterne.Statut.ACTIF
            appel.answered_at = timezone.now()
            appel.save(update_fields=['statut', 'answered_at'])
            SignalAppel.objects.create(appel=appel, emetteur=request.user, destinataire=appel.appelant, type_signal=SignalAppel.TypeSignal.ACCEPTED)
            return Response(AppelInterneSerializer(appel, context={'request': request}).data)

        appel.close(AppelInterne.Statut.REFUSE)
        SignalAppel.objects.create(appel=appel, emetteur=request.user, destinataire=appel.appelant, type_signal=SignalAppel.TypeSignal.REFUSED)
        return Response(AppelInterneSerializer(appel, context={'request': request}).data)


class AppelSignalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            appel = AppelInterne.objects.select_related('appelant', 'destinataire').get(
                Q(appelant=request.user) | Q(destinataire=request.user),
                pk=pk,
            )
        except AppelInterne.DoesNotExist:
            return Response({'detail': 'Appel introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        type_signal = request.data.get('type_signal')
        if type_signal not in [SignalAppel.TypeSignal.OFFER, SignalAppel.TypeSignal.ANSWER, SignalAppel.TypeSignal.ICE]:
            return Response({'detail': 'Signal invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        destinataire = other_participant(appel, request.user)
        signal = SignalAppel.objects.create(
            appel=appel,
            emetteur=request.user,
            destinataire=destinataire,
            type_signal=type_signal,
            payload=request.data.get('payload') or {},
        )
        return Response(SignalAppelSerializer(signal, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AppelEndView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            appel = AppelInterne.objects.select_related('appelant', 'destinataire').get(
                Q(appelant=request.user) | Q(destinataire=request.user),
                pk=pk,
            )
        except AppelInterne.DoesNotExist:
            return Response({'detail': 'Appel introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if appel.statut in [AppelInterne.Statut.TERMINE, AppelInterne.Statut.REFUSE, AppelInterne.Statut.ANNULE, AppelInterne.Statut.MANQUE]:
            return Response(AppelInterneSerializer(appel, context={'request': request}).data)
        final_status = AppelInterne.Statut.ANNULE if appel.statut == AppelInterne.Statut.SONNERIE and appel.appelant_id == request.user.id else AppelInterne.Statut.TERMINE
        appel.close(final_status)
        signal_type = SignalAppel.TypeSignal.CANCELLED if final_status == AppelInterne.Statut.ANNULE else SignalAppel.TypeSignal.ENDED
        SignalAppel.objects.create(appel=appel, emetteur=request.user, destinataire=other_participant(appel, request.user), type_signal=signal_type)
        return Response(AppelInterneSerializer(appel, context={'request': request}).data)


class AppelPollView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = SignalAppel.objects.filter(destinataire=request.user, lu=False).select_related(
            'appel', 'appel__appelant', 'appel__destinataire', 'emetteur'
        ).order_by('created_at')[:30]
        signals = list(qs)
        ids = [signal.id for signal in signals]
        if ids:
            SignalAppel.objects.filter(id__in=ids).update(lu=True)
        return Response({'signals': SignalAppelSerializer(signals, many=True, context={'request': request}).data})


class AppelHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = AppelInterne.objects.filter(Q(appelant=request.user) | Q(destinataire=request.user)).select_related('appelant', 'destinataire')[:30]
        return Response(AppelInterneSerializer(qs, many=True, context={'request': request}).data)

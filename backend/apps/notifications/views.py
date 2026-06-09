from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.models import Utilisateur
from .models import Notification, notifier
from .serializers import NotificationBroadcastSerializer, NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        lu = self.request.query_params.get('lu')
        if lu in {'true', 'false'}:
            qs = qs.filter(lu=(lu == 'true'))
        return qs


class NotificationUnreadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'unread': Notification.objects.filter(user=request.user, lu=False).count()})


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            notification = generics.get_object_or_404(Notification, pk=pk, user=request.user)
            notification.lu = True
            notification.save(update_fields=['lu'])
        else:
            Notification.objects.filter(user=request.user, lu=False).update(lu=True)
        return Response({'detail': 'Notification(s) marquee(s) comme lue(s).'})


class NotificationBroadcastView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Action reservee a l’administration.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotificationBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cible = data['cible']
        qs = Utilisateur.objects.filter(actif=True, is_active=True)
        if cible == 'UTILISATEUR':
            qs = qs.filter(pk=data['utilisateur'].pk)
        elif cible == 'ETUDIANTS':
            qs = qs.filter(role=Utilisateur.Role.ETUDIANT)
        elif cible == 'ENSEIGNANTS':
            qs = qs.filter(role=Utilisateur.Role.ENSEIGNANT)
        elif cible == 'CHEF_DEPT':
            qs = qs.filter(role=Utilisateur.Role.CHEF_DEPT)
        elif cible == 'ADMIN':
            qs = qs.filter(role=Utilisateur.Role.ADMIN)

        created = 0
        for user in qs:
            notifier(user, data['titre'], data['message'], Notification.TypeNotification.INFO, data.get('lien', ''))
            created += 1
        return Response({'detail': f'{created} notification(s) envoyee(s).', 'created': created})

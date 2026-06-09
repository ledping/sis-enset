from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.models import Utilisateur
from .models import SessionReseau
from .serializers import SessionReseauSerializer


class IsAdminOrChef(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


class SessionListView(generics.ListAPIView):
    serializer_class = SessionReseauSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SessionReseau.objects.select_related('utilisateur')
        if self.request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            qs = qs.filter(utilisateur=self.request.user)
        statut = self.request.query_params.get('statut')
        if statut == 'ACTIVE':
            qs = qs.filter(fin__isnull=True)
        elif statut == 'FERMEE':
            qs = qs.filter(fin__isnull=False)
        return qs


class SessionOpenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ip = request.data.get('ip_address') or request.META.get('REMOTE_ADDR') or '127.0.0.1'
        mac = request.data.get('mac_address', '')
        session = SessionReseau.objects.create(utilisateur=request.user, ip_address=ip, mac_address=mac, mikrotik_ok=False)
        return Response(SessionReseauSerializer(session, context={'request': request}).data, status=status.HTTP_201_CREATED)


class SessionCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            qs = SessionReseau.objects.filter(pk=pk)
            if request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
                qs = qs.filter(utilisateur=request.user)
        else:
            qs = SessionReseau.objects.filter(utilisateur=request.user, fin__isnull=True)
        count = qs.filter(fin__isnull=True).update(fin=timezone.now())
        return Response({'detail': f'{count} session(s) fermee(s).'})


class SessionSimulationView(APIView):
    permission_classes = [IsAdminOrChef]

    def post(self, request):
        user_id = request.data.get('utilisateur') or request.user.id
        user = Utilisateur.objects.filter(pk=user_id).first() or request.user
        ip = request.data.get('ip_address') or f'192.168.1.{100 + (user.id % 100)}'
        mac = request.data.get('mac_address') or f'AA:BB:CC:DD:EE:{user.id % 100:02d}'
        session = SessionReseau.objects.create(utilisateur=user, ip_address=ip, mac_address=mac, mikrotik_ok=False)
        return Response(SessionReseauSerializer(session, context={'request': request}).data, status=status.HTTP_201_CREATED)

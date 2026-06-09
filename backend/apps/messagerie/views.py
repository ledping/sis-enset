from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.models import Utilisateur
from apps.users.serializers import UtilisateurSerializer
from .models import MessageInterne
from .serializers import MessageCreateSerializer, MessageInterneSerializer


class MessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return MessageCreateSerializer if self.request.method == 'POST' else MessageInterneSerializer

    def get_queryset(self):
        user = self.request.user
        box = self.request.query_params.get('box', 'inbox')
        search = self.request.query_params.get('search')
        if box == 'sent':
            qs = MessageInterne.objects.filter(expediteur=user)
        elif box == 'all':
            qs = MessageInterne.objects.filter(Q(expediteur=user) | Q(destinataire=user))
        else:
            qs = MessageInterne.objects.filter(destinataire=user)
        if search:
            qs = qs.filter(Q(objet__icontains=search) | Q(contenu__icontains=search))
        return qs.select_related('expediteur', 'destinataire')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MessageDetailView(generics.RetrieveAPIView):
    serializer_class = MessageInterneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MessageInterne.objects.filter(Q(expediteur=user) | Q(destinataire=user)).select_related('expediteur', 'destinataire')

    def retrieve(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.destinataire_id == request.user.id and not msg.lu:
            msg.lu = True
            msg.save(update_fields=['lu'])
        return super().retrieve(request, *args, **kwargs)


class MessageUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'unread': MessageInterne.objects.filter(destinataire=request.user, lu=False).count()})


class MessageContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Utilisateur.objects.filter(actif=True, is_active=True).exclude(id=request.user.id).order_by('role', 'last_name', 'first_name')
        return Response(UtilisateurSerializer(qs, many=True, context={'request': request}).data)

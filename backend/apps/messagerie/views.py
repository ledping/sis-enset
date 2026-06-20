from django.db.models import Q, Count, Max, Case, When, IntegerField
from django.utils import timezone
from rest_framework import generics, permissions, parsers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.notifications.models import Notification
from apps.users.models import Utilisateur
from apps.users.serializers import UtilisateurSerializer
from .models import MessageInterne
from .serializers import MessageCreateSerializer, MessageInterneSerializer


def touch_presence(user):
    """Met a jour la derniere activite sans creer une ecriture DB a chaque polling."""
    now = timezone.now()
    last = getattr(user, 'last_login', None)
    if not last or (now - last).total_seconds() >= 60:
        user.last_login = now
        user.save(update_fields=['last_login'])
    return now


class MessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_class(self):
        return MessageCreateSerializer if self.request.method == 'POST' else MessageInterneSerializer

    def get_queryset(self):
        touch_presence(self.request.user)
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
        return qs.select_related('expediteur', 'destinataire').prefetch_related('pieces_jointes').annotate(_pieces_count=Count('pieces_jointes'))

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        touch_presence(request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        read_serializer = MessageInterneSerializer(message, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class MessageDetailView(generics.RetrieveAPIView):
    serializer_class = MessageInterneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        touch_presence(self.request.user)
        user = self.request.user
        return MessageInterne.objects.filter(Q(expediteur=user) | Q(destinataire=user)).select_related('expediteur', 'destinataire').prefetch_related('pieces_jointes')

    def retrieve(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.destinataire_id == request.user.id and not msg.lu:
            msg.lu = True
            msg.save(update_fields=['lu'])
            Notification.objects.filter(user=request.user, type=Notification.TypeNotification.MESSAGE, lu=False).update(lu=True)
        return super().retrieve(request, *args, **kwargs)


class MessageUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        touch_presence(request.user)
        return Response({'unread': MessageInterne.objects.filter(destinataire=request.user, lu=False).count()})


class MessageConversationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, contact_id):
        touch_presence(request.user)
        unread_qs = MessageInterne.objects.filter(
            expediteur_id=contact_id,
            destinataire=request.user,
            lu=False,
        )
        updated_ids = list(unread_qs.values_list('id', flat=True))
        updated = unread_qs.update(lu=True)
        if updated:
            Notification.objects.filter(user=request.user, type=Notification.TypeNotification.MESSAGE, lu=False).update(lu=True)
        remaining = MessageInterne.objects.filter(destinataire=request.user, lu=False).count()
        return Response({'marked_read': updated, 'updated_ids': updated_ids, 'unread': remaining})


class MessageContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        touch_presence(request.user)
        qs = Utilisateur.objects.filter(actif=True, is_active=True).exclude(id=request.user.id).order_by('role', 'last_name', 'first_name', 'username')
        users = list(qs)
        data = UtilisateurSerializer(users, many=True, context={'request': request}).data
        now = timezone.now()

        latest_messages = (
            MessageInterne.objects
            .filter(Q(expediteur=request.user, destinataire__in=users) | Q(destinataire=request.user, expediteur__in=users))
            .annotate(
                contact_id=Case(
                    When(expediteur=request.user, then='destinataire_id'),
                    default='expediteur_id',
                    output_field=IntegerField(),
                )
            )
            .values('contact_id')
            .annotate(last_message_at=Max('created_at'))
        )
        latest_message_by_id = {item['contact_id']: item['last_message_at'] for item in latest_messages}
        user_by_id = {user.id: user for user in users}

        for item in data:
            user_id = item['id']
            user = user_by_id.get(user_id)
            last_login = user.last_login if user else None
            last_message_at = latest_message_by_id.get(user_id)
            # Priorite: derniere connexion reelle, sinon dernier echange avec l'utilisateur, sinon date de creation du compte.
            dernier_acces = last_login or last_message_at or getattr(user, 'date_joined', None)
            item['dernier_acces'] = timezone.localtime(dernier_acces).isoformat() if dernier_acces else ''
            item['en_ligne'] = bool(last_login and (now - last_login).total_seconds() <= 15 * 60)
        return Response(data)

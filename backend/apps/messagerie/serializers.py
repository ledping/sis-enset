from rest_framework import serializers
from apps.users.serializers import UtilisateurSerializer
from .models import MessageInterne
from apps.notifications.models import Notification, notifier


class MessageInterneSerializer(serializers.ModelSerializer):
    expediteur_detail = UtilisateurSerializer(source='expediteur', read_only=True)
    destinataire_detail = UtilisateurSerializer(source='destinataire', read_only=True)
    expediteur = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = MessageInterne
        fields = [
            'id', 'expediteur', 'expediteur_detail', 'destinataire',
            'destinataire_detail', 'objet', 'contenu', 'lu', 'created_at',
        ]
        read_only_fields = ['id', 'lu', 'created_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageInterne
        fields = ['destinataire', 'objet', 'contenu']

    def create(self, validated_data):
        expediteur = self.context['request'].user
        message = MessageInterne.objects.create(expediteur=expediteur, **validated_data)
        notifier(
            message.destinataire,
            'Nouveau message interne',
            f'{expediteur.get_full_name() or expediteur.username} vous a envoye : {message.objet}',
            Notification.TypeNotification.MESSAGE,
            '/messages',
        )
        return message

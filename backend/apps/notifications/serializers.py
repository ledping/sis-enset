from rest_framework import serializers
from apps.users.models import Utilisateur
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'titre', 'message', 'type', 'lien', 'lu', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationBroadcastSerializer(serializers.Serializer):
    cible = serializers.ChoiceField(choices=['TOUS', 'ETUDIANTS', 'ENSEIGNANTS', 'CHEF_DEPT', 'ADMIN', 'UTILISATEUR'])
    utilisateur = serializers.PrimaryKeyRelatedField(queryset=Utilisateur.objects.all(), required=False, allow_null=True)
    titre = serializers.CharField(max_length=180)
    message = serializers.CharField()
    lien = serializers.CharField(max_length=220, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['cible'] == 'UTILISATEUR' and not attrs.get('utilisateur'):
            raise serializers.ValidationError({'utilisateur': 'Choisissez un utilisateur cible.'})
        return attrs

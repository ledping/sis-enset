from rest_framework import serializers
from apps.users.serializers import UtilisateurSerializer
from .models import AppelInterne, SignalAppel


class AppelInterneSerializer(serializers.ModelSerializer):
    appelant_detail = UtilisateurSerializer(source='appelant', read_only=True)
    destinataire_detail = UtilisateurSerializer(source='destinataire', read_only=True)

    class Meta:
        model = AppelInterne
        fields = [
            'id', 'appelant', 'appelant_detail', 'destinataire', 'destinataire_detail',
            'type_appel', 'statut', 'started_at', 'answered_at', 'ended_at', 'duree_secondes',
        ]
        read_only_fields = fields


class SignalAppelSerializer(serializers.ModelSerializer):
    appel_detail = AppelInterneSerializer(source='appel', read_only=True)
    emetteur_detail = UtilisateurSerializer(source='emetteur', read_only=True)

    class Meta:
        model = SignalAppel
        fields = ['id', 'appel', 'appel_detail', 'emetteur', 'emetteur_detail', 'type_signal', 'payload', 'created_at']
        read_only_fields = fields

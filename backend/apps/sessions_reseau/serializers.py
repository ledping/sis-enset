from rest_framework import serializers
from apps.users.serializers import UtilisateurSerializer
from .models import SessionReseau


class SessionReseauSerializer(serializers.ModelSerializer):
    utilisateur_detail = UtilisateurSerializer(source='utilisateur', read_only=True)
    duree = serializers.CharField(source='duree_str', read_only=True)
    statut = serializers.SerializerMethodField()

    class Meta:
        model = SessionReseau
        fields = ['id', 'utilisateur', 'utilisateur_detail', 'ip_address', 'mac_address', 'debut', 'fin', 'duree', 'mikrotik_ok', 'statut']
        read_only_fields = ['id', 'utilisateur', 'debut', 'fin', 'duree', 'statut']

    def get_statut(self, obj):
        return 'ACTIVE' if obj.fin is None else 'FERMEE'

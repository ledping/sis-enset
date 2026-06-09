from rest_framework import serializers
from .models import Document
from apps.users.serializers import UtilisateurSerializer
 
 
class DocumentSerializer(serializers.ModelSerializer):
    auteur_detail = UtilisateurSerializer(source='auteur', read_only=True)
    auteur        = serializers.HiddenField(default=serializers.CurrentUserDefault())
 
    class Meta:
        model  = Document
        fields = ['id','titre','description','type_doc','fichier','auteur',
                  'auteur_detail','departement','filiere','niveau',
                  'annee_academique','statut','nb_telechargements',
                  'nb_consultations','created_at']
        read_only_fields = ['id','statut','nb_telechargements',
                             'nb_consultations','created_at']

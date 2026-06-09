from rest_framework import serializers
from .models import Memoire


class MemoireSerializer(serializers.ModelSerializer):
    depose_par_nom = serializers.SerializerMethodField()
    depose_par = serializers.HiddenField(default=serializers.CurrentUserDefault())
    est_complet_pour_prevalidation = serializers.BooleanField(read_only=True)

    class Meta:
        model = Memoire
        fields = [
            'id', 'titre', 'auteur_nom', 'encadreur', 'departement', 'filiere',
            'niveau', 'annee_academique', 'resume', 'mots_cles', 'fichier_pdf',
            'statut', 'depose_par', 'depose_par_nom', 'commentaire_validation',
            'nb_telechargements', 'created_at', 'est_complet_pour_prevalidation',
        ]
        read_only_fields = ['id', 'statut', 'nb_telechargements', 'created_at', 'est_complet_pour_prevalidation']

    def get_depose_par_nom(self, obj):
        return obj.depose_par.get_full_name() if obj.depose_par else ''

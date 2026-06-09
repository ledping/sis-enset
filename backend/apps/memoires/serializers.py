import json
from rest_framework import serializers
from .models import Memoire
from apps.users.serializers import UtilisateurSerializer


class MemoireSerializer(serializers.ModelSerializer):
    depose_par_nom = serializers.SerializerMethodField()
    depose_par_id = serializers.IntegerField(source='depose_par.id', read_only=True)
    depose_par_detail = UtilisateurSerializer(source='depose_par', read_only=True)
    depose_par = serializers.HiddenField(default=serializers.CurrentUserDefault())
    photo_auteur_url = serializers.SerializerMethodField()
    images_resultats_urls = serializers.SerializerMethodField()

    class Meta:
        model = Memoire
        fields = [
            'id', 'titre', 'auteur_nom', 'auteur_email', 'auteur_telephone',
            'photo_auteur', 'photo_auteur_url', 'encadreur', 'departement', 'filiere',
            'option', 'niveau', 'annee_academique', 'resume', 'introduction',
            'problematique', 'materiels_methodes', 'materiels_outils',
            'resultats_discussion', 'mots_cles', 'fichier_pdf', 'support_presentation',
            'resume_pdf', 'resume_html', 'image_resultat_1', 'image_resultat_2',
            'image_resultat_3', 'image_resultat_4', 'images_resultats_urls',
            'video_demo', 'video_presentation', 'statut', 'depose_par', 'depose_par_id', 'depose_par_detail', 'depose_par_nom',
            'commentaire_validation', 'nb_telechargements', 'nb_consultations',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'statut', 'nb_telechargements', 'nb_consultations',
            'created_at', 'updated_at', 'photo_auteur_url', 'images_resultats_urls', 'depose_par_id', 'depose_par_detail',
        ]

    def get_depose_par_nom(self, obj):
        return obj.depose_par.get_full_name() or obj.depose_par.username if obj.depose_par else ''

    def _absolute(self, file_field):
        request = self.context.get('request')
        if not file_field:
            return ''
        url = file_field.url
        return request.build_absolute_uri(url) if request else url

    def get_photo_auteur_url(self, obj):
        return self._absolute(obj.photo_auteur)

    def get_images_resultats_urls(self, obj):
        images = [obj.image_resultat_1, obj.image_resultat_2, obj.image_resultat_3, obj.image_resultat_4]
        return [self._absolute(image) for image in images if image]

    def validate_materiels_outils(self, value):
        if value in ('', None):
            return []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError('Le tableau des matériels/outils doit être un JSON valide.') from exc
        if not isinstance(value, list):
            raise serializers.ValidationError('Le tableau des matériels/outils doit être une liste.')
        cleaned = []
        for item in value[:20]:
            if not isinstance(item, dict):
                continue
            nom = str(item.get('nom', '')).strip()
            description = str(item.get('description', '')).strip()
            categorie = str(item.get('categorie', '')).strip()
            version = str(item.get('version', '')).strip()
            if nom or description or categorie or version:
                cleaned.append({
                    'categorie': categorie,
                    'nom': nom,
                    'version': version,
                    'description': description,
                })
        return cleaned

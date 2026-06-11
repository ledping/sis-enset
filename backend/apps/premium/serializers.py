from rest_framework import serializers
from .models import AchatMemoire, AuditPremium, HistoriqueTelechargement, PaiementAcces, ParametresPremium, PlanAcces, PortefeuilleUtilisateur


class PlanAccesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanAcces
        fields = ['id', 'nom', 'type_plan', 'description', 'prix', 'credits_documents', 'credits_memoires', 'actif', 'ordre']


class ParametresPremiumSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresPremium
        fields = ['id', 'orange_money_numero', 'mtn_momo_numero', 'beneficiaire', 'note_paiement', 'updated_at']
        read_only_fields = ['id', 'updated_at']


class PortefeuilleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortefeuilleUtilisateur
        fields = ['telechargements_documents_credits', 'credits_memoires', 'total_depense', 'updated_at']


class PaiementAccesSerializer(serializers.ModelSerializer):
    plan_detail = PlanAccesSerializer(source='plan', read_only=True)
    utilisateur_nom = serializers.SerializerMethodField()
    preuve_url = serializers.SerializerMethodField()
    recu_url = serializers.SerializerMethodField()

    class Meta:
        model = PaiementAcces
        fields = [
            'id', 'utilisateur', 'utilisateur_nom', 'plan', 'plan_detail', 'montant', 'moyen',
            'numero_payeur', 'reference', 'preuve', 'preuve_url', 'recu_url', 'commentaire', 'statut',
            'motif_rejet', 'valide_par', 'date_validation', 'created_at',
        ]
        read_only_fields = ['id', 'utilisateur', 'statut', 'motif_rejet', 'valide_par', 'date_validation', 'created_at', 'preuve_url', 'recu_url']

    def get_utilisateur_nom(self, obj):
        return obj.utilisateur.get_full_name() or obj.utilisateur.username

    def get_preuve_url(self, obj):
        request = self.context.get('request')
        if not obj.preuve:
            return ''
        return request.build_absolute_uri(obj.preuve.url) if request else obj.preuve.url


    def get_recu_url(self, obj):
        request = self.context.get('request')
        if obj.statut != PaiementAcces.Statut.VALIDE:
            return ''
        path = f'/api/premium/paiements/{obj.id}/recu/'
        return request.build_absolute_uri(path) if request else path

    def validate(self, attrs):
        plan = attrs.get('plan')
        if not plan or not plan.actif:
            raise serializers.ValidationError('Pack premium invalide ou inactif.')
        attrs['montant'] = plan.prix
        return attrs

    def create(self, validated_data):
        validated_data['utilisateur'] = self.context['request'].user
        return super().create(validated_data)


class AchatMemoireSerializer(serializers.ModelSerializer):
    memoire_titre = serializers.CharField(source='memoire.titre', read_only=True)
    auteur_nom = serializers.CharField(source='memoire.auteur_nom', read_only=True)

    class Meta:
        model = AchatMemoire
        fields = ['id', 'memoire', 'memoire_titre', 'auteur_nom', 'montant_estime', 'part_auteur_estimee', 'pourcentage_auteur', 'created_at']


class HistoriqueTelechargementSerializer(serializers.ModelSerializer):
    titre = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueTelechargement
        fields = ['id', 'type_ressource', 'titre', 'gratuit', 'via_credit', 'commentaire', 'created_at']

    def get_titre(self, obj):
        if obj.document:
            return obj.document.titre
        if obj.memoire:
            return obj.memoire.titre
        return 'Ressource supprimée'



class AuditPremiumSerializer(serializers.ModelSerializer):
    acteur_nom = serializers.SerializerMethodField()
    utilisateur_cible_nom = serializers.SerializerMethodField()

    class Meta:
        model = AuditPremium
        fields = ['id', 'action', 'acteur_nom', 'utilisateur_cible_nom', 'paiement', 'description', 'ip_address', 'created_at']

    def get_acteur_nom(self, obj):
        if not obj.acteur:
            return 'Systeme'
        return obj.acteur.get_full_name() or obj.acteur.username

    def get_utilisateur_cible_nom(self, obj):
        if not obj.utilisateur_cible:
            return ''
        return obj.utilisateur_cible.get_full_name() or obj.utilisateur_cible.username

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import MatriculeEtudiantAutorise, ParametresValidation, Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'first_name', 'last_name', 'nom_complet', 'email',
            'role', 'departement', 'filiere', 'niveau', 'telephone', 'photo',
            'photo_url', 'actif', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'photo_url', 'nom_complet']

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if not obj.photo:
            return ''
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=True)

    class Meta:
        model = Utilisateur
        fields = [
            'username', 'password', 'first_name', 'last_name', 'email', 'role',
            'departement', 'filiere', 'niveau', 'telephone', 'photo', 'actif',
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur(**validated_data)
        user.set_password(password)
        user.is_active = validated_data.get('actif', True)
        user.save()
        return user


class UtilisateurAdminUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = [
            'username', 'password', 'first_name', 'last_name', 'email', 'role',
            'departement', 'filiere', 'niveau', 'telephone', 'photo', 'actif',
        ]

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_active = instance.actif
        if password:
            validate_password(password, instance)
            instance.set_password(password)
        instance.save()
        return instance


class ProfilUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['first_name', 'last_name', 'email', 'departement', 'filiere', 'niveau', 'telephone', 'photo']


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Ancien mot de passe incorrect.')
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value


class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UtilisateurSerializer(self.user, context=self.context).data
        return data


class MatriculeEtudiantAutoriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatriculeEtudiantAutorise
        fields = [
            'id', 'matricule', 'nom', 'prenom', 'email', 'departement', 'filiere',
            'niveau', 'telephone', 'consomme', 'created_at',
        ]
        read_only_fields = ['id', 'consomme', 'created_at']


class ParametresValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresValidation
        fields = [
            'publication_auto_cours', 'publication_auto_td', 'publication_auto_tp',
            'publication_auto_support', 'validation_obligatoire_examens',
            'validation_obligatoire_corriges', 'prevalidation_auto_memoires',
            'auto_activation_etudiants', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class InscriptionEtudiantSerializer(serializers.Serializer):
    matricule = serializers.CharField(max_length=80)
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)
    telephone = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate(self, attrs):
        matricule = attrs['matricule'].strip()
        try:
            autorisation = MatriculeEtudiantAutorise.objects.get(matricule__iexact=matricule)
        except MatriculeEtudiantAutorise.DoesNotExist as exc:
            raise serializers.ValidationError({'matricule': 'Matricule non reconnu. Contactez le département.'}) from exc

        if autorisation.consomme or Utilisateur.objects.filter(username__iexact=matricule).exists():
            raise serializers.ValidationError({'matricule': 'Un compte existe déjà pour ce matricule.'})

        if not ParametresValidation.get_solo().auto_activation_etudiants:
            raise serializers.ValidationError({'detail': 'Auto-inscription temporairement désactivée par l’administration.'})

        validate_password(attrs['password'])
        attrs['autorisation'] = autorisation
        attrs['matricule'] = autorisation.matricule
        return attrs

    def create(self, validated_data):
        autorisation = validated_data['autorisation']
        user = Utilisateur(
            username=autorisation.matricule,
            first_name=autorisation.prenom,
            last_name=autorisation.nom,
            email=validated_data.get('email') or autorisation.email,
            role=Utilisateur.Role.ETUDIANT,
            departement=autorisation.departement,
            filiere=autorisation.filiere,
            niveau=autorisation.niveau,
            telephone=validated_data.get('telephone') or autorisation.telephone,
            actif=True,
            is_active=True,
        )
        user.set_password(validated_data['password'])
        user.save()
        autorisation.consomme = True
        autorisation.save(update_fields=['consomme'])
        return user

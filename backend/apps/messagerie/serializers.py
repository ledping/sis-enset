from pathlib import Path

from rest_framework import serializers
from apps.users.serializers import UtilisateurSerializer
from .models import MessageInterne, PieceJointeMessage
from apps.notifications.models import Notification, notifier


ALLOWED_ATTACHMENT_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.zip', '.rar', '.7z',
    '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.mp4',
}
BLOCKED_ATTACHMENT_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.msi', '.js', '.vbs', '.ps1', '.sh', '.php', '.jar', '.scr', '.dll',
}
MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024
MAX_ATTACHMENTS_PER_MESSAGE = 5


class PieceJointeMessageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()

    class Meta:
        model = PieceJointeMessage
        fields = [
            'id', 'url', 'nom_original', 'type_fichier', 'taille',
            'est_vocal', 'extension', 'created_at',
        ]
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.fichier:
            return None
        request = self.context.get('request')
        url = obj.fichier.url
        return request.build_absolute_uri(url) if request else url

    def get_extension(self, obj):
        return Path(obj.nom_original or '').suffix.lower()


class MessageInterneSerializer(serializers.ModelSerializer):
    expediteur_detail = UtilisateurSerializer(source='expediteur', read_only=True)
    destinataire_detail = UtilisateurSerializer(source='destinataire', read_only=True)
    expediteur = serializers.HiddenField(default=serializers.CurrentUserDefault())
    pieces_jointes = PieceJointeMessageSerializer(many=True, read_only=True)
    nombre_pieces_jointes = serializers.IntegerField(source='pieces_jointes.count', read_only=True)

    class Meta:
        model = MessageInterne
        fields = [
            'id', 'expediteur', 'expediteur_detail', 'destinataire',
            'destinataire_detail', 'objet', 'contenu', 'lu', 'created_at',
            'pieces_jointes', 'nombre_pieces_jointes',
        ]
        read_only_fields = ['id', 'lu', 'created_at', 'pieces_jointes', 'nombre_pieces_jointes']


class MessageCreateSerializer(serializers.ModelSerializer):
    contenu = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = MessageInterne
        fields = ['destinataire', 'objet', 'contenu']

    def _uploaded_files(self):
        request = self.context.get('request')
        if not request:
            return []
        files = []
        for field_name in ['pieces_jointes', 'vocaux', 'documents', 'images', 'audios', 'archives']:
            files.extend(request.FILES.getlist(field_name))
        return files

    def validate(self, attrs):
        fichiers = self._uploaded_files()
        contenu = (attrs.get('contenu') or '').strip()
        if not contenu and not fichiers:
            raise serializers.ValidationError('Veuillez saisir un message, joindre un fichier ou enregistrer un vocal.')
        if len(fichiers) > MAX_ATTACHMENTS_PER_MESSAGE:
            raise serializers.ValidationError(f'Vous pouvez joindre au maximum {MAX_ATTACHMENTS_PER_MESSAGE} fichier(s) par message.')
        for fichier in fichiers:
            extension = Path(fichier.name or '').suffix.lower()
            if extension in BLOCKED_ATTACHMENT_EXTENSIONS or extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
                raise serializers.ValidationError(f'Extension non autorisee pour le fichier : {fichier.name}')
            if fichier.size > MAX_ATTACHMENT_SIZE:
                raise serializers.ValidationError(f'Le fichier {fichier.name} depasse la limite de 20 Mo.')
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        expediteur = request.user
        message = MessageInterne.objects.create(expediteur=expediteur, **validated_data)

        regular_files = []
        for field_name in ['pieces_jointes', 'documents', 'images', 'archives']:
            regular_files.extend(request.FILES.getlist(field_name))
        audio_files = []
        for field_name in ['vocaux', 'audios']:
            audio_files.extend(request.FILES.getlist(field_name))

        for fichier in regular_files:
            PieceJointeMessage.objects.create(
                message=message,
                fichier=fichier,
                nom_original=fichier.name,
                type_fichier=getattr(fichier, 'content_type', '') or '',
                taille=fichier.size,
                est_vocal=False,
            )

        for vocal in audio_files:
            PieceJointeMessage.objects.create(
                message=message,
                fichier=vocal,
                nom_original=vocal.name,
                type_fichier=getattr(vocal, 'content_type', '') or '',
                taille=vocal.size,
                est_vocal=True,
            )

        total = len(regular_files) + len(audio_files)
        if total:
            suffixe = f' avec {total} piece(s) jointe(s)'
        else:
            suffixe = ''
        notifier(
            message.destinataire,
            'Nouveau message interne',
            f'{expediteur.get_full_name() or expediteur.username} vous a envoye : {message.objet}{suffixe}',
            Notification.TypeNotification.MESSAGE,
            '/messages',
        )
        return message

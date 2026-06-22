from django.db.models import Q
import mimetypes
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Document
from .serializers import DocumentSerializer
from apps.journal.models import JournalActivite, log
from apps.users.models import ParametresValidation, Utilisateur
from apps.notifications.models import Notification, notifier
from apps.premium.services import PremiumAccessDenied, can_preview_document_download, grant_document_access, grant_document_download, premium_summary


class CanValidateDocument(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


class CanManageDocument(permissions.BasePermission):
    """Admin/Chef ou auteur du document peuvent modifier/supprimer la publication."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return True
        return obj.auteur_id == request.user.id


def document_status_by_policy(user, type_doc):
    """Publication semi-automatique des documents selon le rôle et le type."""
    if user.role == Utilisateur.Role.ADMIN:
        return Document.Statut.VALIDE

    params = ParametresValidation.get_solo()
    automatic_types = set()
    if params.publication_auto_cours:
        automatic_types.add(Document.TypeDocument.COURS)
    if params.publication_auto_td:
        automatic_types.add(Document.TypeDocument.TD)
    if params.publication_auto_tp:
        automatic_types.add(Document.TypeDocument.TP)
    if params.publication_auto_support:
        automatic_types.add(Document.TypeDocument.SUPPORT)

    if user.role == Utilisateur.Role.ENSEIGNANT and type_doc in automatic_types:
        return Document.Statut.VALIDE

    return Document.Statut.EN_ATTENTE


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'description', 'departement', 'filiere', 'auteur__first_name', 'auteur__last_name', 'auteur__username']
    ordering_fields = ['created_at', 'titre', 'nb_telechargements']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Document.objects.select_related('auteur')
        type_doc = self.request.query_params.get('type')
        niveau = self.request.query_params.get('niveau')
        filiere = self.request.query_params.get('filiere')
        annee = self.request.query_params.get('annee')
        statut = self.request.query_params.get('statut')

        if type_doc:
            qs = qs.filter(type_doc=type_doc)
        if niveau:
            qs = qs.filter(niveau=niveau)
        if filiere:
            qs = qs.filter(filiere__iexact=filiere)
        if annee:
            qs = qs.filter(annee_academique=annee)

        user = self.request.user
        is_validator = user.is_authenticated and user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]
        if statut:
            qs = qs.filter(statut=statut)
        elif not is_validator:
            qs = qs.filter(Q(statut=Document.Statut.VALIDE) | Q(auteur=user))
        else:
            qs = qs.filter(statut=Document.Statut.VALIDE)
        return qs

    def perform_create(self, serializer):
        incoming_type = self.request.data.get('type_doc') or Document.TypeDocument.COURS
        statut = document_status_by_policy(self.request.user, incoming_type)
        doc = serializer.save(statut=statut)
        suffix = 'publie automatiquement' if statut == Document.Statut.VALIDE else 'soumis pour validation'
        log(self.request.user, JournalActivite.TypeAction.DEPOT, f'Depot {suffix} : {doc.titre}', self.request.META.get('REMOTE_ADDR'))
        if statut == Document.Statut.EN_ATTENTE:
            validators = Utilisateur.objects.filter(role__in=[Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT], actif=True, is_active=True)
            for validator in validators:
                if validator != self.request.user:
                    notifier(validator, 'Document en attente', f'Un document attend validation : {doc.titre}', Notification.TypeNotification.VALIDATION, '/validations')


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Document.objects.select_related('auteur')
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), CanManageDocument()]
        return [permissions.IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        doc = self.get_object()
        doc.nb_consultations += 1
        doc.save(update_fields=['nb_consultations'])
        log(request.user, JournalActivite.TypeAction.CONSULTATION, f'Consultation : {doc.titre}', request.META.get('REMOTE_ADDR'))
        return super().retrieve(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        doc = self.get_object()
        titre = doc.titre
        if doc.fichier:
            doc.fichier.delete(save=False)
        response = super().destroy(request, *args, **kwargs)
        log(request.user, JournalActivite.TypeAction.SUPPRESSION, f'Suppression definitive document : {titre}', request.META.get('REMOTE_ADDR'))
        return response


class DocumentValidationView(APIView):
    permission_classes = [CanValidateDocument]

    def post(self, request, pk, decision):
        doc = get_object_or_404(Document, pk=pk)
        if decision == 'valider':
            doc.statut = Document.Statut.VALIDE
            action = 'Validation document'
        elif decision == 'rejeter':
            doc.statut = Document.Statut.REJETE
            action = 'Rejet document'
        else:
            return Response({'detail': 'Decision invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        doc.save(update_fields=['statut', 'updated_at'])
        log(request.user, JournalActivite.TypeAction.VALIDATION, f'{action} : {doc.titre}', request.META.get('REMOTE_ADDR'))
        notif_type = Notification.TypeNotification.VALIDATION if decision == 'valider' else Notification.TypeNotification.REJET
        notifier(doc.auteur, action, f'Votre document « {doc.titre} » a ete {doc.get_statut_display().lower()}.', notif_type, '/documents')
        return Response(DocumentSerializer(doc, context={'request': request}).data)


class DocumentUnlockView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        if doc.statut != Document.Statut.VALIDE and request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Document non valide.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            decision = grant_document_access(request.user, doc)
        except PremiumAccessDenied as exc:
            return Response({
                'detail': exc.detail,
                'code': exc.code,
                'redirect': '/premium',
            }, status=402)
        log(request.user, JournalActivite.TypeAction.CONSULTATION, f'Deblocage document premium : {doc.titre}', request.META.get('REMOTE_ADDR'))
        return Response({
            'detail': decision.reason or 'Document debloque.',
            'unlocked': True,
            'summary': premium_summary(request.user),
        })


class DocumentPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        if doc.statut != Document.Statut.VALIDE and request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Document non valide.'}, status=status.HTTP_403_FORBIDDEN)
        if not doc.fichier:
            return Response({'detail': 'Fichier introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            can_preview_document_download(request.user, doc)
        except PremiumAccessDenied as exc:
            return Response({
                'detail': exc.detail,
                'code': exc.code,
                'redirect': '/premium',
            }, status=402)

        filename = doc.fichier.name.split('/')[-1]
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        log(request.user, JournalActivite.TypeAction.CONSULTATION, f'Apercu avant telechargement : {doc.titre}', request.META.get('REMOTE_ADDR'))
        return FileResponse(doc.fichier.open('rb'), as_attachment=False, filename=filename, content_type=content_type)


class DocumentDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        if doc.statut != Document.Statut.VALIDE and request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Document non valide.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            grant_document_download(request.user, doc)
        except PremiumAccessDenied as exc:
            return Response({
                'detail': exc.detail,
                'code': exc.code,
                'redirect': '/premium',
            }, status=402)

        doc.nb_telechargements += 1
        doc.save(update_fields=['nb_telechargements'])
        log(request.user, JournalActivite.TypeAction.TELECHARGEMENT, f'Telechargement : {doc.titre}', request.META.get('REMOTE_ADDR'))
        return FileResponse(doc.fichier.open(), as_attachment=True, filename=doc.fichier.name.split('/')[-1])

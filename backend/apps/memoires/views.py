from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Memoire
from .serializers import MemoireSerializer
from apps.journal.models import JournalActivite, log
from apps.users.models import ParametresValidation, Utilisateur
from apps.notifications.models import Notification, notifier
from apps.premium.services import PremiumAccessDenied, grant_memoire_download


class CanValidateMemoire(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


class CanManageMemoire(permissions.BasePermission):
    """Admin/Chef ou déposant peuvent modifier/supprimer définitivement un mémoire."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return True
        return obj.depose_par_id == request.user.id


class MemoireListCreateView(generics.ListCreateAPIView):
    serializer_class = MemoireSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'auteur_nom', 'encadreur', 'mots_cles', 'filiere', 'option']
    ordering = ['-annee_academique']

    def get_queryset(self):
        qs = Memoire.objects.select_related('depose_par')
        niveau = self.request.query_params.get('niveau')
        filiere = self.request.query_params.get('filiere')
        annee = self.request.query_params.get('annee')
        statut = self.request.query_params.get('statut')
        if niveau:
            qs = qs.filter(niveau=niveau)
        if filiere:
            qs = qs.filter(filiere__iexact=filiere)
        if annee:
            qs = qs.filter(annee_academique=annee)
        user = self.request.user
        is_validator = user.is_authenticated and user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]
        if statut:
            if ',' in statut:
                qs = qs.filter(statut__in=[item.strip() for item in statut.split(',') if item.strip()])
            else:
                qs = qs.filter(statut=statut)
        elif not is_validator:
            qs = qs.filter(Q(statut=Memoire.Statut.VALIDE) | Q(depose_par=user))
        else:
            qs = qs.filter(statut=Memoire.Statut.VALIDE)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role == Utilisateur.Role.ETUDIANT:
            raise PermissionDenied('Le dépôt de mémoire est réservé aux enseignants, chefs de département et administrateurs.')
        memoire = serializer.save(statut=Memoire.Statut.SOUMIS)
        params = ParametresValidation.get_solo()
        if params.prevalidation_auto_memoires and memoire.est_complet_pour_prevalidation:
            memoire.statut = Memoire.Statut.PREVALIDE
            memoire.commentaire_validation = 'Prévalidation automatique : métadonnées et fichier principal présents.'
            memoire.save(update_fields=['statut', 'commentaire_validation'])
            suffix = 'prevalide automatiquement'
        else:
            suffix = 'soumis pour verification'
        log(self.request.user, JournalActivite.TypeAction.DEPOT, f'Memoire {suffix} : {memoire.titre}', self.request.META.get('REMOTE_ADDR'))
        validators = Utilisateur.objects.filter(role__in=[Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT], actif=True, is_active=True)
        for validator in validators:
            if validator != self.request.user:
                notifier(validator, 'Mémoire à contrôler', f'Un mémoire a été {suffix} : {memoire.titre}', Notification.TypeNotification.VALIDATION, '/validations')


class MemoireDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Memoire.objects.select_related('depose_par')
    serializer_class = MemoireSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), CanManageMemoire()]
        return [permissions.IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        memoire = self.get_object()
        memoire.nb_consultations += 1
        memoire.save(update_fields=['nb_consultations'])
        log(request.user, JournalActivite.TypeAction.CONSULTATION, f'Consultation memoire : {memoire.titre}', request.META.get('REMOTE_ADDR'))
        return super().retrieve(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        memoire = self.get_object()
        titre = memoire.titre
        file_fields = [
            'photo_auteur', 'fichier_pdf', 'support_presentation', 'resume_pdf', 'resume_html',
            'image_resultat_1', 'image_resultat_2', 'image_resultat_3', 'image_resultat_4',
            'video_demo', 'video_presentation',
        ]
        for field_name in file_fields:
            field = getattr(memoire, field_name, None)
            if field:
                field.delete(save=False)
        response = super().destroy(request, *args, **kwargs)
        log(request.user, JournalActivite.TypeAction.SUPPRESSION, f'Suppression definitive memoire : {titre}', request.META.get('REMOTE_ADDR'))
        return response


class MemoireValidationView(APIView):
    permission_classes = [CanValidateMemoire]

    def post(self, request, pk, decision):
        memoire = get_object_or_404(Memoire, pk=pk)
        commentaire = request.data.get('commentaire_validation') or request.data.get('commentaire') or ''
        if decision == 'valider':
            memoire.statut = Memoire.Statut.VALIDE
            action = 'Validation memoire'
        elif decision == 'rejeter':
            memoire.statut = Memoire.Statut.REJETE
            action = 'Rejet memoire'
        else:
            return Response({'detail': 'Decision invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        memoire.commentaire_validation = commentaire
        memoire.save(update_fields=['statut', 'commentaire_validation'])
        log(request.user, JournalActivite.TypeAction.VALIDATION, f'{action} : {memoire.titre}', request.META.get('REMOTE_ADDR'))
        notif_type = Notification.TypeNotification.VALIDATION if decision == 'valider' else Notification.TypeNotification.REJET
        if memoire.depose_par:
            notifier(memoire.depose_par, action, f'Votre mémoire « {memoire.titre} » a été {memoire.get_statut_display().lower()}.', notif_type, '/memoires')
        return Response(MemoireSerializer(memoire, context={'request': request}).data)


class MemoireDownloadView(APIView):
    def get(self, request, pk):
        memoire = get_object_or_404(Memoire, pk=pk)
        if memoire.statut != Memoire.Statut.VALIDE and request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Memoire non archive.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            grant_memoire_download(request.user, memoire)
        except PremiumAccessDenied as exc:
            return Response({
                'detail': exc.detail,
                'code': exc.code,
                'redirect': '/premium',
            }, status=402)

        memoire.nb_telechargements += 1
        memoire.save(update_fields=['nb_telechargements'])
        log(request.user, JournalActivite.TypeAction.TELECHARGEMENT, f'Telechargement memoire : {memoire.titre}', request.META.get('REMOTE_ADDR'))
        return FileResponse(memoire.fichier_pdf.open(), as_attachment=True, filename=memoire.fichier_pdf.name.split('/')[-1])

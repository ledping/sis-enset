from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Memoire
from .serializers import MemoireSerializer
from apps.journal.models import JournalActivite, log
from apps.users.models import ParametresValidation, Utilisateur


class CanValidateMemoire(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT])


class MemoireListCreateView(generics.ListCreateAPIView):
    serializer_class = MemoireSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'auteur_nom', 'encadreur', 'mots_cles', 'filiere']
    ordering = ['-annee_academique']

    def get_queryset(self):
        qs = Memoire.objects.select_related('depose_par')
        niveau = self.request.query_params.get('niveau')
        annee = self.request.query_params.get('annee')
        statut = self.request.query_params.get('statut')
        if niveau:
            qs = qs.filter(niveau=niveau)
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


class MemoireDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Memoire.objects.select_related('depose_par')
    serializer_class = MemoireSerializer
    parser_classes = [MultiPartParser, FormParser]


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
        return Response(MemoireSerializer(memoire, context={'request': request}).data)


class MemoireDownloadView(APIView):
    def get(self, request, pk):
        memoire = get_object_or_404(Memoire, pk=pk)
        if memoire.statut != Memoire.Statut.VALIDE and request.user.role not in [Utilisateur.Role.ADMIN, Utilisateur.Role.CHEF_DEPT]:
            return Response({'detail': 'Memoire non archive.'}, status=status.HTTP_403_FORBIDDEN)
        memoire.nb_telechargements += 1
        memoire.save(update_fields=['nb_telechargements'])
        log(request.user, JournalActivite.TypeAction.TELECHARGEMENT, f'Telechargement memoire : {memoire.titre}', request.META.get('REMOTE_ADDR'))
        return FileResponse(memoire.fichier_pdf.open(), as_attachment=True, filename=memoire.fichier_pdf.name.split('/')[-1])

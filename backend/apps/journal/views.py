from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.documents.models import Document
from apps.memoires.models import Memoire
from apps.sessions_reseau.models import SessionReseau
from apps.users.models import Utilisateur


class DashboardView(APIView):
    def get(self, request):
        role_counts = dict(Utilisateur.objects.values_list('role').annotate(total=Count('id')))
        return Response({
            'total_utilisateurs': Utilisateur.objects.count(),
            'total_etudiants': role_counts.get('ETUDIANT', 0),
            'total_enseignants': role_counts.get('ENSEIGNANT', 0),
            'total_documents': Document.objects.filter(statut='VALIDE').count(),
            'documents_en_attente': Document.objects.filter(statut='EN_ATTENTE').count(),
            'total_memoires': Memoire.objects.filter(statut='VALIDE').count(),
            'memoires_en_attente': Memoire.objects.filter(statut='SOUMIS').count(),
            'total_telechargements': (Document.objects.aggregate(t=Sum('nb_telechargements'))['t'] or 0) + (Memoire.objects.aggregate(t=Sum('nb_telechargements'))['t'] or 0),
            'sessions_actives': SessionReseau.objects.filter(fin__isnull=True).count(),
            'top_documents': list(Document.objects.filter(statut='VALIDE').order_by('-nb_telechargements')[:5].values('id', 'titre', 'nb_telechargements', 'type_doc')),
            'top_memoires': list(Memoire.objects.filter(statut='VALIDE').order_by('-nb_telechargements')[:5].values('id', 'titre', 'nb_telechargements', 'annee_academique')),
        })

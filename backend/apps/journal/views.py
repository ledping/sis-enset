from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.documents.models import Document
from apps.journal.models import JournalActivite
from apps.memoires.models import Memoire
from apps.sessions_reseau.models import SessionReseau
from apps.users.models import Utilisateur


def _choice_label(choices, value):
    return dict(choices).get(value, value or 'Non renseigne')


class DashboardView(APIView):
    def get(self, request):
        role_counts = dict(Utilisateur.objects.values_list('role').annotate(total=Count('id')))
        doc_type_counts = dict(Document.objects.values_list('type_doc').annotate(total=Count('id')))
        memoire_level_counts = dict(Memoire.objects.values_list('niveau').annotate(total=Count('id')))
        document_downloads = Document.objects.aggregate(t=Sum('nb_telechargements'))['t'] or 0
        memoire_downloads = Memoire.objects.aggregate(t=Sum('nb_telechargements'))['t'] or 0

        recent_activities = []
        for item in JournalActivite.objects.select_related('utilisateur').order_by('-timestamp')[:8]:
            utilisateur = ''
            if item.utilisateur:
                utilisateur = item.utilisateur.get_full_name() or item.utilisateur.username
            recent_activities.append({
                'id': item.id,
                'action': item.action,
                'action_label': item.get_action_display(),
                'description': item.description,
                'utilisateur': utilisateur,
                'timestamp': item.timestamp,
            })

        return Response({
            'total_utilisateurs': Utilisateur.objects.count(),
            'total_etudiants': role_counts.get('ETUDIANT', 0),
            'total_enseignants': role_counts.get('ENSEIGNANT', 0),
            'total_admins': role_counts.get('ADMIN', 0) + role_counts.get('CHEF_DEPT', 0),
            'total_documents': Document.objects.filter(statut='VALIDE').count(),
            'documents_en_attente': Document.objects.filter(statut='EN_ATTENTE').count(),
            'documents_rejetes': Document.objects.filter(statut='REJETE').count(),
            'total_memoires': Memoire.objects.filter(statut='VALIDE').count(),
            'memoires_en_attente': Memoire.objects.filter(statut__in=['SOUMIS', 'PREVALIDE']).count(),
            'memoires_prevalides': Memoire.objects.filter(statut='PREVALIDE').count(),
            'memoires_rejetes': Memoire.objects.filter(statut='REJETE').count(),
            'total_telechargements': document_downloads + memoire_downloads,
            'telechargements_documents': document_downloads,
            'telechargements_memoires': memoire_downloads,
            'sessions_actives': SessionReseau.objects.filter(fin__isnull=True).count(),
            'top_documents': list(
                Document.objects.filter(statut='VALIDE')
                .order_by('-nb_telechargements')[:6]
                .values('id', 'titre', 'nb_telechargements', 'type_doc')
            ),
            'top_memoires': list(
                Memoire.objects.filter(statut='VALIDE')
                .order_by('-nb_telechargements')[:6]
                .values('id', 'titre', 'auteur_nom', 'nb_telechargements', 'annee_academique')
            ),
            'role_distribution': [
                {'label': _choice_label(Utilisateur.Role.choices, key), 'value': value, 'key': key}
                for key, value in role_counts.items()
            ],
            'documents_by_type': [
                {'label': _choice_label(Document.TypeDocument.choices, key), 'value': value, 'key': key}
                for key, value in doc_type_counts.items()
            ],
            'memoires_by_niveau': [
                {'label': _choice_label(Memoire.Niveau.choices, key), 'value': value, 'key': key}
                for key, value in memoire_level_counts.items()
            ],
            'validation_summary': [
                {'label': 'Documents en attente', 'value': Document.objects.filter(statut='EN_ATTENTE').count(), 'to': '/validations'},
                {'label': 'Memoires soumis/prevalides', 'value': Memoire.objects.filter(statut__in=['SOUMIS', 'PREVALIDE']).count(), 'to': '/validations'},
                {'label': 'Sessions actives', 'value': SessionReseau.objects.filter(fin__isnull=True).count(), 'to': '/sessions'},
            ],
            'recent_activities': recent_activities,
            'latest_documents': list(
                Document.objects.order_by('-created_at')[:5]
                .values('id', 'titre', 'type_doc', 'statut', 'created_at')
            ),
            'latest_memoires': list(
                Memoire.objects.order_by('-created_at')[:5]
                .values('id', 'titre', 'auteur_nom', 'statut', 'created_at')
            ),
        })

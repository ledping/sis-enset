from django.urls import path
from .views import DocumentDetailView, DocumentDownloadView, DocumentListCreateView, DocumentPreviewView, DocumentUnlockView, DocumentValidationView

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='documents'),
    path('<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<int:pk>/unlock/', DocumentUnlockView.as_view(), name='document-unlock'),
    path('<int:pk>/preview/', DocumentPreviewView.as_view(), name='document-preview'),
    path('<int:pk>/dl/', DocumentDownloadView.as_view(), name='document-download'),
    path('<int:pk>/<str:decision>/', DocumentValidationView.as_view(), name='document-validation'),
]

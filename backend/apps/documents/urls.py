from django.urls import path
from .views import DocumentDetailView, DocumentDownloadView, DocumentListCreateView, DocumentValidationView

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='documents'),
    path('<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<int:pk>/dl/', DocumentDownloadView.as_view(), name='document-download'),
    path('<int:pk>/<str:decision>/', DocumentValidationView.as_view(), name='document-validation'),
]

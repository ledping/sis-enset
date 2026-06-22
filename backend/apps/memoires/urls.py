from django.urls import path
from .views import MemoireDetailView, MemoireDownloadView, MemoireListCreateView, MemoirePreviewView, MemoireUnlockView, MemoireValidationView

urlpatterns = [
    path('', MemoireListCreateView.as_view(), name='memoires'),
    path('<int:pk>/', MemoireDetailView.as_view(), name='memoire-detail'),
    path('<int:pk>/unlock/', MemoireUnlockView.as_view(), name='memoire-unlock'),
    path('<int:pk>/preview/', MemoirePreviewView.as_view(), name='memoire-preview'),
    path('<int:pk>/dl/', MemoireDownloadView.as_view(), name='memoire-download'),
    path('<int:pk>/<str:decision>/', MemoireValidationView.as_view(), name='memoire-validation'),
]

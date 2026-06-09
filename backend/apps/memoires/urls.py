from django.urls import path
from .views import MemoireDetailView, MemoireDownloadView, MemoireListCreateView, MemoireValidationView

urlpatterns = [
    path('', MemoireListCreateView.as_view(), name='memoires'),
    path('<int:pk>/', MemoireDetailView.as_view(), name='memoire-detail'),
    path('<int:pk>/dl/', MemoireDownloadView.as_view(), name='memoire-download'),
    path('<int:pk>/<str:decision>/', MemoireValidationView.as_view(), name='memoire-validation'),
]

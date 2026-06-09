from django.urls import path
from .views import SessionCloseView, SessionListView, SessionOpenView, SessionSimulationView

urlpatterns = [
    path('', SessionListView.as_view(), name='sessions'),
    path('open/', SessionOpenView.as_view(), name='session-open'),
    path('close/', SessionCloseView.as_view(), name='session-close-current'),
    path('simulate/', SessionSimulationView.as_view(), name='session-simulate'),
    path('<int:pk>/close/', SessionCloseView.as_view(), name='session-close'),
]

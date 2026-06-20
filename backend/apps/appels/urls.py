from django.urls import path
from .views import AppelEndView, AppelHistoryView, AppelPollView, AppelRespondView, AppelSignalView, AppelStartView

urlpatterns = [
    path('start/', AppelStartView.as_view(), name='appel-start'),
    path('poll/', AppelPollView.as_view(), name='appel-poll'),
    path('history/', AppelHistoryView.as_view(), name='appel-history'),
    path('<int:pk>/respond/', AppelRespondView.as_view(), name='appel-respond'),
    path('<int:pk>/signal/', AppelSignalView.as_view(), name='appel-signal'),
    path('<int:pk>/end/', AppelEndView.as_view(), name='appel-end'),
]

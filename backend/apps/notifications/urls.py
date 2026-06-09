from django.urls import path
from .views import NotificationBroadcastView, NotificationListView, NotificationReadView, NotificationUnreadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),
    path('unread/', NotificationUnreadView.as_view(), name='notifications-unread'),
    path('broadcast/', NotificationBroadcastView.as_view(), name='notifications-broadcast'),
    path('read-all/', NotificationReadView.as_view(), name='notifications-read-all'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
]

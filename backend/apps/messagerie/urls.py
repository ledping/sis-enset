from django.urls import path
from .views import MessageContactsView, MessageDetailView, MessageListCreateView, MessageUnreadCountView

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='messages'),
    path('contacts/', MessageContactsView.as_view(), name='message-contacts'),
    path('unread/', MessageUnreadCountView.as_view(), name='message-unread'),
    path('<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]

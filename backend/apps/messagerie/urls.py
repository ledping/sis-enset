from django.urls import path
from .views import MessageContactsView, MessageConversationReadView, MessageDetailView, MessageListCreateView, MessageUnreadCountView

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='messages'),
    path('contacts/', MessageContactsView.as_view(), name='message-contacts'),
    path('unread/', MessageUnreadCountView.as_view(), name='message-unread'),
    path('conversations/<int:contact_id>/read/', MessageConversationReadView.as_view(), name='message-conversation-read'),
    path('<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]

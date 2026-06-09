from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ChangePasswordView,
    ImportMatriculesView,
    InscriptionEtudiantView,
    LoginView,
    MatriculesAutorisesView,
    MeView,
    ParametresValidationView,
    ProfileView,
    UtilisateurDetailView,
    UtilisateurListCreateView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('register/student/', InscriptionEtudiantView.as_view(), name='register-student'),
    path('me/', MeView.as_view(), name='me'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('password/', ChangePasswordView.as_view(), name='change-password'),
    path('users/', UtilisateurListCreateView.as_view(), name='users'),
    path('users/<int:pk>/', UtilisateurDetailView.as_view(), name='user-detail'),
    path('validation-settings/', ParametresValidationView.as_view(), name='validation-settings'),
    path('matricules/', MatriculesAutorisesView.as_view(), name='matricules'),
    path('matricules/import/', ImportMatriculesView.as_view(), name='matricules-import'),
]

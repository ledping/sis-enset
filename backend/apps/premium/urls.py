from django.urls import path
from .views import AdminPlansSeedView, PaiementDecisionView, PaiementListCreateView, ParametresPremiumView, PlanListView, PremiumMeView, PremiumStatsView, TopMemoiresView

urlpatterns = [
    path('me/', PremiumMeView.as_view(), name='premium-me'),
    path('plans/', PlanListView.as_view(), name='premium-plans'),
    path('parametres/', ParametresPremiumView.as_view(), name='premium-parametres'),
    path('plans/seed/', AdminPlansSeedView.as_view(), name='premium-seed-plans'),
    path('paiements/', PaiementListCreateView.as_view(), name='premium-paiements'),
    path('paiements/<int:pk>/<str:decision>/', PaiementDecisionView.as_view(), name='premium-paiement-decision'),
    path('stats/', PremiumStatsView.as_view(), name='premium-stats'),
    path('top-memoires/', TopMemoiresView.as_view(), name='premium-top-memoires'),
]

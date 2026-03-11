from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me, name='me'),

    # Offer / Free Tier
    path('offer/', views.get_active_offer, name='get_active_offer'),

    # AI Optimize
    path('optimize/', views.optimize_resume, name='optimize_resume'),
]

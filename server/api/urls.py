from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me, name='me'),
    path('auth/delete-account/', views.delete_account, name='delete_account'),

    # Downloads & ATS tracking
    path('track-download/', views.track_download, name='track_download'),
    path('track-ats/', views.track_ats, name='track_ats'),

    path('upgrade/', views.upgrade_plan, name='upgrade_plan'),

    # Offer / Free Tier
    path('offer/', views.get_active_offer, name='get_active_offer'),

    # AI Optimize
    path('optimize/', views.optimize_resume, name='optimize_resume'),

    # AI Parse Resume
    path('parse-resume/', views.parse_resume, name='parse_resume'),

    # Promo Code
    path('apply-promo/', views.apply_promo_code, name='apply_promo'),
]

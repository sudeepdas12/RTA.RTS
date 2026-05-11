"""
URL Configuration for RTA/RTS Project
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views import login_view
from config.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    
    # JWT Authentication
    # Use project's custom login endpoint (returns JWT tokens)
    path('api/auth/login/', login_view, name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App URLs
    path('api/companies/', include('apps.companies.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/payables/', include('apps.payables.urls')),
    path('api/reconciliation/', include('apps.reconciliation.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/settings/', include('apps.settings.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

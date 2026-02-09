from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FiscalYearSettingsViewSet

router = DefaultRouter()
router.register(r'fiscal-years', FiscalYearSettingsViewSet, basename='fiscal-year-settings')

urlpatterns = [
    path('', include(router.urls)),
]

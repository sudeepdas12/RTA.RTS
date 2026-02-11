from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterestPayableViewSet, DividendPayableViewSet

router = DefaultRouter()
router.register(r'interest', InterestPayableViewSet, basename='interest')
router.register(r'dividend', DividendPayableViewSet, basename='dividend')

urlpatterns = [
    path('', include(router.urls)),
]

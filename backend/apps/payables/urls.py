from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterestPayableViewSet, DividendPayableViewSet, DebentureReconciliationViewSet

router = DefaultRouter()
router.register(r'interest', InterestPayableViewSet, basename='interest')
router.register(r'dividend', DividendPayableViewSet, basename='dividend')
router.register(r'debenture', DebentureReconciliationViewSet, basename='debenture')

urlpatterns = [
    path('', include(router.urls)),
]

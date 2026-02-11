from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BankStatementViewSet, BankTransactionViewSet, ReconciliationViewSet

router = DefaultRouter()
router.register(r'bank-statements', BankStatementViewSet, basename='bank-statement')
router.register(r'bank-transactions', BankTransactionViewSet, basename='bank-transaction')
router.register(r'', ReconciliationViewSet, basename='reconciliation')

urlpatterns = [
    path('', include(router.urls)),
]

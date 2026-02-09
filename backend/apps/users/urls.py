from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RoleViewSet, login_view, logout_view, PendingUserChangeViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'', UserViewSet, basename='user')
router.register(r'pending-changes', PendingUserChangeViewSet, basename='pendingchanges')

urlpatterns = [
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('', include(router.urls)),
]

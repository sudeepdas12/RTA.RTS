from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RoleViewSet, login_view, logout_view, PendingUserChangeViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'pending-changes', PendingUserChangeViewSet, basename='pendingchanges')
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('', include(router.urls)),
]

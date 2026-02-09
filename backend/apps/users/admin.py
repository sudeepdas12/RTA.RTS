from django.contrib import admin
from .models import User, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('role_name', 'description', 'created_at')
    search_fields = ('role_name',)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'full_name', 'role', 'status', 'last_login', 'created_at')
    list_filter = ('status', 'role')
    search_fields = ('username', 'full_name', 'email')
    readonly_fields = ('created_at', 'updated_at', 'last_login')

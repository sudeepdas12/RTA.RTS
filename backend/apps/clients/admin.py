from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('client_code', 'full_name', 'holder_type', 'status', 'created_at')
    list_filter = ('holder_type', 'status')
    search_fields = ('client_code', 'full_name', 'pan_or_citizenship')
    readonly_fields = ('created_at', 'updated_at')

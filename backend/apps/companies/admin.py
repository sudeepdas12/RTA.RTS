from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('company_code', 'company_name', 'sector_type', 'interest_tax_status', 'status', 'created_at')
    list_filter = ('sector_type', 'interest_tax_status', 'status')
    search_fields = ('company_code', 'company_name', 'pan_no')
    readonly_fields = ('created_at', 'updated_at')

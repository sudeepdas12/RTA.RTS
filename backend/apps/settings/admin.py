from django.contrib import admin
from .models import FiscalYearSettings


@admin.register(FiscalYearSettings)
class FiscalYearSettingsAdmin(admin.ModelAdmin):
    list_display = ['company', 'fiscal_year', 'interest_rate', 'tax_rate', 'is_active', 'updated_at']
    list_filter = ['is_active', 'company', 'fiscal_year']
    search_fields = ['fiscal_year', 'company__company_name']
    readonly_fields = ['created_at', 'updated_at']

from django.contrib import admin
from .models import InterestPayable, DividendPayable


@admin.register(InterestPayable)
class InterestPayableAdmin(admin.ModelAdmin):
    list_display = ('interest_id', 'company', 'client', 'gross_interest', 'net_payable', 'due_date', 'payment_status')
    list_filter = ('payment_status', 'due_date')
    search_fields = ('company__company_name', 'client__full_name', 'instrument_ref')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DividendPayable)
class DividendPayableAdmin(admin.ModelAdmin):
    list_display = ('dividend_id', 'company', 'client', 'shares_held', 'net_payable', 'payment_status')
    list_filter = ('payment_status', 'fiscal_year')
    search_fields = ('company__company_name', 'client__full_name')
    readonly_fields = ('created_at', 'updated_at')

from rest_framework import serializers
from .models import FiscalYearSettings
from apps.companies.serializers import CompanySerializer


class FiscalYearSettingsSerializer(serializers.ModelSerializer):
    company_detail = CompanySerializer(source='company', read_only=True)
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    
    class Meta:
        model = FiscalYearSettings
        fields = ['id', 'company', 'company_detail', 'company_name', 'fiscal_year', 'interest_rate', 'tax_rate', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

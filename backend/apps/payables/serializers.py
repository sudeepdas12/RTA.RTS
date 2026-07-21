from rest_framework import serializers
from .models import InterestPayable, DividendPayable, DebentureReconciliation
from apps.companies.serializers import CompanySerializer
from apps.clients.serializers import ClientSerializer


class InterestPayableSerializer(serializers.ModelSerializer):
    """Serializer for Interest Payable"""
    
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_code = serializers.CharField(source='company.company_code', read_only=True)
    company_sector = serializers.CharField(source='company.sector_type', read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_code = serializers.CharField(source='client.client_code', read_only=True)
    fiscal_year = serializers.SerializerMethodField()
    
    class Meta:
        model = InterestPayable
        fields = '__all__'
        read_only_fields = ('interest_id', 'created_by', 'created_at', 'updated_at')
    
    def validate(self, data):
        """Validate interest payable data"""
        gross = data.get('gross_interest', 0)
        tax = data.get('tax_amount', 0)
        net = data.get('net_payable', 0)
        
        # Check if net = gross - tax
        if abs((gross - tax) - net) > 0.01:
            raise serializers.ValidationError(
                "Net payable must equal gross interest minus tax amount"
            )
        
        return data

    def get_fiscal_year(self, obj):
        if not obj.due_date:
            return None
        if obj.due_date.month >= 7:
            return f"{obj.due_date.year}/{obj.due_date.year + 1}"
        return f"{obj.due_date.year - 1}/{obj.due_date.year}"


class DividendPayableSerializer(serializers.ModelSerializer):
    """Serializer for Dividend Payable"""
    
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_code = serializers.CharField(source='company.company_code', read_only=True)
    company_sector = serializers.CharField(source='company.sector_type', read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_code = serializers.CharField(source='client.client_code', read_only=True)
    holder_type = serializers.CharField(source='client.holder_type', read_only=True)
    
    class Meta:
        model = DividendPayable
        fields = '__all__'
        read_only_fields = ('dividend_id', 'created_by', 'created_at', 'updated_at')
    
    def validate(self, data):
        """Validate dividend payable data"""
        gross = data.get('gross_dividend', 0) or 0
        tax = data.get('tax_amount', 0) or 0
        net = data.get('net_payable', 0) or 0
        
        # Check if net = gross - tax
        if abs((gross - tax) - net) > 0.01:
            raise serializers.ValidationError(
                "Net payable must equal gross dividend minus tax amount"
            )
        
        return data


class DebentureReconciliationSerializer(serializers.ModelSerializer):
    """Serializer for Debenture Reconciliation"""
    sector_type_display = serializers.CharField(source='get_sector_type_display', read_only=True)
    tax_status_display = serializers.CharField(source='get_tax_status_display', read_only=True)
    
    class Meta:
        model = DebentureReconciliation
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by', 'upload_batch')
    

class DebentureUploadSerializer(serializers.Serializer):
    """Serializer for debenture Excel/CSV upload"""
    file = serializers.FileField()
    company_code = serializers.CharField(required=True)
    company_name = serializers.CharField(required=False, default="")
    report_title = serializers.CharField(required=False, default="")
    report_subtitle = serializers.CharField(required=False, default="")
    sector_type = serializers.ChoiceField(choices=DebentureReconciliation.SECTOR_CHOICES, default='Public', required=False)
    tax_status = serializers.ChoiceField(choices=DebentureReconciliation.TAX_STATUS_CHOICES, default='Taxable', required=False)
    period_from = serializers.DateField(required=False)
    period_to = serializers.DateField(required=False)
    period_days = serializers.IntegerField(required=False, default=0)
    interest_rate = serializers.DecimalField(required=False, max_digits=5, decimal_places=2, default=8.75)
    tax_rate = serializers.DecimalField(required=False, max_digits=5, decimal_places=2, default=6.00)

    def validate_company_code(self, value):
        """Auto-fetch company name if not provided"""
        return value

    def validate(self, data):
        """Auto-fill company_name from database if not provided"""
        if not data.get('company_name'):
            from apps.companies.models import Company
            try:
                company = Company.objects.get(company_code=data['company_code'])
                data['company_name'] = company.company_name
            except Company.DoesNotExist:
                data['company_name'] = data['company_code']
        return data

    def validate_file(self, value):
        if not value.name.endswith(('.xlsx', '.csv')):
            raise serializers.ValidationError("Only Excel (.xlsx) or CSV files are allowed")
        return value


class PayableUploadSerializer(serializers.Serializer):
    """Serializer for bulk payable upload"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file type"""
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel (.xlsx, .xls) or CSV files are allowed")
        return value

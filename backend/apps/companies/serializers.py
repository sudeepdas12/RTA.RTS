from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""
    
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ('company_id', 'created_at', 'updated_at')
    
    def validate_company_code(self, value):
        """Validate company code is unique"""
        if self.instance is None:  # Creating new
            if Company.objects.filter(company_code=value).exists():
                raise serializers.ValidationError("Company code already exists")
        else:  # Updating existing
            if Company.objects.filter(company_code=value).exclude(company_id=self.instance.company_id).exists():
                raise serializers.ValidationError("Company code already exists")
        return value.upper()


class CompanyUploadSerializer(serializers.Serializer):
    """Serializer for bulk company upload"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file type"""
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel (.xlsx, .xls) or CSV files are allowed")
        return value

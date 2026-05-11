from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model"""
    
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ('client_id', 'created_at', 'updated_at')

    # include readable company name in response
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    
    def validate_client_code(self, value):
        """Validate client code is unique"""
        if self.instance is None:  # Creating new
            if Client.objects.filter(client_code=value).exists():
                raise serializers.ValidationError("Client code already exists")
        else:  # Updating existing
            if Client.objects.filter(client_code=value).exclude(client_id=self.instance.client_id).exists():
                raise serializers.ValidationError("Client code already exists")
        return value.upper()

    def validate_boid(self, value):
        """Validate BOID is present (on create) and unique"""
        if value is None or str(value).strip() == '':
            if self.instance is None:
                raise serializers.ValidationError("BOID is required")
            return value

        value = str(value).strip().upper()
        qs = Client.objects.filter(boid=value)
        if self.instance:
            qs = qs.exclude(client_id=self.instance.client_id)
        if qs.exists():
            raise serializers.ValidationError("BOID already exists")
        return value


class ClientUploadSerializer(serializers.Serializer):
    """Serializer for bulk client upload"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file type"""
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel (.xlsx, .xls) or CSV files are allowed")
        return value

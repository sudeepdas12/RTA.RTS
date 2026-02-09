from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model"""
    
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ('client_id', 'created_at', 'updated_at')
    
    def validate_client_code(self, value):
        """Validate client code is unique"""
        if self.instance is None:  # Creating new
            if Client.objects.filter(client_code=value).exists():
                raise serializers.ValidationError("Client code already exists")
        else:  # Updating existing
            if Client.objects.filter(client_code=value).exclude(client_id=self.instance.client_id).exists():
                raise serializers.ValidationError("Client code already exists")
        return value.upper()


class ClientUploadSerializer(serializers.Serializer):
    """Serializer for bulk client upload"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file type"""
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel (.xlsx, .xls) or CSV files are allowed")
        return value

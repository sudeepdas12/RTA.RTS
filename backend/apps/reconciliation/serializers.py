from rest_framework import serializers
from .models import BankStatement, BankTransaction, Reconciliation


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = '__all__'


class BankStatementSerializer(serializers.ModelSerializer):
    transactions_count = serializers.IntegerField(source='transactions.count', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = BankStatement
        fields = '__all__'
        read_only_fields = ('bank_stmt_id', 'uploaded_by', 'uploaded_at')


class ReconciliationSerializer(serializers.ModelSerializer):
    reconciled_by_name = serializers.CharField(source='reconciled_by.full_name', read_only=True)
    
    class Meta:
        model = Reconciliation
        fields = '__all__'
        read_only_fields = ('recon_id', 'reconciled_by', 'reconciled_at')


class BankStatementUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    bank_name = serializers.CharField(max_length=100)
    account_no = serializers.CharField(max_length=50)
    statement_from = serializers.DateField()
    statement_to = serializers.DateField()

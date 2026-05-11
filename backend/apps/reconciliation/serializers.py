from rest_framework import serializers
from django.db.models import Sum
from .models import BankStatement, BankTransaction, Reconciliation
from apps.payables.models import InterestPayable, DividendPayable


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

    def validate(self, attrs):
        source_type = attrs.get('source_type', getattr(self.instance, 'source_type', None))
        source_id = attrs.get('source_id', getattr(self.instance, 'source_id', None))
        bank_txn = attrs.get('bank_txn', getattr(self.instance, 'bank_txn', None))
        matched_amount = attrs.get('matched_amount', getattr(self.instance, 'matched_amount', None))

        if source_type not in {'Interest', 'Dividend'}:
            raise serializers.ValidationError({'source_type': 'source_type must be Interest or Dividend'})

        payable = None
        if source_type == 'Interest':
            payable = InterestPayable.objects.filter(interest_id=source_id).first()
        elif source_type == 'Dividend':
            payable = DividendPayable.objects.filter(dividend_id=source_id).first()

        if not payable:
            raise serializers.ValidationError({'source_id': 'Referenced payable record not found'})

        # One bank transaction should not be linked repeatedly to the same source record.
        duplicate_link_qs = Reconciliation.objects.filter(
            bank_txn=bank_txn,
            source_type=source_type,
            source_id=source_id,
        )
        if self.instance:
            duplicate_link_qs = duplicate_link_qs.exclude(pk=self.instance.pk)
        if duplicate_link_qs.exists():
            raise serializers.ValidationError(
                {'non_field_errors': 'This bank transaction is already linked to the same payable record'}
            )

        # Do not allow matching beyond outstanding amount for the source payable.
        source_reconciliations = Reconciliation.objects.filter(source_type=source_type, source_id=source_id)
        if self.instance:
            source_reconciliations = source_reconciliations.exclude(pk=self.instance.pk)
        total_matched = source_reconciliations.aggregate(total=Sum('matched_amount')).get('total') or 0
        payable_total = getattr(payable, 'net_payable', 0) or 0

        if matched_amount is None or matched_amount <= 0:
            raise serializers.ValidationError({'matched_amount': 'matched_amount must be greater than 0'})

        if total_matched + matched_amount > payable_total:
            raise serializers.ValidationError(
                {
                    'matched_amount': (
                        f'Matched amount exceeds payable net amount. '
                        f'Outstanding: {payable_total - total_matched}'
                    )
                }
            )

        return attrs


class BankStatementUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    bank_name = serializers.CharField(max_length=100)
    account_no = serializers.CharField(max_length=50)
    statement_from = serializers.DateField()
    statement_to = serializers.DateField()

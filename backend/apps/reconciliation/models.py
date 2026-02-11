"""
Reconciliation models - Bank statements and matching
"""
from django.db import models
from apps.users.models import User


class BankStatement(models.Model):
    """Bank Statement Model"""
    
    bank_stmt_id = models.AutoField(primary_key=True)
    bank_name = models.CharField(max_length=100)
    account_no = models.CharField(max_length=50)
    statement_from = models.DateField()
    statement_to = models.DateField()
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    total_debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'bank_statements'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.bank_name} - {self.statement_from} to {self.statement_to}"


class BankTransaction(models.Model):
    """Bank Transaction Model"""
    
    bank_txn_id = models.AutoField(primary_key=True)
    bank_stmt = models.ForeignKey(BankStatement, on_delete=models.CASCADE, related_name='transactions')
    txn_date = models.DateField()
    reference_no = models.CharField(max_length=100, null=True, blank=True)
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bank_transactions'
        ordering = ['txn_date']
    
    def __str__(self):
        return f"Txn {self.bank_txn_id} - {self.txn_date}"


class Reconciliation(models.Model):
    """Reconciliation Model"""
    
    SOURCE_TYPE_CHOICES = [
        ('Interest', 'Interest'),
        ('Dividend', 'Dividend'),
    ]
    
    STATUS_CHOICES = [
        ('Matched', 'Matched'),
        ('Partial', 'Partial'),
        ('Exception', 'Exception'),
    ]
    
    recon_id = models.AutoField(primary_key=True)
    bank_txn = models.ForeignKey(BankTransaction, on_delete=models.CASCADE, related_name='reconciliations')
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPE_CHOICES)
    source_id = models.IntegerField()
    matched_amount = models.DecimalField(max_digits=15, decimal_places=2)
    recon_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Matched')
    notes = models.TextField(null=True, blank=True)
    reconciled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    reconciled_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reconciliation'
        ordering = ['-reconciled_at']
    
    def __str__(self):
        return f"Recon {self.recon_id} - {self.source_type} {self.source_id}"

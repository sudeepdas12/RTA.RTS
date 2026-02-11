from django.contrib import admin
from .models import BankStatement, BankTransaction, Reconciliation


@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):
    list_display = ('bank_stmt_id', 'bank_name', 'account_no', 'statement_from', 'statement_to', 'uploaded_at')
    list_filter = ('bank_name', 'uploaded_at')


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ('bank_txn_id', 'bank_stmt', 'txn_date', 'debit', 'credit', 'balance')
    list_filter = ('txn_date',)


@admin.register(Reconciliation)
class ReconciliationAdmin(admin.ModelAdmin):
    list_display = ('recon_id', 'bank_txn', 'source_type', 'matched_amount', 'recon_status', 'reconciled_at')
    list_filter = ('source_type', 'recon_status')

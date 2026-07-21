from django.db import models
from apps.companies.models import Company
from apps.clients.models import Client
from apps.users.models import User


class InterestPayable(models.Model):
    """Interest Payable Model"""
    
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
    ]
    
    interest_id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='interest_payables')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='interest_payables')
    instrument_ref = models.CharField(max_length=100, null=True, blank=True)
    gross_interest = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField(db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending', db_index=True)
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_interest_payables')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'interest_payables'
        ordering = ['-due_date']
    
    def save(self, *args, **kwargs):
        """Auto-calculate net_payable before saving"""
        self.net_payable = (self.gross_interest or 0) - (self.tax_amount or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Interest {self.interest_id} - {self.company.company_code} - {self.client.client_code}"


class DividendPayable(models.Model):
    """Dividend Payable Model"""
    
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
    ]
    
    dividend_id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='dividend_payables')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='dividend_payables')
    shares_held = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    gross_dividend = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending', db_index=True)
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, null=True, blank=True)
    fiscal_year = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_dividend_payables')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dividend_payables'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        """Auto-calculate net_payable before saving"""
        self.net_payable = (self.gross_dividend or 0) - (self.tax_amount or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dividend {self.dividend_id} - {self.company.company_code} - {self.client.client_code}"


class DebentureReconciliation(models.Model):
    """Debenture Reconciliation Model - stores the RBBL debenture interest reconciliation data"""
    
    PAYMENT_STATUS_CHOICES = [
        ('SUCCESS', 'SUCCESS'),
        ('REJECT/SUCCESS', 'REJECT/SUCCESS'),
        ('REJECT', 'REJECT'),
        ('MERGER', 'MERGER'),
        ('NEW PENDING', 'NEW PENDING'),
    ]
    
    id = models.AutoField(primary_key=True)
    SECTOR_CHOICES = [
        ('Public', 'Public'),
        ('Private', 'Private'),
        ('Institution', 'Institution'),
        ('Government', 'Government'),
        ('Other', 'Other'),
    ]
    TAX_STATUS_CHOICES = [
        ('Taxable', 'Taxable'),
        ('Exempted', 'Tax Exempted'),
    ]
    
    company_code = models.CharField(max_length=50, db_index=True, help_text="Company identifier e.g. RBBL")
    company_name = models.CharField(max_length=200, help_text="Company full name")
    report_title = models.CharField(max_length=300, blank=True, default="")
    report_subtitle = models.CharField(max_length=300, blank=True, default="")
    sector_type = models.CharField(max_length=20, choices=SECTOR_CHOICES, default='Public', db_index=True, help_text="Public/Private/Institution/Government")
    tax_status = models.CharField(max_length=20, choices=TAX_STATUS_CHOICES, default='Taxable', db_index=True, help_text="Taxable or Tax Exempted")
    
    # Applicant details
    sn = models.IntegerField()
    boid = models.CharField(max_length=50, db_index=True)
    applicant_name = models.CharField(max_length=300)
    father_mother_name = models.CharField(max_length=300, blank=True, default="")
    grandfather_spouse_name = models.CharField(max_length=300, blank=True, default="")
    citizenship_number = models.CharField(max_length=100, blank=True, default="")
    issued_from = models.CharField(max_length=100, blank=True, default="")
    
    # Financial fields
    alloted_quantity = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    annual_interest = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    daily_interest = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    period_interest = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    tax = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    net_interest_payable = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    roundup = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Bank details
    bank_code = models.CharField(max_length=20, blank=True, default="")
    bank_name = models.CharField(max_length=200, db_index=True)
    account_number = models.CharField(max_length=100, blank=True, default="")
    
    # Status
    lot = models.CharField(max_length=100, blank=True, default="", db_index=True)
    status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='SUCCESS', db_index=True)
    approved_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")
    
    # Period info
    period_from = models.DateField(null=True, blank=True)
    period_to = models.DateField(null=True, blank=True)
    period_days = models.IntegerField(default=74)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=7.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=6.00)
    
    # Upload tracking
    upload_batch = models.CharField(max_length=50, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'debenture_reconciliation'
        ordering = ['company_code', 'sn']
        indexes = [
            models.Index(fields=['company_code', 'status']),
            models.Index(fields=['company_code', 'lot']),
        ]
    
    def __str__(self):
        return f"{self.company_code} - SN:{self.sn} - {self.applicant_name}"
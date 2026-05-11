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
    # public sector workbook fields
    allotted_quantity = models.IntegerField(null=True, blank=True)
    principal_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    interest_per_day = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    interest_pumori = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Tax percentage")
    tax_exempted = models.BooleanField(default=False, help_text="True if client is tax exempt")
    bank_code = models.CharField(max_length=20, null=True, blank=True)
    bank_name = models.CharField(max_length=100, null=True, blank=True)
    account_number = models.CharField(max_length=50, null=True, blank=True)
    lot = models.CharField(max_length=50, null=True, blank=True)
    approved_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)

    gross_interest = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField()
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_interest_payables')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'interest_payables'
        ordering = ['-due_date']
    
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
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, null=True, blank=True)
    fiscal_year = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_dividend_payables')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dividend_payables'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Dividend {self.dividend_id} - {self.company.company_code} - {self.client.client_code}"


# ============================================================================
# ADVANCED PAYABLES FEATURES
# ============================================================================

class PayableTag(models.Model):
    """Tags for organizing payables"""
    
    tag_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='#6c757d')  # Hex color code
    description = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payable_tags'
        unique_together = ['name', 'created_by']
        ordering = ['name']
    
    def __str__(self):
        return self.name


class InterestPayableTag(models.Model):
    """Many-to-many relationship between Interest Payables and Tags"""
    
    id = models.AutoField(primary_key=True)
    interest = models.ForeignKey(InterestPayable, on_delete=models.CASCADE, related_name='tags')
    tag = models.ForeignKey(PayableTag, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'interest_payable_tags'
        unique_together = ['interest', 'tag']


class DividendPayableTag(models.Model):
    """Many-to-many relationship between Dividend Payables and Tags"""
    
    id = models.AutoField(primary_key=True)
    dividend = models.ForeignKey(DividendPayable, on_delete=models.CASCADE, related_name='tags')
    tag = models.ForeignKey(PayableTag, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dividend_payable_tags'
        unique_together = ['dividend', 'tag']


class PaymentReminder(models.Model):
    """Reminders for upcoming due dates"""
    
    REMINDER_TYPE_CHOICES = [
        ('EMAIL', 'Email'),
        ('IN_APP', 'In-App'),
        ('BOTH', 'Both'),
    ]
    
    reminder_id = models.AutoField(primary_key=True)
    
    # Can be null if user doesn't specify
    interest = models.ForeignKey(InterestPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    dividend = models.ForeignKey(DividendPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    
    # Generic approach - days before due date
    days_before_due = models.IntegerField(default=7, help_text="Remind X days before due date")
    reminder_type = models.CharField(max_length=10, choices=REMINDER_TYPE_CHOICES, default='IN_APP')
    
    # Status
    is_active = models.BooleanField(default=True)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_reminders'
        ordering = ['-created_at']
    
    def __str__(self):
        payable_info = f"Interest {self.interest_id}" if self.interest else f"Dividend {self.dividend_id}"
        return f"Reminder - {payable_info} ({self.days_before_due} days)"


class PaymentTracking(models.Model):
    """Detailed payment tracking with partial payments"""
    
    tracking_id = models.AutoField(primary_key=True)
    
    # Generic reference
    interest = models.ForeignKey(InterestPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='payment_tracking')
    dividend = models.ForeignKey(DividendPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='payment_tracking')
    
    # Payment details
    payment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=50, null=True, blank=True)  # 'Bank Transfer', 'Check', 'Cash', etc.
    reference_number = models.CharField(max_length=100, null=True, blank=True)  # Check number, transaction ID, etc.
    reconciliation_status = models.CharField(max_length=20, default='Pending')  # 'Pending', 'Reconciled', 'Exception'
    notes = models.TextField(null=True, blank=True)
    
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_tracking'
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['interest', '-payment_date']),
            models.Index(fields=['dividend', '-payment_date']),
            models.Index(fields=['reconciliation_status']),
        ]
    
    def __str__(self):
        payable_info = f"Interest {self.interest_id}" if self.interest else f"Dividend {self.dividend_id}"
        return f"Payment - {payable_info} - {self.payment_amount}"


class ApprovalWorkflow(models.Model):
    """Approval tracking for payables"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    workflow_id = models.AutoField(primary_key=True)
    
    # Generic reference
    interest = models.ForeignKey(InterestPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='approvals')
    dividend = models.ForeignKey(DividendPayable, on_delete=models.CASCADE, null=True, blank=True, related_name='approvals')
    
    # Approval details
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approval_requests')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approvals_given')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    comments = models.TextField(null=True, blank=True)
    
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'approval_workflows'
        ordering = ['-requested_at']
    
    def __str__(self):
        payable_info = f"Interest {self.interest_id}" if self.interest else f"Dividend {self.dividend_id}"
        return f"Approval - {payable_info} - {self.status}"

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

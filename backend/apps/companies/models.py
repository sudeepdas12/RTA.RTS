from django.db import models


class Company(models.Model):
    """Company Master Model"""
    
    SECTOR_CHOICES = [
        ('Public', 'Public'),
        ('Private', 'Private'),
    ]
    
    TAX_STATUS_CHOICES = [
        ('Taxable', 'Taxable'),
        ('Exempted', 'Exempted'),
    ]
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]
    
    company_id = models.AutoField(primary_key=True)
    company_code = models.CharField(max_length=20, unique=True)
    company_name = models.CharField(max_length=200)
    sector_type = models.CharField(max_length=50, choices=SECTOR_CHOICES, null=True, blank=True)
    interest_tax_status = models.CharField(max_length=50, choices=TAX_STATUS_CHOICES, null=True, blank=True, db_index=True)
    pan_no = models.CharField(max_length=50, null=True, blank=True)
    bank_account_no = models.CharField(max_length=50, null=True, blank=True)
    bank_name = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'companies'
        ordering = ['company_code']
        verbose_name_plural = 'Companies'
    
    def __str__(self):
        return f"{self.company_code} - {self.company_name}"

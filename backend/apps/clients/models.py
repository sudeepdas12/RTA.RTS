from django.db import models


class Client(models.Model):
    """Client/Shareholder Master Model"""
    
    HOLDER_TYPE_CHOICES = [
        ('Public', 'Public'),
        ('Promoter', 'Promoter'),
        ('Institution', 'Institution'),
    ]
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]
    
    client_id = models.AutoField(primary_key=True)
    client_code = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=200)
    # BOID is a unique identifier used for lookups/searches. It's required for new clients.
    boid = models.CharField(max_length=50, unique=True, null=True, blank=True, db_index=True)
    holder_type = models.CharField(max_length=50, choices=HOLDER_TYPE_CHOICES, null=True, blank=True, db_index=True)
    pan_or_citizenship = models.CharField(max_length=50, null=True, blank=True)
    bank_account_no = models.CharField(max_length=50, null=True, blank=True)
    bank_name = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clients'
        ordering = ['client_code']
        verbose_name_plural = 'Clients'
    
    def __str__(self):
        return f"{self.client_code} - {self.full_name}"

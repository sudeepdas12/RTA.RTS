from django.db import models


class FiscalYearSettings(models.Model):
    """Store interest and tax rates for each fiscal year per company."""
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='fiscal_year_settings',
        help_text="Company for this fiscal year setting"
    )
    fiscal_year = models.CharField(
        max_length=20,
        help_text="Fiscal year (e.g., 2080-81, 2081-82)"
    )
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=7.00,
        help_text="Interest rate percentage"
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Tax rate percentage"
    )
    is_active = models.BooleanField(
        default=False,
        help_text="Set as current active fiscal year"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fiscal_year_settings'
        ordering = ['-fiscal_year', 'company__company_name']
        unique_together = [['company', 'fiscal_year']]
        verbose_name = 'Fiscal Year Setting'
        verbose_name_plural = 'Fiscal Year Settings'

    def __str__(self):
        return f"{self.company.company_name} - {self.fiscal_year} - Interest: {self.interest_rate}% | Tax: {self.tax_rate}%"

    def save(self, *args, **kwargs):
        if self.is_active:
            # Deactivate all other fiscal years when this one is set as active
            FiscalYearSettings.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

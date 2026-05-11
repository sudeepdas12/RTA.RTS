"""Migrations for advanced payables features"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('payables', '0004_tax_exempted'),
    ]

    operations = [
        # PayableTag
        migrations.CreateModel(
            name='PayableTag',
            fields=[
                ('tag_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('color', models.CharField(default='#6c757d', max_length=20)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
            ],
            options={
                'db_table': 'payable_tags',
                'ordering': ['name'],
            },
        ),
        # InterestPayableTag
        migrations.CreateModel(
            name='InterestPayableTag',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('interest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tags', to='payables.interestpayable')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='payables.payabletag')),
            ],
            options={
                'db_table': 'interest_payable_tags',
            },
        ),
        # DividendPayableTag
        migrations.CreateModel(
            name='DividendPayableTag',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('dividend', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tags', to='payables.dividendpayable')),
                ('tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='payables.payabletag')),
            ],
            options={
                'db_table': 'dividend_payable_tags',
            },
        ),
        # PaymentReminder
        migrations.CreateModel(
            name='PaymentReminder',
            fields=[
                ('reminder_id', models.AutoField(primary_key=True, serialize=False)),
                ('days_before_due', models.IntegerField(default=7)),
                ('reminder_type', models.CharField(choices=[('EMAIL', 'Email'), ('IN_APP', 'In-App'), ('BOTH', 'Both')], default='IN_APP', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('is_sent', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
                ('dividend', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to='payables.dividendpayable')),
                ('interest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to='payables.interestpayable')),
            ],
            options={
                'db_table': 'payment_reminders',
                'ordering': ['-created_at'],
            },
        ),
        # PaymentTracking
        migrations.CreateModel(
            name='PaymentTracking',
            fields=[
                ('tracking_id', models.AutoField(primary_key=True, serialize=False)),
                ('payment_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('payment_date', models.DateField()),
                ('payment_method', models.CharField(blank=True, max_length=50, null=True)),
                ('reference_number', models.CharField(blank=True, max_length=100, null=True)),
                ('reconciliation_status', models.CharField(default='Pending', max_length=20)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('dividend', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payment_tracking', to='payables.dividendpayable')),
                ('interest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payment_tracking', to='payables.interestpayable')),
                ('recorded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
            ],
            options={
                'db_table': 'payment_tracking',
                'ordering': ['-payment_date'],
            },
        ),
        # ApprovalWorkflow
        migrations.CreateModel(
            name='ApprovalWorkflow',
            fields=[
                ('workflow_id', models.AutoField(primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=20)),
                ('comments', models.TextField(blank=True, null=True)),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approvals_given', to='users.user')),
                ('dividend', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='approvals', to='payables.dividendpayable')),
                ('interest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='approvals', to='payables.interestpayable')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approval_requests', to='users.user')),
            ],
            options={
                'db_table': 'approval_workflows',
                'ordering': ['-requested_at'],
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='payabletag',
            index=models.Index(fields=['name', 'created_by'], name='payable_tags_name_user_idx'),
        ),
        migrations.AddIndex(
            model_name='paymenttracking',
            index=models.Index(fields=['interest', '-payment_date'], name='payment_tracking_int_date_idx'),
        ),
        migrations.AddIndex(
            model_name='paymenttracking',
            index=models.Index(fields=['dividend', '-payment_date'], name='payment_tracking_div_date_idx'),
        ),
        migrations.AddIndex(
            model_name='paymenttracking',
            index=models.Index(fields=['reconciliation_status'], name='payment_tracking_status_idx'),
        ),
        # Unique constraints
        migrations.AlterUniqueTogether(
            name='payabletag',
            unique_together={('name', 'created_by')},
        ),
        migrations.AlterUniqueTogether(
            name='interestpayabletag',
            unique_together={('interest', 'tag')},
        ),
        migrations.AlterUniqueTogether(
            name='dividendpayabletag',
            unique_together={('dividend', 'tag')},
        ),
    ]

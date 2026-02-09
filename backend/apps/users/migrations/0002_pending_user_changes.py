from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingUserChange',
            fields=[
                ('change_id', models.AutoField(primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete')], max_length=10)),
                ('data', models.JSONField(blank=True, null=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=10)),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reason', models.TextField(blank=True, null=True)),
                ('approver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_requests', to='users.user')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pending_requests', to='users.user')),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pending_target', to='users.user')),
            ],
            options={
                'db_table': 'pending_user_changes',
                'ordering': ['-requested_at'],
            },
        ),
    ]

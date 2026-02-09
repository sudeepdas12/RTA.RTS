import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

# Check admin user
admin = User.objects.get(username='admin')
print('Admin user:', admin.username)
print('Admin role:', admin.role.role_name)
print('Admin role permissions:', admin.role.permissions)
print('has_permission(companies, read):', admin.has_permission('companies', 'read'))
print('has_permission(clients, read):', admin.has_permission('clients', 'read'))

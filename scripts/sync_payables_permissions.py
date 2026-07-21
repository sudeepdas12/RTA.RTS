import os, sys
proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if proj_root not in sys.path:
    sys.path.insert(0, proj_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.users.models import Role

roles = Role.objects.all()
updated = []
for r in roles:
    try:
        perms = r.permissions or {}
        if 'payables' in perms:
            changed = False
            if 'interest_payables' not in perms:
                perms['interest_payables'] = perms['payables']
                changed = True
            if 'dividend_payables' not in perms:
                perms['dividend_payables'] = perms['payables']
                changed = True
            if changed:
                r.permissions = perms
                r.save()
                updated.append(r.role_name)
    except Exception as e:
        print('Error on role', r.role_name, e)

print('Updated roles:', updated)

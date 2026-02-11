from django.core.management.base import BaseCommand
from apps.users.models import User, Role

class Command(BaseCommand):
    help = 'Set password for existing admin user or create admin user if missing'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin')
        parser.add_argument('--password', type=str, default='admin123')
        parser.add_argument('--email', type=str, default='admin@rta.gov.np')
        parser.add_argument('--full-name', type=str, default='System Administrator')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        full_name = options['full_name']

        admin_role, _ = Role.objects.get_or_create(role_name='Admin')

        user, created = User.objects.get_or_create(username=username, defaults={
            'full_name': full_name,
            'email': email,
            'role': admin_role,
        })

        user.set_password(password)
        user.role = admin_role
        user.status = 'Active'
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created admin user `{username}` and set password.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated password for existing user `{username}`.'))

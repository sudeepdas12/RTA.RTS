from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import csv
import io
from .models import FiscalYearSettings
from .serializers import FiscalYearSettingsSerializer
from apps.companies.models import Company


class FiscalYearSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing fiscal year settings."""
    queryset = FiscalYearSettings.objects.all().select_related('company')
    serializer_class = FiscalYearSettingsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['company', 'fiscal_year', 'is_active']
    search_fields = ['fiscal_year', 'company__company_name']

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active fiscal year settings."""
        company_id = request.query_params.get('company')
        if company_id:
            active_setting = FiscalYearSettings.objects.filter(is_active=True, company_id=company_id).first()
        else:
            active_setting = FiscalYearSettings.objects.filter(is_active=True).first()
            
        if active_setting:
            serializer = self.get_serializer(active_setting)
            return Response(serializer.data)
        return Response(
            {'detail': 'No active fiscal year found'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set a fiscal year as active."""
        instance = self.get_object()
        instance.is_active = True
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Bulk upload fiscal year settings from CSV file."""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            updated_count = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):
                try:
                    company_name = row.get('Company Name', '').strip()
                    fiscal_year = row.get('Fiscal Year', '').strip()
                    interest_rate = row.get('Interest Rate %', '').strip()
                    tax_rate = row.get('Tax Rate %', '').strip()

                    if not all([company_name, fiscal_year, interest_rate, tax_rate]):
                        errors.append(f"Row {row_num}: Missing required fields")
                        continue

                    # Find company
                    company = Company.objects.filter(company_name__iexact=company_name).first()
                    if not company:
                        errors.append(f"Row {row_num}: Company '{company_name}' not found")
                        continue

                    # Create or update
                    settings, created = FiscalYearSettings.objects.update_or_create(
                        company=company,
                        fiscal_year=fiscal_year,
                        defaults={
                            'interest_rate': float(interest_rate),
                            'tax_rate': float(tax_rate),
                        }
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Failed to process file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

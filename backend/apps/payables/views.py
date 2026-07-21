"""Views for Payables app"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from django.db import transaction
from openpyxl import load_workbook
import csv
import uuid
from io import BytesIO, StringIO
from datetime import datetime, date

from .models import InterestPayable, DividendPayable, DebentureReconciliation
from .serializers import (
    InterestPayableSerializer, DividendPayableSerializer, 
    DebentureReconciliationSerializer, DebentureUploadSerializer,
    PayableUploadSerializer
)
from apps.companies.models import Company
from apps.clients.models import Client
from apps.users.permissions import HasPermission


class InterestPayableViewSet(viewsets.ModelViewSet):
    """ViewSet for Interest Payable CRUD operations"""
    
    queryset = InterestPayable.objects.select_related('company', 'client').all()
    serializer_class = InterestPayableSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'interest_payables'
    
    def get_queryset(self):
        """Filter interest payables"""
        queryset = InterestPayable.objects.select_related('company', 'client').all()
        fiscal_year = self.request.query_params.get('fiscal_year')
        
        # Company filter
        companies = self.request.query_params.get('company', None)
        if companies:
            ids = [c.strip() for c in companies.split(',') if c.strip()]
            if len(ids) == 1:
                queryset = queryset.filter(company_id=ids[0])
            else:
                queryset = queryset.filter(company_id__in=ids)
        
        # Client filter
        client_id = self.request.query_params.get('client', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Payment status filter
        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        
        if from_date:
            queryset = queryset.filter(due_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(due_date__lte=to_date)

        # Fiscal year filter (format YYYY/YYYY+1)
        if fiscal_year:
            try:
                start_year = int(fiscal_year.split('/')[0])
                end_year = int(fiscal_year.split('/')[1])
                start_date = date(start_year, 7, 1)
                end_date = date(end_year, 6, 30)
                queryset = queryset.filter(due_date__range=(start_date, end_date))
            except Exception:
                pass

        # Sector/Tax filters via company
        sector_type = self.request.query_params.get('sector_type', None)
        if sector_type:
            if 'priv' in sector_type.lower(): sector_type = 'Private'
            elif 'pub' in sector_type.lower(): sector_type = 'Public'
            queryset = queryset.filter(company__sector_type=sector_type)
            
        tax_status = self.request.query_params.get('tax_status', None)
        if tax_status:
            if 'exempt' in tax_status.lower(): tax_status = 'Exempted'
            elif 'taxable' in tax_status.lower(): tax_status = 'Taxable'
            queryset = queryset.filter(company__interest_tax_status=tax_status)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by on creation"""
        user = getattr(self.request, 'user_obj', None) or self.request.user
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Bulk upload interest payables from Excel/CSV"""
        serializer = PayableUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['file']
        
        try:
            # Read file
            data = []
            if file.name.endswith('.csv'):
                reader = csv.DictReader(StringIO(file.read().decode('utf-8')))
                data = list(reader)
            else:
                wb = load_workbook(BytesIO(file.read()))
                sheet = wb.active
                headers = [cell.value for cell in sheet[1]]
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    data.append(dict(zip(headers, row)))
            
            # Expected columns
            required_cols = ['company_code', 'client_code', 'gross_interest', 'tax_amount', 'due_date']
            if not data:
                return Response({'error': 'No data found in file'}, status=status.HTTP_400_BAD_REQUEST)
            
            missing_cols = [col for col in required_cols if col not in data[0]]
            
            if missing_cols:
                return Response(
                    {'error': f'Missing required columns: {", ".join(missing_cols)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            created = 0
            errors = []
            
            valid_status = {s for s, _ in InterestPayable.PAYMENT_STATUS_CHOICES}
            for index, row in enumerate(data):
                try:
                    company_code = str(row['company_code']).strip().upper()
                    client_code = str(row['client_code']).strip().upper()
                    
                    # Get company and client
                    try:
                        company = Company.objects.get(company_code=company_code)
                    except Company.DoesNotExist:
                        errors.append(f"Row {index + 2}: Company {company_code} not found")
                        continue
                    
                    try:
                        client = Client.objects.get(client_code=client_code)
                    except Client.DoesNotExist:
                        errors.append(f"Row {index + 2}: Client {client_code} not found")
                        continue
                    
                    gross = float(row.get('gross_interest') or 0)
                    tax = float(row.get('tax_amount') or 0)
                    net = gross - tax
                    
                    due_date_str = str(row['due_date'])
                    try:
                        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            due_date = datetime.strptime(due_date_str, '%m/%d/%Y').date()
                        except ValueError:
                            errors.append(f"Row {index + 2}: Invalid due date format")
                            continue
                    
                    payment_status = str(row.get('payment_status', '')).strip().title() or 'Pending'
                    if payment_status not in valid_status:
                        errors.append(f"Row {index + 2}: Invalid payment_status '{payment_status}'")
                        continue

                    user = getattr(request, 'user_obj', None) or request.user
                    InterestPayable.objects.create(
                        company=company,
                        client=client,
                        instrument_ref=str(row.get('instrument_ref', '')).strip() or None,
                        gross_interest=gross,
                        tax_amount=tax,
                        net_payable=net,
                        due_date=due_date,
                        payment_status=payment_status,
                        created_by=user
                    )
                    created += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
            
            return Response({
                'message': 'Upload completed',
                'created': created,
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error processing file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get interest payables summary"""
        queryset = self.get_queryset()
        
        total = queryset.aggregate(
            total_gross=Sum('gross_interest'),
            total_tax=Sum('tax_amount'),
            total_net=Sum('net_payable')
        )
        
        paid = queryset.filter(payment_status='Paid').aggregate(
            paid_amount=Sum('net_payable')
        )
        
        pending = queryset.filter(payment_status='Pending').aggregate(
            pending_amount=Sum('net_payable')
        )
        
        return Response({
            'total_records': queryset.count(),
            'total_gross': total['total_gross'] or 0,
            'total_tax': total['total_tax'] or 0,
            'total_net': total['total_net'] or 0,
            'paid_amount': paid['paid_amount'] or 0,
            'pending_amount': pending['pending_amount'] or 0
        })
    
    @action(detail=False, methods=['get'])
    def export_template(self, request):
        """Download Excel template for interest payables upload"""
        from django.http import HttpResponse
        import xlsxwriter
        
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet('Interest Payables')
        
        headers = [
            'company_code', 'client_code', 'instrument_ref',
            'gross_interest', 'tax_amount', 'due_date', 'payment_status'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001', 'CL001', 'BOND-2024-001', 50000, 7500, '2026-03-15', 'Pending'],
            ['COMP002', 'CL002', 'DEB-2024-002', 100000, 15000, '2026-03-30', 'Paid'],
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=1):
            for col_idx, cell_data in enumerate(row_data):
                worksheet.write(row_idx, col_idx, cell_data)
        
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=interest_payables_template.xlsx'
        
        return response


class DividendPayableViewSet(viewsets.ModelViewSet):
    """ViewSet for Dividend Payable CRUD operations"""
    
    queryset = DividendPayable.objects.select_related('company', 'client').all()
    serializer_class = DividendPayableSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'dividend_payables'
    
    def get_queryset(self):
        """Filter dividend payables"""
        queryset = DividendPayable.objects.select_related('company', 'client').all()
        
        # Company filter
        company_id = self.request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Client filter
        client_id = self.request.query_params.get('client', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Payment status filter
        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        # Fiscal year filter
        fiscal_year = self.request.query_params.get('fiscal_year', None)
        if fiscal_year:
            queryset = queryset.filter(fiscal_year=fiscal_year)

        # Date range filter (created_at)
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)

        if from_date:
            queryset = queryset.filter(created_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__date__lte=to_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by on creation"""
        user = getattr(self.request, 'user_obj', None) or self.request.user
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Bulk upload dividend payables from Excel/CSV"""
        serializer = PayableUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['file']
        
        try:
            # Read file
            data = []
            if file.name.endswith('.csv'):
                reader = csv.DictReader(StringIO(file.read().decode('utf-8')))
                data = list(reader)
            else:
                wb = load_workbook(BytesIO(file.read()))
                sheet = wb.active
                headers = [cell.value for cell in sheet[1]]
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    data.append(dict(zip(headers, row)))
            
            # Expected columns
            required_cols = ['company_code', 'client_code', 'shares_held', 'gross_dividend', 'tax_amount']
            if not data:
                return Response({'error': 'No data found in file'}, status=status.HTTP_400_BAD_REQUEST)
            
            missing_cols = [col for col in required_cols if col not in data[0]]
            
            if missing_cols:
                return Response(
                    {'error': f'Missing required columns: {", ".join(missing_cols)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            created = 0
            errors = []
            
            valid_status = {s for s, _ in DividendPayable.PAYMENT_STATUS_CHOICES}
            for index, row in enumerate(data):
                try:
                    company_code = str(row['company_code']).strip().upper()
                    client_code = str(row['client_code']).strip().upper()
                    
                    # Get company and client
                    try:
                        company = Company.objects.get(company_code=company_code)
                    except Company.DoesNotExist:
                        errors.append(f"Row {index + 2}: Company {company_code} not found")
                        continue
                    
                    try:
                        client = Client.objects.get(client_code=client_code)
                    except Client.DoesNotExist:
                        errors.append(f"Row {index + 2}: Client {client_code} not found")
                        continue
                    
                    shares = float(row.get('shares_held') or 0)
                    gross = float(row.get('gross_dividend') or 0)
                    tax = float(row.get('tax_amount') or 0)
                    net = gross - tax

                    payment_status = str(row.get('payment_status', '')).strip().title() or 'Pending'
                    if payment_status not in valid_status:
                        errors.append(f"Row {index + 2}: Invalid payment_status '{payment_status}'")
                        continue
                    
                    user = getattr(request, 'user_obj', None) or request.user
                    DividendPayable.objects.create(
                        company=company,
                        client=client,
                        shares_held=shares,
                        gross_dividend=gross,
                        tax_amount=tax,
                        net_payable=net,
                        payment_status=payment_status,
                        fiscal_year=str(row.get('fiscal_year', '')).strip() or None,
                        created_by=user
                    )
                    created += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
            
            return Response({
                'message': 'Upload completed',
                'created': created,
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error processing file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dividend payables summary"""
        queryset = self.get_queryset()
        
        total = queryset.aggregate(
            total_shares=Sum('shares_held'),
            total_gross=Sum('gross_dividend'),
            total_tax=Sum('tax_amount'),
            total_net=Sum('net_payable')
        )
        
        paid = queryset.filter(payment_status='Paid').aggregate(
            paid_amount=Sum('net_payable')
        )
        
        pending = queryset.filter(payment_status='Pending').aggregate(
            pending_amount=Sum('net_payable')
        )
        
        return Response({
            'total_records': queryset.count(),
            'total_shares': total['total_shares'] or 0,
            'total_gross': total['total_gross'] or 0,
            'total_tax': total['total_tax'] or 0,
            'total_net': total['total_net'] or 0,
            'paid_amount': paid['paid_amount'] or 0,
            'pending_amount': pending['pending_amount'] or 0
        })
    
    @action(detail=False, methods=['get'])
    def export_template(self, request):
        """Download Excel template for dividend payables upload"""
        from django.http import HttpResponse
        import xlsxwriter
        
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet('Dividend Payables')
        
        headers = [
            'company_code', 'client_code', 'shares_held',
            'gross_dividend', 'tax_amount', 'fiscal_year', 'payment_status'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001', 'CL001', 1000, 50000, 7500, '2080/81', 'Paid'],
            ['COMP002', 'CL002', 2500, 125000, 18750, '2080/81', 'Pending'],
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=1):
            for col_idx, cell_data in enumerate(row_data):
                worksheet.write(row_idx, col_idx, cell_data)
        
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=dividend_payables_template.xlsx'
        
        return response


class DebentureReconciliationViewSet(viewsets.ModelViewSet):
    """ViewSet for Debenture Reconciliation CRUD + Upload"""
    
    queryset = DebentureReconciliation.objects.all()
    serializer_class = DebentureReconciliationSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'interest_payables'
    
    def get_queryset(self):
        queryset = DebentureReconciliation.objects.all()
        
        # Company filter (comma-separated for multi-company)
        company_code = self.request.query_params.get('company_code', None)
        if company_code:
            codes = [c.strip() for c in company_code.split(',') if c.strip()]
            if len(codes) == 1:
                queryset = queryset.filter(company_code=codes[0])
            else:
                queryset = queryset.filter(company_code__in=codes)
        
        # Status filter
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Lot filter
        lot = self.request.query_params.get('lot', None)
        if lot:
            queryset = queryset.filter(lot=lot)
        
        # Bank filter
        bank = self.request.query_params.get('bank_name', None)
        if bank:
            queryset = queryset.filter(bank_name__icontains=bank)
        
        # Bank code filter
        bank_code = self.request.query_params.get('bank_code', None)
        if bank_code:
            queryset = queryset.filter(bank_code__icontains=bank_code)
        
        # Fiscal year filter (format YYYY/YYYY+1)
        fiscal_year = self.request.query_params.get('fiscal_year', None)
        if fiscal_year:
            try:
                start_year = int(fiscal_year.split('/')[0])
                end_year = int(fiscal_year.split('/')[1])
                start_date = date(start_year, 7, 1)
                end_date = date(end_year, 6, 30)
                queryset = queryset.filter(
                    Q(period_from__gte=start_date, period_to__lte=end_date) |
                    Q(period_from__isnull=True, period_to__isnull=True)
                )
            except Exception:
                pass
        
        # Period date range filter
        period_from = self.request.query_params.get('period_from', None)
        if period_from:
            queryset = queryset.filter(period_from__gte=period_from)
        period_to = self.request.query_params.get('period_to', None)
        if period_to:
            queryset = queryset.filter(period_to__lte=period_to)
        
        # Amount range filters
        min_amount = self.request.query_params.get('min_amount', None)
        if min_amount:
            queryset = queryset.filter(amount__gte=float(min_amount))
        max_amount = self.request.query_params.get('max_amount', None)
        if max_amount:
            queryset = queryset.filter(amount__lte=float(max_amount))
        
        # Min roundup/net payable
        min_net = self.request.query_params.get('min_net', None)
        if min_net:
            queryset = queryset.filter(roundup__gte=float(min_net))
        
        # Applicant name search
        applicant = self.request.query_params.get('applicant_name', None)
        if applicant:
            queryset = queryset.filter(applicant_name__icontains=applicant)
        
        # Citizenship filter
        citizenship = self.request.query_params.get('citizenship_number', None)
        if citizenship:
            queryset = queryset.filter(citizenship_number__icontains=citizenship)
        
        # BOID filter
        boid = self.request.query_params.get('boid', None)
        if boid:
            queryset = queryset.filter(boid__icontains=boid)
        
        # Account number filter
        account = self.request.query_params.get('account_number', None)
        if account:
            queryset = queryset.filter(account_number__icontains=account)
        
        # Sector type filter (Public/Private/Institution/Government)
        sector_type = self.request.query_params.get('sector_type', None)
        if sector_type:
            if 'priv' in sector_type.lower(): sector_type = 'Private'
            elif 'pub' in sector_type.lower(): sector_type = 'Public'
            elif 'inst' in sector_type.lower(): sector_type = 'Institution'
            elif 'gov' in sector_type.lower(): sector_type = 'Government'
            queryset = queryset.filter(sector_type=sector_type)
        
        # Tax status filter (Taxable/Exempted)
        tax_status = self.request.query_params.get('tax_status', None)
        if tax_status:
            if 'exempt' in tax_status.lower(): tax_status = 'Exempted'
            elif 'taxable' in tax_status.lower(): tax_status = 'Taxable'
            queryset = queryset.filter(tax_status=tax_status)
        
        # Search across multiple fields
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(applicant_name__icontains=search) |
                Q(boid__icontains=search) |
                Q(citizenship_number__icontains=search) |
                Q(account_number__icontains=search) |
                Q(bank_name__icontains=search) |
                Q(bank_code__icontains=search) |
                Q(lot__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def companies(self, request):
        """Get distinct company codes, names and summary stats"""
        queryset = self.get_queryset()
        companies = queryset.values('company_code', 'company_name')\
            .annotate(
                total_applicants=Count('id'),
                total_principal=Sum('amount'),
                total_net=Sum('roundup'),
            ).order_by('company_code')
        
        # Get unique interest_rate per company
        result = []
        for comp in companies:
            rate = queryset.filter(
                company_code=comp['company_code']
            ).values('interest_rate').distinct()
            rates = [r['interest_rate'] for r in rate]
            result.append({
                'company_code': comp['company_code'],
                'company_name': comp['company_name'],
                'total_applicants': comp['total_applicants'],
                'total_principal': float(comp['total_principal'] or 0),
                'total_net': float(comp['total_net'] or 0),
                'interest_rates': rates,
            })
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary stats for the filtered data"""
        queryset = self.get_queryset()
        total = queryset.aggregate(
            total_applicants=Count('id'),
            total_principal=Sum('amount'),
            total_gross=Sum('period_interest'),
            total_tax=Sum('tax'),
            total_net=Sum('roundup'),
        )
        bank_count = queryset.values('bank_name').distinct().count()
        company_count = queryset.values('company_code').distinct().count()
        return Response({
            'total_applicants': total['total_applicants'] or 0,
            'total_principal': float(total['total_principal'] or 0),
            'total_gross': float(total['total_gross'] or 0),
            'total_tax': float(total['total_tax'] or 0),
            'total_net': float(total['total_net'] or 0),
            'unique_banks': bank_count,
            'unique_companies': company_count,
        })
    
    @action(detail=False, methods=['get'])
    def banks(self, request):
        """Get distinct banks with counts"""
        queryset = self.get_queryset()
        banks = queryset.values('bank_code', 'bank_name')\
            .annotate(count=Count('id'), total_net=Sum('roundup'))\
            .order_by('bank_name')
        return Response(list(banks))
    
    @action(detail=True, methods=['delete'])
    def remove_record(self, request, pk=None):
        """Delete a single debenture reconciliation record"""
        try:
            record = self.get_object()
            record.delete()
            return Response({'message': 'Record deleted successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete records by filters"""
        try:
            # Get filter parameters
            company_code = request.data.get('company_code')
            upload_batch = request.data.get('upload_batch')
            period_from = request.data.get('period_from')
            period_to = request.data.get('period_to')
            delete_all = request.data.get('delete_all', False)
            
            queryset = DebentureReconciliation.objects.all()
            
            # Apply filters
            if company_code:
                queryset = queryset.filter(company_code=company_code)
            if upload_batch:
                queryset = queryset.filter(upload_batch=upload_batch)
            if period_from:
                queryset = queryset.filter(period_from__gte=period_from)
            if period_to:
                queryset = queryset.filter(period_to__lte=period_to)
            
            # Count before delete
            count = queryset.count()
            
            if count == 0:
                return Response({'message': 'No records found matching the criteria'}, status=status.HTTP_404_NOT_FOUND)
            
            # Delete
            queryset.delete()
            
            return Response({
                'message': f'Successfully deleted {count} record(s)',
                'deleted_count': count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def delete_by_batch(self, request):
        """Delete all records from a specific upload batch"""
        upload_batch = request.data.get('upload_batch')
        
        if not upload_batch:
            return Response({'error': 'upload_batch is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            deleted_count, _ = DebentureReconciliation.objects.filter(upload_batch=upload_batch).delete()
            return Response({
                'message': f'Successfully deleted {deleted_count} record(s) from batch {upload_batch}',
                'deleted_count': deleted_count,
                'batch': upload_batch
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def website_links(self, request):
        """Get company website links"""
        websites = [
            {'code': 'NRIC', 'name': 'Nepal Republic Insurance Co.', 'website': 'https://www.nric.com.np', 'type': 'Insurance'},
            {'code': 'NHPC', 'name': 'Nepal Hydro Poultry Company', 'website': 'https://www.nhpc.com.np', 'type': 'Hydropower'},
            {'code': 'NRCS', 'name': 'Nepal Red Cross Society', 'website': 'https://www.nrcs.org', 'type': 'Organization'},
            {'code': 'HIDCL', 'name': 'Hydropower Investment & Development Co.', 'website': 'https://www.hidcl.com', 'type': 'Hydropower'},
            {'code': 'SBL', 'name': 'Siddhartha Bank Limited', 'website': 'https://www.siddharthabank.com', 'type': 'Bank'},
            {'code': 'NYADI', 'name': 'Nyadi Hydropower Pvt. Ltd.', 'website': 'https://www.nyadihydropower.com', 'type': 'Hydropower'},
            {'code': 'NTC', 'name': 'Nepal Telecom', 'website': 'https://www.ntc.net.np', 'type': 'Telecom'},
            {'code': 'NABIL', 'name': 'Nabil Bank Limited', 'website': 'https://www.nabilbank.com', 'type': 'Bank'},
            {'code': 'CNRM', 'name': 'Centre for Nepal and Rural Migration', 'website': '#', 'type': 'Organization'},
            {'code': 'PRVU', 'name': 'Prabhu Youth Club', 'website': '#', 'type': 'Organization'},
            {'code': 'UNL', 'name': 'United Nepal Limited', 'website': '#', 'type': 'Corporate'},
            {'code': 'RBBL', 'name': 'Rastriya Banijya Bank Limited', 'website': 'https://www.rbbank.com.np', 'type': 'Bank'},
            {'code': 'UPPER', 'name': 'Upper Tamakoshi Hydropower', 'website': 'https://www.upper tamakoshi.com.np', 'type': 'Hydropower'},
            {'code': 'UPPER_COSMIC', 'name': 'Upper Cosmic Hydropower', 'website': '#', 'type': 'Hydropower'},
            {'code': 'SYNAPSE', 'name': 'Synapse Energy', 'website': 'https://www.synapseenergy.com.np', 'type': 'Hydropower'},
            {'code': 'PRIME', 'name': 'Prime Commercial Bank Ltd.', 'website': 'https://www.primebank.com.np', 'type': 'Bank'},
        ]
        
        active_companies = set(
            DebentureReconciliation.objects.values_list('company_code', flat=True).distinct()
        )
        
        result = []
        for w in websites:
            result.append({**w, 'has_data': w['code'] in active_companies})
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload debenture reconciliation Excel/CSV file
        
        Supports both formats:
        1. ORIGINAL sheet with KITTA column - auto-calculates interest
        2. PUBLIC sheet with pre-calculated interest columns
        """
        serializer = DebentureUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['file']
        company_code = serializer.validated_data['company_code']
        company_name = serializer.validated_data['company_name']
        report_title = serializer.validated_data.get('report_title', '')
        report_subtitle = serializer.validated_data.get('report_subtitle', '')
        period_from = serializer.validated_data.get('period_from', None)
        period_to = serializer.validated_data.get('period_to', None)
        period_days = serializer.validated_data.get('period_days', 0)
        interest_rate = float(serializer.validated_data.get('interest_rate', 8.75))
        tax_rate = float(serializer.validated_data.get('tax_rate', 6.00))

        # Fetch company defaults for sector and tax status
        try:
            company_obj = Company.objects.get(company_code=company_code)
            default_sector = company_obj.sector_type
            default_tax = company_obj.interest_tax_status
        except Company.DoesNotExist:
            default_sector = 'Public'
            default_tax = 'Taxable'

        upload_batch = str(uuid.uuid4())[:8]
        user = getattr(request, 'user_obj', None) or request.user
        
        # Smart company detection: map sheet names to company codes
        sheet_company_map = {}
        
        try:
            if not file.name.lower().endswith('.csv'):
                wb_temp = load_workbook(BytesIO(file.read()), data_only=True)
                for sn in wb_temp.sheetnames:
                    sheet_name_upper = sn.strip().upper()
                    matching = Company.objects.filter(company_code__iexact=sheet_name_upper)
                    if matching.exists():
                        sheet_company_map[sn] = matching.first().company_code
        except Exception:
            pass
        finally:
            try:
                file.seek(0)
            except Exception:
                pass
        
        try:
            data_rows = []
            sheet_company_code = company_code
            sheet_defaults = {
                'company_name': company_name,
                'sector': default_sector,
                'tax': default_tax,
            }
            
            if file.name.endswith('.csv'):
                content = file.read().decode('utf-8-sig')
                reader = csv.DictReader(StringIO(content))
                data_rows = list(reader)
                # Attach sheet metadata for CSV (single-sheet equivalent)
                for r in data_rows:
                    r['_sheet_company_code'] = sheet_company_code
                    r['_sheet_defaults'] = sheet_defaults
            else:
                wb = load_workbook(BytesIO(file.read()), data_only=True)
                
                # Aggregate data from ALL sheets in the workbook.
                # Scan every sheet for valid headers and combine the records.
                sheets_to_process = [wb[sn] for sn in wb.sheetnames]
                
                # Log sheet names for debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Processing Excel file with sheets: {wb.sheetnames}")

                # Define sheet name to sector/tax mapping for auto-detection
                def get_sheet_defaults(sheet_name, company_defaults):
                    """Auto-detect sector type and tax status from sheet name.
                    Modern approach: sheet names like PUBLIC, PRIVATE, FUND-TAX EXEMPTED
                    automatically map to correct sector/tax values without needing columns.
                    Falls back to company defaults if no match found.
                    """
                    sn = sheet_name.strip().upper()
                    
                    # Tax Exempted sheets (any name containing EXEMPT/EXEMP)
                    if any(kw in sn for kw in ['EXEMPT', 'EXEMP']):
                        return {
                            'company_name': company_defaults.get('company_name', ''),
                            'sector': 'Public',
                            'tax': 'Exempted'
                        }
                    
                    # Private sector sheets
                    if sn == 'PRIVATE' or 'PRIVATE' in sn:
                        return {
                            'company_name': company_defaults.get('company_name', ''),
                            'sector': 'Private',
                            'tax': 'Taxable'
                        }
                    
                    # Institution sheets
                    if 'INSTITUTION' in sn or 'INST' == sn:
                        return {
                            'company_name': company_defaults.get('company_name', ''),
                            'sector': 'Institution',
                            'tax': 'Taxable'
                        }
                    
                    # Government sheets
                    if 'GOVERNMENT' in sn or 'GOVT' in sn:
                        return {
                            'company_name': company_defaults.get('company_name', ''),
                            'sector': 'Government',
                            'tax': 'Taxable'
                        }
                    
                    # Public or Original sheets - use company defaults
                    # Original sheets contain all data mixed together
                    return company_defaults
                
                sheet_company_cache = {}
                
                for sheet in sheets_to_process:
                    sheet_name = sheet.title
                    if sheet_name in sheet_company_map:
                        sheet_company_code = sheet_company_map[sheet_name]
                    else:
                        sheet_company_code = company_code
                    
                    if sheet_company_code not in sheet_company_cache:
                        try:
                            comp_obj = Company.objects.get(company_code=sheet_company_code)
                            sheet_company_cache[sheet_company_code] = {
                                'company_name': comp_obj.company_name,
                                'sector': comp_obj.sector_type or 'Public',
                                'tax': comp_obj.interest_tax_status or 'Taxable'
                            }
                        except Company.DoesNotExist:
                            sheet_company_cache[sheet_company_code] = {
                                'company_name': sheet_company_code,
                                'sector': 'Public',
                                'tax': 'Taxable'
                            }
                    company_defaults = sheet_company_cache[sheet_company_code]
                    # Override per-sheet using smart sheet name detection
                    sheet_defaults = get_sheet_defaults(sheet_name, company_defaults)
                    
                    header_found_in_sheet = False
                    # Search for header row in each sheet (within first 20 rows)
                    max_r = min(20, (sheet.max_row or 0))
                    max_c = min(10, (sheet.max_column or 0))
                    
                    for r_idx in range(1, max_r + 1):
                        # Check first few columns for Serial Number header marker
                        for c_idx in range(1, max_c + 1):
                            val = sheet.cell(row=r_idx, column=c_idx).value
                            if val and str(val).strip().upper() in ('S.NO', 'S.N', 'SN', 'S.N.', 'SNO'):
                                headers = [sheet.cell(row=r_idx, column=c).value for c in range(1, (sheet.max_column or 0) + 1)]
                                for row in sheet.iter_rows(min_row=r_idx + 1, values_only=True):
                                    # Keep row if it's not entirely empty
                                    if row and any(cell is not None for cell in row):
                                        rec = dict(zip(headers, row))
                                        rec['_sheet_company_code'] = sheet_company_code
                                        rec['_sheet_defaults'] = sheet_defaults
                                        data_rows.append(rec)
                                header_found_in_sheet = True
                                break
                        if header_found_in_sheet:
                            break
                    
                    # Fallback for sheets without explicit S.N header (tries row 1 as header)
                    if not header_found_in_sheet and sheet.max_row > 1:
                        headers = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
                        # Verify headers look like data (contain Name or BOID keywords)
                        if any(h and ('NAME' in str(h).upper() or 'BOID' in str(h).upper()) for h in headers):
                            for row in sheet.iter_rows(min_row=2, values_only=True):
                                if row and row[0] is not None:
                                    rec = dict(zip(headers, row))
                                    rec['_sheet_company_code'] = sheet_company_code
                                    rec['_sheet_defaults'] = sheet_defaults
                                    data_rows.append(rec)
            
            if not data_rows:
                return Response({'error': 'No data rows found in Excel file. Please check the file format.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Auto-calculate period_days from from/to dates
            if period_from and period_to and not period_days:
                period_days = (period_to - period_from).days
            
            created = 0
            errors = []
            batch_records = []
            
            # Detect column mapping across ALL sheets (union of headers)
            if not data_rows:
                return Response({'error': 'No data rows found in Excel file. Please check the file format.'}, status=status.HTTP_400_BAD_REQUEST)

            # Build a union of all header keys present in any row
            all_header_keys = []
            seen = set()
            for r in data_rows:
                for k in r.keys():
                    if k and k not in seen and not str(k).startswith('_'):
                        seen.add(k)
                        all_header_keys.append(k)
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Detected columns: {all_header_keys}")
            
            def normalize_header(header_str):
                if header_str is None:
                    return ""
                # Remove spaces, dots, and underscores for robust matching
                return str(header_str).strip().lower().replace(' ', '').replace('.', '').replace('_', '')

            def find_col(*aliases): # Returns the original header string from the file (searches all sheets)
                for a in aliases:
                    normalized_alias = normalize_header(a)
                    for k_raw in all_header_keys:
                        if k_raw is None: continue
                        normalized_k = normalize_header(k_raw)
                        if normalized_alias in normalized_k:
                            return k_raw
                return None
            
            sn_col = find_col('S.NO', 'S.N', 'SN', 'SERIAL', 'SNO')
            boid_col = find_col('BOID', 'BENEFICIAL', 'B/O')
            name_col = find_col('APPLICANT_NAME', 'NAME', 'APPLICANT')
            father_col = find_col('FATHER', 'FATHERS NAME', 'FATHER_NAME')
            grandfa_col = find_col('GRANDFATHER', 'GRANDFATHERS NAME', 'SPOUSE')
            cit_col = find_col('CITIZENSHIP', 'CITIZEN')
            issued_col = find_col('ISSUED', 'DISTRICT')
            qty_col = find_col('ALLOTED', 'QUANTITY', 'UNITS', 'SHARES', 'KITTA')
            amt_col = find_col('AMOUNT', 'Amount')
            bank_code_col = find_col('BANK CODE', 'BANK_CODE')
            bank_col = find_col('BANK NAME', 'BANK')
            acct_col = find_col('BANK ACCOUNT', 'ACCOUNT', 'ACCOUNT NUMBER', 'BANK AC')
            lot_col = find_col('LOT')
            status_col = find_col('STATUS')
            date_col = find_col('APPROVED DATE', 'APPROVED')
            remarks_col = find_col('REMARKS')
            roundup_col = find_col('ROUNDUP', 'NET PAYABLE')
            interest_col = find_col('INTEREST-Pumori', 'INTEREST', 'PERIOD', 'GROSS INT', 'INT. @')
            tax_amt_col = find_col('TAX', 'TDS')
            net_col = find_col('NET INTEREST', 'NET_PAYABLE')
            ann_int_col = find_col('INT. @', 'ANNUAL', 'ANNUAL INTEREST')
            daily_int_col = find_col('INT. PER DAY', 'DAILY', 'DAILY INTEREST')
            kitta_col = find_col('KITTA')  # Specific for PRIME style
            sector_col = find_col('SECTOR', 'SECTOR TYPE', 'TYPE')
            tax_status_col = find_col('TAX STATUS', 'TAXABILITY')
            
            with transaction.atomic():
                for idx, row in enumerate(data_rows):
                    try:
                        # Use sheet-specific company code and defaults attached when rows were collected
                        sheet_company_code = row.get('_sheet_company_code', company_code)
                        sheet_defaults = row.get('_sheet_defaults', sheet_defaults)
                        sn_val = row.get(sn_col) if sn_col else None
                        # Skip row if S.N. is None or empty string after stripping
                        if sn_val is None or (isinstance(sn_val, str) and sn_val.strip() == ''):
                            continue
                        try:
                            sn = int(float(str(sn_val).strip()))
                        except (ValueError, TypeError):
                            errors.append(f"Row {idx + 2}: Invalid S.N value '{sn_val}'. Skipping this row.")
                            continue # Skip this row if S.N is invalid
                        def safe_decimal(val, default=0):
                            if val is None: return default
                            str_val = str(val).replace(',', '')
                            # Handle formula cell artifacts like [object Object]
                            if 'object' in str_val.lower() or not str_val.replace('.', '').replace('-', '').isdigit():
                                return default
                            try: return float(str_val)
                            except: return default
                        
                        def safe_str(val):
                            if val is None: return ''
                            return str(val).strip()
                        
                        # Get kitta/quantity
                        alloted_qty = safe_decimal(row.get(qty_col))
                        
                        # Calculate amount: KITTA * 1000 if amount not provided
                        amount = safe_decimal(row.get(amt_col))
                        if amount == 0 and alloted_qty > 0:
                            amount = alloted_qty * 1000
                        elif amount == 0:
                            amount = alloted_qty * 1000
                        
                        # Normalize sector and tax status from upload row (per-row defaults)
                        # Coerce to string and fall back to this row's sheet defaults safely
                        sector_val = safe_str(row.get(sector_col)) or (sheet_defaults.get('sector') or '')
                        sv_lower = sector_val.lower() if sector_val else ''
                        if 'priv' in sv_lower: sector_val = 'Private'
                        elif 'pub' in sv_lower: sector_val = 'Public'
                        elif 'inst' in sv_lower: sector_val = 'Institution'
                        elif 'gov' in sv_lower: sector_val = 'Government'

                        tax_status_val = safe_str(row.get(tax_status_col)) or (sheet_defaults.get('tax') or '')
                        tv_lower = tax_status_val.lower() if tax_status_val else ''
                        if 'exempt' in tv_lower:
                            tax_status_val = 'Exempted'
                        elif 'taxable' in tv_lower:
                            tax_status_val = 'Taxable'

                        # Calculate or get annual interest
                        annual_interest = safe_decimal(row.get(ann_int_col))
                        if annual_interest == 0 and amount > 0 and interest_rate > 0:
                            annual_interest = round(amount * interest_rate / 100, 4)
                        
                        # Calculate or get daily interest
                        daily_interest = safe_decimal(row.get(daily_int_col))
                        if daily_interest == 0 and annual_interest > 0:
                            daily_interest = round(annual_interest / 365, 6)
                        
                        # Calculate or get period interest
                        period_interest = safe_decimal(row.get(interest_col))
                        if period_interest == 0 and amount > 0 and interest_rate > 0 and period_days > 0:
                            period_interest = round(amount * (interest_rate / 100) * period_days / 365, 4)
                        
                        # Calculate or get tax
                        tax = safe_decimal(row.get(tax_amt_col))
                        if tax == 0 and period_interest > 0 and tax_rate > 0:
                            tax = round(period_interest * (tax_rate / 100), 4)
                        
                        # Calculate or get net interest
                        net_interest = safe_decimal(row.get(net_col))
                        if net_interest == 0 and period_interest > 0:
                            net_interest = round(period_interest - tax, 4)
                        
                        # Calculate or get roundup
                        roundup = safe_decimal(row.get(roundup_col))
                        if roundup == 0 and net_interest > 0:
                            roundup = round(net_interest, 2)
                        
                        rec = DebentureReconciliation(
                            company_code=sheet_company_code,
                            company_name=sheet_defaults.get('company_name', sheet_company_code),
                            report_title=report_title,
                            report_subtitle=report_subtitle,
                            sn=sn,
                            boid=safe_str(row.get(boid_col)),
                            applicant_name=safe_str(row.get(name_col)),
                            father_mother_name=safe_str(row.get(father_col)),
                            grandfather_spouse_name=safe_str(row.get(grandfa_col)),
                            citizenship_number=safe_str(row.get(cit_col)),
                            issued_from=safe_str(row.get(issued_col)),
                            alloted_quantity=alloted_qty,
                            amount=amount,
                            annual_interest=annual_interest,
                            daily_interest=daily_interest,
                            period_interest=period_interest,
                            tax=tax,
                            net_interest_payable=net_interest,
                            roundup=roundup,
                            bank_code=safe_str(row.get(bank_code_col)),
                            bank_name=safe_str(row.get(bank_col)),
                            account_number=safe_str(row.get(acct_col)),
                            lot=safe_str(row.get(lot_col)),
                            sector_type=sector_val,
                            tax_status=tax_status_val,
                            status=safe_str(row.get(status_col)).upper() or 'SUCCESS',
                            approved_date=None,
                            remarks=safe_str(row.get(remarks_col)),
                            period_from=period_from,
                            period_to=period_to,
                            period_days=period_days or 0,
                            interest_rate=interest_rate,
                            tax_rate=tax_rate,
                            upload_batch=upload_batch,
                            created_by=user,
                        )
                        
                        # Try to parse approved date
                        date_val = row.get(date_col) if date_col else None
                        if date_val:
                            try:
                                if isinstance(date_val, datetime):
                                    rec.approved_date = date_val.date()
                                elif isinstance(date_val, date):
                                    rec.approved_date = date_val
                                else:
                                    d_str = str(date_val).strip()
                                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d']:
                                        try:
                                            rec.approved_date = datetime.strptime(d_str, fmt).date()
                                            break
                                        except:
                                            pass
                            except:
                                pass
                        
                        batch_records.append(rec)
                        created += 1
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error processing row {idx + 2}: {str(e)}", exc_info=True)
                        errors.append(f"Row {idx + 2}: {str(e)}")
                
                if batch_records:
                    DebentureReconciliation.objects.bulk_create(batch_records, ignore_conflicts=True)
            
            return Response({
                'message': 'Upload completed',
                'created': created,
                'errors': errors,
                'upload_batch': upload_batch,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Upload failed with exception: {str(e)}", exc_info=True)
            error_detail = traceback.format_exc()
            return Response(
                {'error': f'Error processing file: {str(e)}', 'detail': error_detail},
                status=status.HTTP_400_BAD_REQUEST
            )

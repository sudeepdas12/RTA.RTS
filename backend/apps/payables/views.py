from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum
from openpyxl import load_workbook
import csv
from io import BytesIO, StringIO
from datetime import datetime, date

from .models import InterestPayable, DividendPayable
from .serializers import (
    InterestPayableSerializer, DividendPayableSerializer, PayableUploadSerializer
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
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by on creation"""
        serializer.save(created_by=self.request.user_obj)
    
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
                    
                    gross = float(row['gross_interest'])
                    tax = float(row['tax_amount'])
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
                    
                    InterestPayable.objects.create(
                        company=company,
                        client=client,
                        instrument_ref=str(row.get('instrument_ref', '')).strip() or None,
                        gross_interest=gross,
                        tax_amount=tax,
                        net_payable=net,
                        due_date=due_date,
                        created_by=request.user_obj
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
            'gross_interest', 'tax_amount', 'due_date'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001', 'CL001', 'BOND-2024-001', 50000, 7500, '2026-03-15'],
            ['COMP002', 'CL002', 'DEB-2024-002', 100000, 15000, '2026-03-30'],
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

        # Date range filter (payment_date)
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)

        if from_date:
            queryset = queryset.filter(payment_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(payment_date__lte=to_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by on creation"""
        serializer.save(created_by=self.request.user_obj)
    
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
                    
                    shares = float(row['shares_held'])
                    gross = float(row['gross_dividend'])
                    tax = float(row['tax_amount'])
                    net = gross - tax
                    
                    DividendPayable.objects.create(
                        company=company,
                        client=client,
                        shares_held=shares,
                        gross_dividend=gross,
                        tax_amount=tax,
                        net_payable=net,
                        fiscal_year=str(row.get('fiscal_year', '')).strip() or None,
                        created_by=request.user_obj
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
            'gross_dividend', 'tax_amount', 'fiscal_year'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001', 'CL001', 1000, 50000, 7500, '2080/81'],
            ['COMP002', 'CL002', 2500, 125000, 18750, '2080/81'],
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

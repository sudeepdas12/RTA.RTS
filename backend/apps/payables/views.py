from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from django.db.models import Q, Sum, QuerySet
from io import BytesIO
from datetime import date
from typing import cast

from .models import InterestPayable, DividendPayable
from .serializers import (
    InterestPayableSerializer, DividendPayableSerializer, PayableUploadSerializer
)
from .upload_utils import (
    load_upload_rows,
    missing_columns,
    normalize_payment_status,
    parse_date,
    resolve_client,
    resolve_company,
    to_float,
)
from apps.users.permissions import HasPermission


class InterestPayableViewSet(viewsets.ModelViewSet):
    """ViewSet for Interest Payable CRUD operations"""
    
    queryset = InterestPayable.objects.select_related('company', 'client').all()
    serializer_class = InterestPayableSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'interest_payables'
    
    def get_queryset(self) -> QuerySet[InterestPayable]:
        """Filter interest payables"""
        queryset = InterestPayable.objects.select_related('company', 'client').all()
        request = cast(Request, self.request)
        fiscal_year = request.query_params.get('fiscal_year')
        
        # Company filter
        company_id = request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Client filter (by id) or BOID
        client_id = request.query_params.get('client', None)
        boid = request.query_params.get('boid', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if boid:
            queryset = queryset.filter(client__boid__iexact=boid.strip())
        
        # Payment status filter
        payment_status = request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        # Date range filter
        from_date = request.query_params.get('from_date', None)
        to_date = request.query_params.get('to_date', None)
        
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
        user = getattr(self.request, 'user_obj', None) or self.request.user
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Bulk upload interest payables from Excel/CSV"""
        serializer = PayableUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data.get('file')
        if file is None:
            return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = load_upload_rows(file)
            
            # Expected columns; BOID or client_code must be present
            required_cols = ['company_code', 'gross_interest', 'tax_amount', 'due_date']
            if not data:
                return Response({'error': 'No data found in file'}, status=status.HTTP_400_BAD_REQUEST)
            
            missing_cols = missing_columns(data, required_cols)
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

                    client = resolve_client(row, index, errors)
                    if not client:
                        continue

                    company = resolve_company(company_code, index, errors)
                    if not company:
                        continue

                    # compute gross/tax/net
                    # gross may be provided under different column names
                    gross_raw = row.get('gross_interest') or row.get('Amount') or row.get('INT.@7%') or 0
                    gross = to_float(gross_raw)

                    # tax_amount may be numeric or the string 'TAX EXEMPTED'
                    tax_raw = row.get('tax_amount') or row.get('TAX') or row.get('TAX@15')
                    tax_exempt_flag = False
                    if isinstance(tax_raw, str) and 'EXEMPT' in tax_raw.upper():
                        tax = 0.0
                        tax_exempt_flag = True
                    else:
                        tax = to_float(tax_raw or 0)

                    net = gross - tax

                    # optional public-sector/institution columns
                    allotted_qty = row.get('allotted_quantity')
                    principal = row.get('Amount') or row.get('principal_amount')
                    rate = row.get('INT.@7%') or row.get('interest_rate')
                    per_day = row.get('INT. PER DAY') or row.get('interest_per_day')
                    pumori = row.get('INTEREST-Pumori') or row.get('interest_pumori')
                    tax_rate_val = row.get('TAX@15') or row.get('tax_rate')
                    bank_code = row.get('BANK CODE')
                    bank = row.get('BANK')
                    acct = row.get('ACCOUNT_NUMBER')
                    lot = row.get('LOT')
                    approved = row.get('APPROVED DATE')
                    remarks = row.get('REMARKS')

                    due_date = parse_date(row.get('due_date'))
                    if due_date is None:
                        errors.append(f"Row {index + 2}: Invalid due date format")
                        continue
                    
                    payment_status = normalize_payment_status(row.get('payment_status'), valid_status)
                    if payment_status is None:
                        raw_status = str(row.get('payment_status', '')).strip() or 'Pending'
                        errors.append(f"Row {index + 2}: Invalid payment_status '{raw_status}'")
                        continue

                    user = getattr(request, 'user_obj', None) or request.user
                    InterestPayable.objects.create(
                        company=company,
                        client=client,
                        instrument_ref=str(row.get('instrument_ref', '')).strip() or None,
                        # extras
                        allotted_quantity=allotted_qty or None,
                        principal_amount=to_float(principal) if principal else None,
                        interest_rate=to_float(rate) if rate else None,
                        interest_per_day=to_float(per_day) if per_day else None,
                        interest_pumori=to_float(pumori) if pumori else None,
                        tax_rate=to_float(tax_rate_val) if tax_rate_val else None,
                        tax_exempted=tax_exempt_flag,
                        bank_code=bank_code or None,
                        bank_name=bank or None,
                        account_number=acct or None,
                        lot=lot or None,
                        approved_date=parse_date(approved, formats=('%Y-%m-%d',)) if approved else None,
                        remarks=str(remarks).strip() if remarks else None,
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
            'company_code', 'client_code', 'boid', 'instrument_ref',
            'allotted_quantity', 'Amount', 'INT.@7%', 'INT. PER DAY', 'INTEREST-Pumori',
            'TAX@15', 'tax_amount', 'tax_exempted', 'due_date', 'payment_status',
            'BANK CODE', 'BANK', 'ACCOUNT_NUMBER', 'LOT', 'APPROVED DATE', 'REMARKS'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001','CL001','BOID-CL001','BOND-2024-001',50,50000,7,9.59,709.59,10.29259,58324.67,False,'2025-07-18','Pending','0201','Rastriya Banijya Bank Ltd.','01430100003178001','SUCCESS','2025-07-18','Sample remark'],
            ['COMP002','CL002','BOID-CL002','DEB-2024-002',200,200000,7,38.36,2838.36,51.46507,291635.42,True,'2025-07-18','Paid','0201','Rastriya Banijya Bank Ltd.','2460100000326001','SUCCESS','2025-07-18','Another remark'],
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

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update payment status for multiple interest payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        new_status = data.get('status')
        
        if not payload_ids or not new_status:
            return Response(
                {'error': 'ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in ['Pending', 'Paid', 'Partial']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                updated = InterestPayable.objects.filter(
                    interest_id__in=payload_ids
                ).update(payment_status=new_status)
                
                return Response({
                    'success': True,
                    'updated_count': updated,
                    'message': f'{updated} interest payables updated'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete interest payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        
        if not payload_ids:
            return Response(
                {'error': 'ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                deleted_count, _ = InterestPayable.objects.filter(
                    interest_id__in=payload_ids
                ).delete()
                
                return Response({
                    'success': True,
                    'deleted_count': deleted_count,
                    'message': f'{deleted_count} interest payables deleted'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def bulk_record_payment(self, request):
        """Bulk record payment for multiple interest payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        payment_date = data.get('payment_date')
        reference = data.get('reference', '')
        
        if not payload_ids or not payment_date:
            return Response(
                {'error': 'ids and payment_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                updated = InterestPayable.objects.filter(
                    interest_id__in=payload_ids
                ).update(
                    payment_status='Paid',
                    paid_date=payment_date,
                    remarks=reference
                )
                
                return Response({
                    'success': True,
                    'updated_count': updated,
                    'message': f'Payment recorded for {updated} interest payables'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DividendPayableViewSet(viewsets.ModelViewSet):
    """ViewSet for Dividend Payable CRUD operations"""
    
    queryset = DividendPayable.objects.select_related('company', 'client').all()
    serializer_class = DividendPayableSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'dividend_payables'
    
    def get_queryset(self) -> QuerySet[DividendPayable]:
        """Filter dividend payables"""
        queryset = DividendPayable.objects.select_related('company', 'client').all()
        request = cast(Request, self.request)
        
        # Company filter
        company_id = request.query_params.get('company', None)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Client filter (by id) or BOID
        client_id = request.query_params.get('client', None)
        boid = request.query_params.get('boid', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if boid:
            queryset = queryset.filter(client__boid__iexact=boid.strip())
        
        # Payment status filter
        payment_status = request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        # Fiscal year filter
        fiscal_year = request.query_params.get('fiscal_year', None)
        if fiscal_year:
            queryset = queryset.filter(fiscal_year=fiscal_year)

        # Date range filter (created_at)
        from_date = request.query_params.get('from_date', None)
        to_date = request.query_params.get('to_date', None)

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
        
        file = serializer.validated_data.get('file')
        if file is None:
            return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = load_upload_rows(file)
            
            # Expected columns; BOID or client_code must be present
            required_cols = ['company_code', 'shares_held', 'gross_dividend', 'tax_amount']
            if not data:
                return Response({'error': 'No data found in file'}, status=status.HTTP_400_BAD_REQUEST)
            
            missing_cols = missing_columns(data, required_cols)
            
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
                    client = resolve_client(row, index, errors)
                    if not client:
                        continue

                    company = resolve_company(company_code, index, errors)
                    if not company:
                        continue
                    
                    shares = to_float(row.get('shares_held') or 0)
                    gross = to_float(row.get('gross_dividend') or 0)
                    # tax_amount may be numeric or the string 'TAX EXEMPTED'
                    tax_raw = row.get('tax_amount') or row.get('TAX')
                    if isinstance(tax_raw, str) and 'EXEMPT' in tax_raw.upper():
                        tax = 0.0
                    else:
                        tax = to_float(tax_raw or 0)
                    net = gross - tax

                    payment_status = normalize_payment_status(row.get('payment_status'), valid_status)
                    if payment_status is None:
                        raw_status = str(row.get('payment_status', '')).strip() or 'Pending'
                        errors.append(f"Row {index + 2}: Invalid payment_status '{raw_status}'")
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
            'company_code', 'client_code', 'boid', 'shares_held',
            'gross_dividend', 'tax_amount', 'fiscal_year', 'payment_status'
        ]
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        sample_data = [
            ['COMP001', 'CL001', 'BOID-CL001', 1000, 50000, 7500, '2080/81', 'Paid'],
            ['COMP002', 'CL002', 'BOID-CL002', 2500, 125000, 18750, '2080/81', 'Pending'],
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

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update payment status for multiple dividend payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        new_status = data.get('status')
        
        if not payload_ids or not new_status:
            return Response(
                {'error': 'ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in ['Pending', 'Paid', 'Partial']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                updated = DividendPayable.objects.filter(
                    dividend_id__in=payload_ids
                ).update(payment_status=new_status)
                
                return Response({
                    'success': True,
                    'updated_count': updated,
                    'message': f'{updated} dividend payables updated'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete dividend payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        
        if not payload_ids:
            return Response(
                {'error': 'ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                deleted_count, _ = DividendPayable.objects.filter(
                    dividend_id__in=payload_ids
                ).delete()
                
                return Response({
                    'success': True,
                    'deleted_count': deleted_count,
                    'message': f'{deleted_count} dividend payables deleted'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def bulk_record_payment(self, request):
        """Bulk record payment for multiple dividend payables"""
        from django.db import transaction
        
        data = request.data
        payload_ids = data.get('ids', [])
        payment_date = data.get('payment_date')
        reference = data.get('reference', '')
        
        if not payload_ids or not payment_date:
            return Response(
                {'error': 'ids and payment_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                updated = DividendPayable.objects.filter(
                    dividend_id__in=payload_ids
                ).update(
                    payment_status='Paid',
                    paid_date=payment_date,
                    remarks=reference
                )
                
                return Response({
                    'success': True,
                    'updated_count': updated,
                    'message': f'Payment recorded for {updated} dividend payables'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

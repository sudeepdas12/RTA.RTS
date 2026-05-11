from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
import xlsxwriter
from io import BytesIO
from datetime import datetime

from apps.payables.models import InterestPayable, DividendPayable
from apps.reconciliation.models import Reconciliation
from apps.companies.models import Company
from apps.clients.models import Client


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Get dashboard summary data"""
    
    # Interest payables summary
    interest_summary = InterestPayable.objects.aggregate(
        total_gross=Sum('gross_interest'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable'),
        paid=Sum('net_payable', filter=Q(payment_status='Paid')),
        partial=Sum('net_payable', filter=Q(payment_status='Partial')),
        pending=Sum('net_payable', filter=Q(payment_status='Pending')),
        total_count=Count('interest_id')
    )
    
    # Dividend payables summary
    dividend_summary = DividendPayable.objects.aggregate(
        total_gross=Sum('gross_dividend'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable'),
        paid=Sum('net_payable', filter=Q(payment_status='Paid')),
        partial=Sum('net_payable', filter=Q(payment_status='Partial')),
        pending=Sum('net_payable', filter=Q(payment_status='Pending')),
        total_count=Count('dividend_id')
    )
    
    # Company-wise interest payables
    company_interest = InterestPayable.objects.values(
        'company__company_name'
    ).annotate(
        total=Sum('net_payable')
    ).order_by('-total')
    
    # Company-wise dividend payables
    company_dividend = DividendPayable.objects.values(
        'company__company_name'
    ).annotate(
        total=Sum('net_payable')
    ).order_by('-total')
    
    # Master data counts
    total_companies = Company.objects.filter(status='Active').count()
    total_clients = Client.objects.filter(status='Active').count()
    
    return Response({
        'interest': {
            'total_gross': interest_summary['total_gross'] or 0,
            'total_tax': interest_summary['total_tax'] or 0,
            'total_net': interest_summary['total_net'] or 0,
            'paid': interest_summary['paid'] or 0,
            'partial': interest_summary['partial'] or 0,
            'pending': interest_summary['pending'] or 0,
            'count': interest_summary['total_count'] or 0
        },
        'dividend': {
            'total_gross': dividend_summary['total_gross'] or 0,
            'total_tax': dividend_summary['total_tax'] or 0,
            'total_net': dividend_summary['total_net'] or 0,
            'paid': dividend_summary['paid'] or 0,
            'partial': dividend_summary['partial'] or 0,
            'pending': dividend_summary['pending'] or 0,
            'count': dividend_summary['total_count'] or 0
        },
        'company_interest': list(company_interest),
        'company_dividend': list(company_dividend),
        'total_companies': total_companies,
        'total_clients': total_clients
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_interest_report(request):
    """Export interest payables report to Excel"""
    
    # Get query parameters
    company_id = request.GET.get('company', None)
    client_id = request.GET.get('client', None)
    payment_status = request.GET.get('payment_status', None)
    from_date = request.GET.get('from_date', None)
    to_date = request.GET.get('to_date', None)
    fiscal_year = request.GET.get('fiscal_year')
    
    # Build queryset
    queryset = InterestPayable.objects.select_related('company', 'client').all()
    
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)
    if from_date:
        queryset = queryset.filter(due_date__gte=from_date)
    if to_date:
        queryset = queryset.filter(due_date__lte=to_date)
    if fiscal_year:
        try:
            start_year = int(fiscal_year.split('/')[0])
            end_year = int(fiscal_year.split('/')[1])
            start_date = datetime(start_year, 7, 1).date()
            end_date = datetime(end_year, 6, 30).date()
            queryset = queryset.filter(due_date__range=(start_date, end_date))
        except Exception:
            pass
    
    # Create Excel file
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet('Interest Payables')
    
    # Formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#4472C4',
        'font_color': 'white',
        'border': 1
    })
    
    number_format = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    date_format = workbook.add_format({'num_format': 'yyyy-mm-dd', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    
    # Headers
    headers = [
        'Interest ID', 'Company Code', 'Company Name', 'Client Code', 'Client BOID', 'Client Name',
        'Instrument Ref', 'Gross Interest', 'Tax Amount', 'Net Payable',
        'Due Date', 'Fiscal Year', 'Payment Status', 'Payment Date', 'Payment Reference'
    ]
    
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    # Data
    row = 1
    for payable in queryset:
        worksheet.write(row, 0, payable.interest_id, cell_format)
        worksheet.write(row, 1, payable.company.company_code, cell_format)
        worksheet.write(row, 2, payable.company.company_name, cell_format)
        worksheet.write(row, 3, payable.client.client_code, cell_format)
        worksheet.write(row, 4, payable.client.boid or '', cell_format)
        worksheet.write(row, 5, payable.client.full_name, cell_format)
        worksheet.write(row, 6, payable.instrument_ref or '', cell_format)
        worksheet.write(row, 7, float(payable.gross_interest), number_format)
        worksheet.write(row, 8, float(payable.tax_amount), number_format)
        worksheet.write(row, 9, float(payable.net_payable), number_format)
        worksheet.write(row, 10, payable.due_date.strftime('%Y-%m-%d'), date_format)
        fiscal_year_value = f"{payable.due_date.year}/{payable.due_date.year + 1}" if payable.due_date.month >= 7 else f"{payable.due_date.year - 1}/{payable.due_date.year}"
        worksheet.write(row, 11, fiscal_year_value, cell_format)
        worksheet.write(row, 12, payable.payment_status, cell_format)
        worksheet.write(row, 13, payable.payment_date.strftime('%Y-%m-%d') if payable.payment_date else '', date_format)
        worksheet.write(row, 14, payable.payment_reference or '', cell_format)
        row += 1
    
    # Totals
    totals = queryset.aggregate(
        total_gross=Sum('gross_interest'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable')
    )
    
    worksheet.write(row, 6, 'TOTAL:', header_format)
    worksheet.write(row, 7, float(totals['total_gross'] or 0), number_format)
    worksheet.write(row, 8, float(totals['total_tax'] or 0), number_format)
    worksheet.write(row, 9, float(totals['total_net'] or 0), number_format)
    
    workbook.close()
    output.seek(0)
    
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=interest_payables_{datetime.now().strftime("%Y%m%d")}.xlsx'
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_summary(request):
    """Aggregate interest payables by company sector type for summary report."""
    # apply same filters as other endpoints if needed
    qs = InterestPayable.objects.select_related('company').all()

    # optional date range/fiscal filter
    company_id = request.GET.get('company')
    company_name = request.GET.get('company_name')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    fiscal_year = request.GET.get('fiscal_year')
    if company_id:
        qs = qs.filter(company_id=company_id)
    if company_name and company_name.lower() != 'all':
        qs = qs.filter(company__company_name=company_name)
    if from_date:
        qs = qs.filter(due_date__gte=from_date)
    if to_date:
        qs = qs.filter(due_date__lte=to_date)
    if fiscal_year:
        try:
            start_year = int(fiscal_year.split('/')[0])
            end_year = int(fiscal_year.split('/')[1])
            start_date = datetime(start_year, 7, 1).date()
            end_date = datetime(end_year, 6, 30).date()
            qs = qs.filter(due_date__range=(start_date, end_date))
        except Exception:
            pass

    data = qs.values(sector=F('company__sector_type')).annotate(
        kitta=Sum('allotted_quantity'),
        amount=Sum('principal_amount'),
        gross=Sum('gross_interest'),
        per_day=Sum('interest_per_day'),
        pumori=Sum('interest_pumori'),
        tax=Sum('tax_amount'),
        net=Sum('net_payable')
    )

    # compute grand totals
    totals = qs.aggregate(
        kitta=Sum('allotted_quantity'),
        amount=Sum('principal_amount'),
        gross=Sum('gross_interest'),
        per_day=Sum('interest_per_day'),
        pumori=Sum('interest_pumori'),
        tax=Sum('tax_amount'),
        net=Sum('net_payable')
    )

    return Response({'rows': list(data), 'totals': totals})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_sector_summary(request):
    """Export sector summary to Excel file"""
    qs = InterestPayable.objects.select_related('company').all()

    # filters (same as sector_summary)
    company_id = request.GET.get('company')
    company_name = request.GET.get('company_name')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    fiscal_year = request.GET.get('fiscal_year')
    if company_id:
        qs = qs.filter(company_id=company_id)
    if company_name and company_name.lower() != 'all':
        qs = qs.filter(company__company_name=company_name)
    if from_date:
        qs = qs.filter(due_date__gte=from_date)
    if to_date:
        qs = qs.filter(due_date__lte=to_date)
    if fiscal_year:
        try:
            start_year = int(fiscal_year.split('/')[0])
            end_year = int(fiscal_year.split('/')[1])
            start_date = datetime(start_year, 7, 1).date()
            end_date = datetime(end_year, 6, 30).date()
            qs = qs.filter(due_date__range=(start_date, end_date))
        except Exception:
            pass

    data = qs.values(sector=F('company__sector_type')).annotate(
        kitta=Sum('allotted_quantity'),
        amount=Sum('principal_amount'),
        gross=Sum('gross_interest'),
        per_day=Sum('interest_per_day'),
        pumori=Sum('interest_pumori'),
        tax=Sum('tax_amount'),
        net=Sum('net_payable')
    )

    totals = qs.aggregate(
        kitta=Sum('allotted_quantity'),
        amount=Sum('principal_amount'),
        gross=Sum('gross_interest'),
        per_day=Sum('interest_per_day'),
        pumori=Sum('interest_pumori'),
        tax=Sum('tax_amount'),
        net=Sum('net_payable')
    )

    # build excel
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet('Sector Summary')

    header_fmt = workbook.add_format({
        'bold': True,
        'bg_color': '#4472C4',
        'font_color': 'white',
        'border': 1
    })
    num_fmt = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    cell_fmt = workbook.add_format({'border': 1})

    headers = ['Sector', 'Allotted Qty', 'Principal Amount', 'Gross Interest', 'Interest/Day', 'Interest/Pumori', 'Tax', 'Net']
    for col, h in enumerate(headers):
        worksheet.write(0, col, h, header_fmt)

    row = 1
    for r in data:
        worksheet.write(row, 0, r['sector'] or '', cell_fmt)
        worksheet.write(row, 1, float(r['kitta'] or 0), num_fmt)
        worksheet.write(row, 2, float(r['amount'] or 0), num_fmt)
        worksheet.write(row, 3, float(r['gross'] or 0), num_fmt)
        worksheet.write(row, 4, float(r['per_day'] or 0), num_fmt)
        worksheet.write(row, 5, float(r['pumori'] or 0), num_fmt)
        worksheet.write(row, 6, float(r['tax'] or 0), num_fmt)
        worksheet.write(row, 7, float(r['net'] or 0), num_fmt)
        row += 1

    # totals row
    worksheet.write(row, 0, 'TOTAL', header_fmt)
    worksheet.write(row, 1, float(totals['kitta'] or 0), num_fmt)
    worksheet.write(row, 2, float(totals['amount'] or 0), num_fmt)
    worksheet.write(row, 3, float(totals['gross'] or 0), num_fmt)
    worksheet.write(row, 4, float(totals['per_day'] or 0), num_fmt)
    worksheet.write(row, 5, float(totals['pumori'] or 0), num_fmt)
    worksheet.write(row, 6, float(totals['tax'] or 0), num_fmt)
    worksheet.write(row, 7, float(totals['net'] or 0), num_fmt)

    workbook.close()
    output.seek(0)
    response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename=sector_summary_{datetime.now().strftime("%Y%m%d")}.xlsx'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_dividend_report(request):
    """Export dividend payables report to Excel"""
    
    # Get query parameters
    company_id = request.GET.get('company', None)
    client_id = request.GET.get('client', None)
    payment_status = request.GET.get('payment_status', None)
    fiscal_year = request.GET.get('fiscal_year', None)
    from_date = request.GET.get('from_date', None)
    to_date = request.GET.get('to_date', None)
    
    # Build queryset
    queryset = DividendPayable.objects.select_related('company', 'client').all()
    
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)
    if fiscal_year:
        queryset = queryset.filter(fiscal_year=fiscal_year)
    if from_date:
        queryset = queryset.filter(payment_date__gte=from_date)
    if to_date:
        queryset = queryset.filter(payment_date__lte=to_date)
    
    # Create Excel file
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet('Dividend Payables')
    
    # Formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#4472C4',
        'font_color': 'white',
        'border': 1
    })
    
    number_format = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    
    # Headers
    headers = [
        'Dividend ID', 'Company Code', 'Company Name', 'Client Code', 'Client BOID', 'Client Name',
        'Holder Type', 'Shares Held', 'Gross Dividend', 'Tax Amount', 'Net Payable',
        'Fiscal Year', 'Payment Status', 'Payment Date', 'Payment Reference'
    ]
    
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    # Data
    row = 1
    for payable in queryset:
        worksheet.write(row, 0, payable.dividend_id, cell_format)
        worksheet.write(row, 1, payable.company.company_code, cell_format)
        worksheet.write(row, 2, payable.company.company_name, cell_format)
        worksheet.write(row, 3, payable.client.client_code, cell_format)
        worksheet.write(row, 4, payable.client.boid or '', cell_format)
        worksheet.write(row, 5, payable.client.full_name, cell_format)
        worksheet.write(row, 6, payable.client.holder_type or '', cell_format)
        worksheet.write(row, 7, float(payable.shares_held or 0), number_format)
        worksheet.write(row, 8, float(payable.gross_dividend or 0), number_format)
        worksheet.write(row, 9, float(payable.tax_amount or 0), number_format)
        worksheet.write(row, 10, float(payable.net_payable or 0), number_format)
        worksheet.write(row, 11, payable.fiscal_year or '', cell_format)
        worksheet.write(row, 12, payable.payment_status, cell_format)
        worksheet.write(row, 13, payable.payment_date.strftime('%Y-%m-%d') if payable.payment_date else '', cell_format)
        worksheet.write(row, 14, payable.payment_reference or '', cell_format)
        row += 1
    
    # Totals
    totals = queryset.aggregate(
        total_shares=Sum('shares_held'),
        total_gross=Sum('gross_dividend'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable')
    )
    
    worksheet.write(row, 6, 'TOTAL:', header_format)
    worksheet.write(row, 7, float(totals['total_shares'] or 0), number_format)
    worksheet.write(row, 8, float(totals['total_gross'] or 0), number_format)
    worksheet.write(row, 9, float(totals['total_tax'] or 0), number_format)
    worksheet.write(row, 10, float(totals['total_net'] or 0), number_format)
    
    workbook.close()
    output.seek(0)
    
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=dividend_payables_{datetime.now().strftime("%Y%m%d")}.xlsx'
    
    return response


def _fiscal_year_from_date(date_obj):
    if not date_obj:
        return None
    # Simple fiscal year: July-June window
    if date_obj.month >= 7:
        return f"{date_obj.year}/{date_obj.year + 1}"
    return f"{date_obj.year - 1}/{date_obj.year}"


def _build_reco_rows(payables, recon_map, is_interest=True):
    rows = []
    company_totals = {}
    total_books = Decimal('0')
    total_rts = Decimal('0')

    for item in payables:
        books_amount = Decimal(item.net_payable or 0)
        rts_amount = Decimal(recon_map.get(item.pk, 0))
        difference = books_amount - rts_amount

        total_books += books_amount
        total_rts += rts_amount

        company_key = item.company.company_name
        if company_key not in company_totals:
            company_totals[company_key] = {
                'company_name': company_key,
                'books_amount': Decimal('0'),
                'rts_amount': Decimal('0'),
                'difference': Decimal('0'),
            }
        company_totals[company_key]['books_amount'] += books_amount
        company_totals[company_key]['rts_amount'] += rts_amount
        company_totals[company_key]['difference'] += difference

        due_date = getattr(item, 'due_date', None)
        payment_date = getattr(item, 'payment_date', None)
        approved_date = getattr(item, 'approved_date', None)

        fiscal_year = _fiscal_year_from_date(due_date if is_interest else payment_date)
        effective_date = due_date if is_interest else payment_date
        agm_date = (approved_date or due_date) if is_interest else payment_date

        rows.append({
            'id': item.pk,
            'particulars': item.instrument_ref if is_interest else f"{item.company.company_code} Dividend {item.fiscal_year or ''}".strip(),
            'company_code': item.company.company_code,
            'company_name': item.company.company_name,
            'client_code': item.client.client_code,
            'client_name': item.client.full_name,
            'client_boid': item.client.boid,
            'books_amount': float(books_amount),
            'rts_amount': float(rts_amount),
            'difference': float(difference),
            'financial_year': fiscal_year,
            'due_or_payment_date': effective_date.isoformat() if effective_date else None,
            'agm_date': agm_date.isoformat() if agm_date else None,
            'status': item.payment_status,
        })

    return rows, company_totals, total_books, total_rts


def _group_reco_rows_by_particulars(rows):
    grouped = {}
    for row in rows:
        key = row.get('particulars') or 'N/A'
        if key not in grouped:
            grouped[key] = {
                'particulars': key,
                'rows': [],
                'books_amount': Decimal('0'),
                'rts_amount': Decimal('0'),
                'difference': Decimal('0'),
            }

        grouped[key]['rows'].append(row)
        grouped[key]['books_amount'] += Decimal(str(row.get('books_amount') or 0))
        grouped[key]['rts_amount'] += Decimal(str(row.get('rts_amount') or 0))
        grouped[key]['difference'] += Decimal(str(row.get('difference') or 0))

    return list(grouped.values())


def _get_interest_reco_data(request):
    company_id = request.GET.get('company')
    client_id = request.GET.get('client')
    payment_status = request.GET.get('payment_status')
    fiscal_year = request.GET.get('fiscal_year')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')

    queryset = InterestPayable.objects.select_related('company', 'client').all()
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)
    if from_date:
        queryset = queryset.filter(due_date__gte=from_date)
    if to_date:
        queryset = queryset.filter(due_date__lte=to_date)
    if fiscal_year:
        try:
            start_year = int(fiscal_year.split('/')[0])
            end_year = int(fiscal_year.split('/')[1])
            start_date = datetime(start_year, 7, 1).date()
            end_date = datetime(end_year, 6, 30).date()
            queryset = queryset.filter(due_date__range=(start_date, end_date))
        except Exception:
            pass

    interest_ids = list(queryset.values_list('interest_id', flat=True))
    recon_map = {
        rec['source_id']: rec['rts_amount'] or Decimal('0')
        for rec in Reconciliation.objects.filter(source_type='Interest', source_id__in=interest_ids)
        .values('source_id')
        .annotate(rts_amount=Sum('matched_amount'))
    }

    rows, company_totals, total_books, total_rts = _build_reco_rows(queryset, recon_map, is_interest=True)
    return {
        'rows': rows,
        'company_totals': list(company_totals.values()),
        'totals': {
            'books_amount': float(total_books),
            'rts_amount': float(total_rts),
            'difference': float(total_books - total_rts),
        },
    }


def _get_dividend_reco_data(request):
    company_id = request.GET.get('company')
    client_id = request.GET.get('client')
    payment_status = request.GET.get('payment_status')
    fiscal_year = request.GET.get('fiscal_year')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')

    queryset = DividendPayable.objects.select_related('company', 'client').all()
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)
    if fiscal_year:
        queryset = queryset.filter(fiscal_year=fiscal_year)
    if from_date:
        queryset = queryset.filter(payment_date__gte=from_date)
    if to_date:
        queryset = queryset.filter(payment_date__lte=to_date)

    dividend_ids = list(queryset.values_list('dividend_id', flat=True))
    recon_map = {
        rec['source_id']: rec['rts_amount'] or Decimal('0')
        for rec in Reconciliation.objects.filter(source_type='Dividend', source_id__in=dividend_ids)
        .values('source_id')
        .annotate(rts_amount=Sum('matched_amount'))
    }

    rows, company_totals, total_books, total_rts = _build_reco_rows(queryset, recon_map, is_interest=False)
    return {
        'rows': rows,
        'company_totals': list(company_totals.values()),
        'totals': {
            'books_amount': float(total_books),
            'rts_amount': float(total_rts),
            'difference': float(total_books - total_rts),
        },
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_interest_report(request):
    """Books vs RTS reconciliation for interest payables"""
    return Response(_get_interest_reco_data(request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_interest_export(request):
    """Excel export for interest reconciliation"""
    data = _get_interest_reco_data(request)

    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    sheet = workbook.add_worksheet('Interest Reco')

    header_format = workbook.add_format({'bold': True, 'bg_color': '#F4B183', 'border': 1})
    number_format = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})

    headers = [
        'Particulars', 'Company', 'Client', 'Financial Year', 'Due Date',
        'In Books (NPR)', 'In RTS (NPR)', 'Difference (NPR)', 'Status'
    ]
    for col, header in enumerate(headers):
        sheet.write(0, col, header, header_format)

    for row_idx, row in enumerate(data['rows'], start=1):
        sheet.write(row_idx, 0, row['particulars'], cell_format)
        sheet.write(row_idx, 1, row['company_name'], cell_format)
        sheet.write(row_idx, 2, row['client_name'], cell_format)
        sheet.write(row_idx, 3, row.get('financial_year') or '', cell_format)
        sheet.write(row_idx, 4, row.get('due_or_payment_date') or '', cell_format)
        sheet.write(row_idx, 5, row['books_amount'], number_format)
        sheet.write(row_idx, 6, row['rts_amount'], number_format)
        sheet.write(row_idx, 7, row['difference'], number_format)
        sheet.write(row_idx, 8, row['status'], cell_format)

    total_row = len(data['rows']) + 1
    sheet.write(total_row, 4, 'TOTAL', header_format)
    sheet.write(total_row, 5, data['totals']['books_amount'], number_format)
    sheet.write(total_row, 6, data['totals']['rts_amount'], number_format)
    sheet.write(total_row, 7, data['totals']['difference'], number_format)

    workbook.close()
    output.seek(0)

    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=interest_reco_{datetime.now().strftime("%Y%m%d")}.xlsx'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_dividend_report(request):
    """Books vs RTS reconciliation for dividend payables"""
    return Response(_get_dividend_reco_data(request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_dividend_export(request):
    """Excel export for dividend reconciliation"""
    data = _get_dividend_reco_data(request)

    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    sheet = workbook.add_worksheet('Dividend Reco')

    header_format = workbook.add_format({'bold': True, 'bg_color': '#F4B183', 'border': 1})
    number_format = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})

    headers = [
        'Particulars', 'Company', 'Client', 'Financial Year', 'Payment Date',
        'In Books (NPR)', 'In RTS (NPR)', 'Difference (NPR)', 'Status'
    ]
    for col, header in enumerate(headers):
        sheet.write(0, col, header, header_format)

    for row_idx, row in enumerate(data['rows'], start=1):
        sheet.write(row_idx, 0, row['particulars'], cell_format)
        sheet.write(row_idx, 1, row['company_name'], cell_format)
        sheet.write(row_idx, 2, row['client_name'], cell_format)
        sheet.write(row_idx, 3, row.get('financial_year') or '', cell_format)
        sheet.write(row_idx, 4, row.get('due_or_payment_date') or '', cell_format)
        sheet.write(row_idx, 5, row['books_amount'], number_format)
        sheet.write(row_idx, 6, row['rts_amount'], number_format)
        sheet.write(row_idx, 7, row['difference'], number_format)
        sheet.write(row_idx, 8, row['status'], cell_format)

    total_row = len(data['rows']) + 1
    sheet.write(total_row, 4, 'TOTAL', header_format)
    sheet.write(total_row, 5, data['totals']['books_amount'], number_format)
    sheet.write(total_row, 6, data['totals']['rts_amount'], number_format)
    sheet.write(total_row, 7, data['totals']['difference'], number_format)

    workbook.close()
    output.seek(0)

    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=dividend_reco_{datetime.now().strftime("%Y%m%d")}.xlsx'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_combined_export(request):
    """Excel export for combined statement reconciliation"""
    interest_data = _get_interest_reco_data(request)
    dividend_data = _get_dividend_reco_data(request)

    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    sheet = workbook.add_worksheet('Combined Statement')

    title_format = workbook.add_format({'bold': True, 'font_size': 14, 'align': 'center', 'valign': 'vcenter'})
    meta_format = workbook.add_format({'italic': True, 'font_color': '#666666', 'align': 'right'})
    header_format = workbook.add_format({'bold': True, 'bg_color': '#F4B183', 'border': 1, 'align': 'center', 'valign': 'vcenter'})
    section_format = workbook.add_format({'bold': True, 'bg_color': '#E2E3E5', 'border': 1})
    subtotal_format = workbook.add_format({'bold': True, 'bg_color': '#F8F9FA', 'border': 1})
    total_format = workbook.add_format({'bold': True, 'bg_color': '#FFE69C', 'border': 1})
    grand_total_format = workbook.add_format({'bold': True, 'bg_color': '#F8D7DA', 'border': 1})
    number_format = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    subtotal_number_format = workbook.add_format({'bold': True, 'bg_color': '#F8F9FA', 'num_format': '#,##0.00', 'border': 1})
    total_number_format = workbook.add_format({'bold': True, 'bg_color': '#FFE69C', 'num_format': '#,##0.00', 'border': 1})
    grand_number_format = workbook.add_format({'bold': True, 'bg_color': '#F8D7DA', 'num_format': '#,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})

    sheet.set_row(0, 24)
    sheet.set_row(1, 20)
    sheet.set_row(2, 24)
    sheet.set_row(3, 22)
    sheet.set_column(0, 0, 40)
    sheet.set_column(1, 2, 20)
    sheet.set_column(3, 4, 18)
    sheet.set_column(5, 5, 20)

    sheet.merge_range(0, 0, 0, 5, 'Combined Reconciliation Statement', title_format)
    sheet.merge_range(1, 0, 1, 5, f'Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}', meta_format)

    sheet.merge_range(2, 0, 3, 0, 'Particulars', header_format)
    sheet.merge_range(2, 1, 3, 1, 'In Books of Accounts Amount', header_format)
    sheet.merge_range(2, 2, 2, 4, 'In RTS Dep.', header_format)
    sheet.merge_range(2, 5, 3, 5, 'Difference', header_format)
    sheet.write(3, 2, 'Amount', header_format)
    sheet.write(3, 3, 'Financial Year', header_format)
    sheet.write(3, 4, 'AGM Date', header_format)

    sheet.freeze_panes(4, 0)

    row_idx = 4

    def write_section(title, section_data):
        nonlocal row_idx
        groups = _group_reco_rows_by_particulars(section_data.get('rows', []))

        sheet.merge_range(row_idx, 0, row_idx, 5, title, section_format)
        row_idx += 1

        if not groups:
            sheet.write(row_idx, 0, 'No records', cell_format)
            sheet.write_number(row_idx, 1, 0, number_format)
            sheet.write_number(row_idx, 2, 0, number_format)
            sheet.write(row_idx, 3, '-', cell_format)
            sheet.write(row_idx, 4, '-', cell_format)
            sheet.write_number(row_idx, 5, 0, number_format)
            row_idx += 1
            return

        for group in groups:
            for idx, data_row in enumerate(group['rows']):
                sheet.write(row_idx, 0, group['particulars'] if idx == 0 else '', cell_format)
                sheet.write_number(row_idx, 1, float(data_row.get('books_amount') or 0), number_format)
                sheet.write_number(row_idx, 2, float(data_row.get('rts_amount') or 0), number_format)
                sheet.write(row_idx, 3, data_row.get('financial_year') or '-', cell_format)
                sheet.write(row_idx, 4, data_row.get('agm_date') or data_row.get('due_or_payment_date') or '-', cell_format)
                sheet.write_number(row_idx, 5, float(data_row.get('difference') or 0), number_format)
                row_idx += 1

            sheet.write(row_idx, 0, 'Sub-Total', subtotal_format)
            sheet.write_number(row_idx, 1, float(group['books_amount']), subtotal_number_format)
            sheet.write_number(row_idx, 2, float(group['rts_amount']), subtotal_number_format)
            sheet.write(row_idx, 3, '-', subtotal_format)
            sheet.write(row_idx, 4, '-', subtotal_format)
            sheet.write_number(row_idx, 5, float(group['difference']), subtotal_number_format)
            row_idx += 1

    write_section('Debenture Interest Payable', interest_data)

    sheet.write(row_idx, 0, 'Total Interest Payable', total_format)
    sheet.write_number(row_idx, 1, float(interest_data.get('totals', {}).get('books_amount') or 0), total_number_format)
    sheet.write_number(row_idx, 2, float(interest_data.get('totals', {}).get('rts_amount') or 0), total_number_format)
    sheet.write(row_idx, 3, '-', total_format)
    sheet.write(row_idx, 4, '-', total_format)
    sheet.write_number(row_idx, 5, float(interest_data.get('totals', {}).get('difference') or 0), total_number_format)
    row_idx += 1

    write_section('IPO & Dividend Payable', dividend_data)

    sheet.write(row_idx, 0, 'Sub-Total of IPO & Dividend Payable', total_format)
    sheet.write_number(row_idx, 1, float(dividend_data.get('totals', {}).get('books_amount') or 0), total_number_format)
    sheet.write_number(row_idx, 2, float(dividend_data.get('totals', {}).get('rts_amount') or 0), total_number_format)
    sheet.write(row_idx, 3, '-', total_format)
    sheet.write(row_idx, 4, '-', total_format)
    sheet.write_number(row_idx, 5, float(dividend_data.get('totals', {}).get('difference') or 0), total_number_format)
    row_idx += 1

    grand_books = Decimal(str(interest_data.get('totals', {}).get('books_amount') or 0)) + Decimal(str(dividend_data.get('totals', {}).get('books_amount') or 0))
    grand_rts = Decimal(str(interest_data.get('totals', {}).get('rts_amount') or 0)) + Decimal(str(dividend_data.get('totals', {}).get('rts_amount') or 0))
    grand_diff = Decimal(str(interest_data.get('totals', {}).get('difference') or 0)) + Decimal(str(dividend_data.get('totals', {}).get('difference') or 0))

    sheet.write(row_idx, 0, 'Total Payable (IPO + Interest + Dividend)', grand_total_format)
    sheet.write_number(row_idx, 1, float(grand_books), grand_number_format)
    sheet.write_number(row_idx, 2, float(grand_rts), grand_number_format)
    sheet.write(row_idx, 3, '-', grand_total_format)
    sheet.write(row_idx, 4, '-', grand_total_format)
    sheet.write_number(row_idx, 5, float(grand_diff), grand_number_format)

    workbook.close()
    output.seek(0)

    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=combined_reco_{datetime.now().strftime("%Y%m%d")}.xlsx'
    return response

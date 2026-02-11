from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
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
        pending=Sum('net_payable', filter=Q(payment_status='Pending')),
        total_count=Count('interest_id')
    )
    
    # Dividend payables summary
    dividend_summary = DividendPayable.objects.aggregate(
        total_gross=Sum('gross_dividend'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable'),
        paid=Sum('net_payable', filter=Q(payment_status='Paid')),
        pending=Sum('net_payable', filter=Q(payment_status='Pending')),
        total_count=Count('dividend_id')
    )
    
    # Company-wise interest payables
    company_interest = InterestPayable.objects.values(
        'company__company_name'
    ).annotate(
        total=Sum('net_payable')
    ).order_by('-total')[:10]
    
    # Company-wise dividend payables
    company_dividend = DividendPayable.objects.values(
        'company__company_name'
    ).annotate(
        total=Sum('net_payable')
    ).order_by('-total')[:10]
    
    # Master data counts
    total_companies = Company.objects.filter(status='Active').count()
    total_clients = Client.objects.filter(status='Active').count()
    
    return Response({
        'interest': {
            'total_gross': interest_summary['total_gross'] or 0,
            'total_tax': interest_summary['total_tax'] or 0,
            'total_net': interest_summary['total_net'] or 0,
            'paid': interest_summary['paid'] or 0,
            'pending': interest_summary['pending'] or 0,
            'count': interest_summary['total_count'] or 0
        },
        'dividend': {
            'total_gross': dividend_summary['total_gross'] or 0,
            'total_tax': dividend_summary['total_tax'] or 0,
            'total_net': dividend_summary['total_net'] or 0,
            'paid': dividend_summary['paid'] or 0,
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
        'Interest ID', 'Company Code', 'Company Name', 'Client Code', 'Client Name',
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
        worksheet.write(row, 4, payable.client.full_name, cell_format)
        worksheet.write(row, 5, payable.instrument_ref or '', cell_format)
        worksheet.write(row, 6, float(payable.gross_interest), number_format)
        worksheet.write(row, 7, float(payable.tax_amount), number_format)
        worksheet.write(row, 8, float(payable.net_payable), number_format)
        worksheet.write(row, 9, payable.due_date.strftime('%Y-%m-%d'), date_format)
        fiscal_year_value = f"{payable.due_date.year}/{payable.due_date.year + 1}" if payable.due_date.month >= 7 else f"{payable.due_date.year - 1}/{payable.due_date.year}"
        worksheet.write(row, 10, fiscal_year_value, cell_format)
        worksheet.write(row, 11, payable.payment_status, cell_format)
        worksheet.write(row, 12, payable.payment_date.strftime('%Y-%m-%d') if payable.payment_date else '', date_format)
        worksheet.write(row, 13, payable.payment_reference or '', cell_format)
        row += 1
    
    # Totals
    totals = queryset.aggregate(
        total_gross=Sum('gross_interest'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable')
    )
    
    worksheet.write(row, 5, 'TOTAL:', header_format)
    worksheet.write(row, 6, float(totals['total_gross'] or 0), number_format)
    worksheet.write(row, 7, float(totals['total_tax'] or 0), number_format)
    worksheet.write(row, 8, float(totals['total_net'] or 0), number_format)
    
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
        'Dividend ID', 'Company Code', 'Company Name', 'Client Code', 'Client Name',
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
        worksheet.write(row, 4, payable.client.full_name, cell_format)
        worksheet.write(row, 5, payable.client.holder_type or '', cell_format)
        worksheet.write(row, 6, float(payable.shares_held or 0), number_format)
        worksheet.write(row, 7, float(payable.gross_dividend or 0), number_format)
        worksheet.write(row, 8, float(payable.tax_amount or 0), number_format)
        worksheet.write(row, 9, float(payable.net_payable or 0), number_format)
        worksheet.write(row, 10, payable.fiscal_year or '', cell_format)
        worksheet.write(row, 11, payable.payment_status, cell_format)
        worksheet.write(row, 12, payable.payment_date.strftime('%Y-%m-%d') if payable.payment_date else '', cell_format)
        worksheet.write(row, 13, payable.payment_reference or '', cell_format)
        row += 1
    
    # Totals
    totals = queryset.aggregate(
        total_shares=Sum('shares_held'),
        total_gross=Sum('gross_dividend'),
        total_tax=Sum('tax_amount'),
        total_net=Sum('net_payable')
    )
    
    worksheet.write(row, 5, 'TOTAL:', header_format)
    worksheet.write(row, 6, float(totals['total_shares'] or 0), number_format)
    worksheet.write(row, 7, float(totals['total_gross'] or 0), number_format)
    worksheet.write(row, 8, float(totals['total_tax'] or 0), number_format)
    worksheet.write(row, 9, float(totals['total_net'] or 0), number_format)
    
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

        fiscal_year = _fiscal_year_from_date(item.due_date if is_interest else item.payment_date)

        rows.append({
            'id': item.pk,
            'particulars': item.instrument_ref if is_interest else f"{item.company.company_code} Dividend {item.fiscal_year or ''}".strip(),
            'company_code': item.company.company_code,
            'company_name': item.company.company_name,
            'client_code': item.client.client_code,
            'client_name': item.client.full_name,
            'books_amount': float(books_amount),
            'rts_amount': float(rts_amount),
            'difference': float(difference),
            'financial_year': fiscal_year,
            'due_or_payment_date': (item.due_date or item.payment_date).isoformat() if (item.due_date or item.payment_date) else None,
            'status': item.payment_status,
        })

    return rows, company_totals, total_books, total_rts


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_interest_report(request):
    """Books vs RTS reconciliation for interest payables"""
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
    totals = {
        'books_amount': float(total_books),
        'rts_amount': float(total_rts),
        'difference': float(total_books - total_rts),
    }

    return Response({
        'rows': rows,
        'company_totals': list(company_totals.values()),
        'totals': totals,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_interest_export(request):
    """Excel export for interest reconciliation"""
    data = reco_interest_report(request).data

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
    totals = {
        'books_amount': float(total_books),
        'rts_amount': float(total_rts),
        'difference': float(total_books - total_rts),
    }

    return Response({
        'rows': rows,
        'company_totals': list(company_totals.values()),
        'totals': totals,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reco_dividend_export(request):
    """Excel export for dividend reconciliation"""
    data = reco_dividend_report(request).data

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

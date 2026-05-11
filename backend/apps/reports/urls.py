from django.urls import path
from .views import (
    dashboard_summary,
    sector_summary,
    export_sector_summary,
    export_interest_report,
    export_dividend_report,
    reco_interest_report,
    reco_interest_export,
    reco_dividend_report,
    reco_dividend_export,
    reco_combined_export,
)

urlpatterns = [
    path('dashboard/', dashboard_summary, name='dashboard'),
    path('sector-summary/', sector_summary, name='sector-summary'),
    path('export/sector-summary/', export_sector_summary, name='export-sector-summary'),
    path('export/interest/', export_interest_report, name='export-interest'),
    path('export/dividend/', export_dividend_report, name='export-dividend'),
    path('reco/interest/', reco_interest_report, name='reco-interest'),
    path('reco/interest/export/', reco_interest_export, name='reco-interest-export'),
    path('reco/dividend/', reco_dividend_report, name='reco-dividend'),
    path('reco/dividend/export/', reco_dividend_export, name='reco-dividend-export'),
    path('reco/combined/export/', reco_combined_export, name='reco-combined-export'),
]

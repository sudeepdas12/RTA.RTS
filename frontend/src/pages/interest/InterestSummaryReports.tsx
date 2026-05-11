/**
 * Interest Payable - Summary Reports
 * Phase 2 Optimized
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ButtonGroup } from 'react-bootstrap';
import { FaChartBar, FaChartPie, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import DataTable from '../../components/DataTable';
import { useInterestPayables, useCompanies } from '../../hooks/useQueries';
import { formatCurrency } from '../../utils/reportUtils';
import api from '../../services/api';
import '../../styles/dashboard.css';

interface SummaryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

const InterestSummaryReports: React.FC = () => {
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [viewType, setViewType] = useState<'sector' | 'company' | 'status'>('sector');

  const { data: interestData, isLoading } = useInterestPayables();
  const { data: companiesData } = useCompanies();

  const summaryData: SummaryData[] = useMemo(() => {
    if (!Array.isArray(interestData)) return [];

    const filtered = interestData.filter((item: any) => {
      if (dateRange.fromDate && dateRange.toDate) {
        const itemDate = new Date(item.payable_date || '');
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        if (itemDate < fromDate || itemDate > toDate) return false;
      }
      return true;
    });

    const companyMap = new Map(
      (Array.isArray(companiesData) ? companiesData : []).map((c: any) => [c.company_id ?? c.id, c.sector_type])
    );

    const summaryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    filtered.forEach((item: any) => {
      let category = 'Unknown';

      if (viewType === 'sector') {
        category = companyMap.get(item.company_id) || 'Unknown';
      } else if (viewType === 'company') {
        category = item.company_name || 'Unknown';
      } else if (viewType === 'status') {
        category = item.status || 'Unknown';
      }

      const amt = Number(item.net_payable || 0);
      totalAmount += amt;

      if (!summaryMap.has(category)) {
        summaryMap.set(category, { amount: amt, count: 1 });
      } else {
        const existing = summaryMap.get(category)!;
        existing.amount += amt;
        existing.count += 1;
      }
    });

    return Array.from(summaryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }));
  }, [interestData, dateRange, viewType, companiesData]);

  const columns: ColumnDef<SummaryData>[] = [
    {
      accessorKey: 'category',
      header: 'Category',
      size: 300,
      cell: (info) => <strong>{info.getValue()}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Records',
      size: 100,
      cell: (info) => <Badge bg="secondary">{info.getValue()}</Badge>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 150,
      cell: (info) => (
        <span className="badge bg-primary">
          {formatCurrency(info.getValue() as number)}
        </span>
      ),
    },
    {
      accessorKey: 'percentage',
      header: 'Percentage',
      size: 100,
      cell: (info) => {
        const pct = info.getValue() as number;
        return (
          <div>
            <div className="progress">
              <div
                className="progress-bar bg-info"
                style={{ width: `${pct}%` }}
              />
            </div>
            <small>{pct.toFixed(2)}%</small>
          </div>
        );
      },
    },
  ];

  const handleExport = async () => {
    try {
      const params: any = { view_type: viewType };
      if (dateRange.fromDate) params.from_date = dateRange.fromDate;
      if (dateRange.toDate) params.to_date = dateRange.toDate;

      const response = await api.get('/interest-payables/summary/', { params, responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `interest-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading summary data...</p>
          </div>
        </div>
      </>
    );
  }

  const totalAmount = summaryData.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">
            <FaChartPie style={{ marginRight: '0.5rem' }} /> Interest Payable - Summary Reports
          </h2>

          <Card className="filter-card-modern mt-3 mb-4">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <DateRangeFilter onApply={(range) => setDateRange(range)} />
                </Col>
                <Col md={6}>
                  <label className="text-muted small">View By</label>
                  <ButtonGroup className="d-block w-100">
                    <Button
                      variant={viewType === 'sector' ? 'primary' : 'outline-secondary'}
                      onClick={() => setViewType('sector')}
                    >
                      Sector
                    </Button>
                    <Button
                      variant={viewType === 'company' ? 'primary' : 'outline-secondary'}
                      onClick={() => setViewType('company')}
                    >
                      Company
                    </Button>
                    <Button
                      variant={viewType === 'status' ? 'primary' : 'outline-secondary'}
                      onClick={() => setViewType('status')}
                    >
                      Status
                    </Button>
                  </ButtonGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="chart-card-modern">
            <Card.Header>
              <FaChartBar style={{ marginRight: '0.5rem' }} /> Summary ({summaryData.length} categories)
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable<SummaryData>
                data={summaryData}
                columns={columns}
                totalRows={summaryData.length}
                enableRowSelection={false}
                showColumnToggle={false}
                isLoading={isLoading}
                emptyMessage="No data found"
              />
            </Card.Body>
          </Card>

          <Row className="mt-4">
            <Col md={6}>
              <Card className="summary-card">
                <Card.Body>
                  <small className="text-muted">Total Amount</small>
                  <p className="mb-0 fs-5">
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="text-end">
              <Button variant="outline-secondary" onClick={handleExport} className="mt-2">
                <FaDownload /> Export to Excel
              </Button>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default InterestSummaryReports;

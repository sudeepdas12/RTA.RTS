/**
 * Dividend Payable - Company-wise View
 * Phase 2 Optimized with React Query
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { FaChartBar, FaBuilding, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import DataTable from '../../components/DataTable';
import { useDividendPayables } from '../../hooks/useQueries';
import { formatCurrency } from '../../utils/reportUtils';
import api from '../../services/api';
import '../../styles/dashboard.css';

interface DividendCompanyWiseData {
  company: string;
  company_id?: number;
  total: number;
  count: number;
}

const DividendCompanyWise: React.FC = () => {
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });

  const { data: dividendData, isLoading } = useDividendPayables();

  const processedData: DividendCompanyWiseData[] = useMemo(() => {
    if (!Array.isArray(dividendData)) return [];

    const filtered = dividendData.filter((item: any) => {
      if (dateRange.fromDate && dateRange.toDate) {
        const itemDate = new Date(item.payable_date || '');
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        if (itemDate < fromDate || itemDate > toDate) return false;
      }
      return true;
    });

    const aggMap = new Map<number | string, DividendCompanyWiseData>();
    filtered.forEach((item: any) => {
      const companyId = item.company_id || item.company?.id || 0;
      const company = item.company_name || item.company?.company_name || 'N/A';
      const amt = Number(item.net_payable || 0);

      if (!aggMap.has(companyId)) {
        aggMap.set(companyId, { company, company_id: companyId, total: amt, count: 1 });
      } else {
        const existing = aggMap.get(companyId)!;
        existing.total += amt;
        existing.count += 1;
      }
    });

    return Array.from(aggMap.values()).sort((a, b) => b.total - a.total);
  }, [dividendData, dateRange]);

  const columns: ColumnDef<DividendCompanyWiseData>[] = [
    {
      accessorKey: 'company',
      header: 'Company',
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
      accessorKey: 'total',
      header: 'Total Payable',
      size: 150,
      cell: (info) => (
        <span className="badge bg-success">
          {formatCurrency(info.getValue() as number)}
        </span>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      const params: any = {};
      if (dateRange.fromDate) params.from_date = dateRange.fromDate;
      if (dateRange.toDate) params.to_date = dateRange.toDate;

      const response = await api.get('/dividend-payables/export/', {
        params: { ...params, group_by: 'company' },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `dividend-companywise-${new Date().toISOString().split('T')[0]}.xlsx`
      );
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
            <p className="fs-5 text-muted">Loading dividend data...</p>
          </div>
        </div>
      </>
    );
  }

  const totalAmount = processedData.reduce((sum, row) => sum + row.total, 0);
  const totalRecords = processedData.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">
            <FaBuilding style={{ marginRight: '0.5rem' }} /> Dividend Payable - Company-wise View
          </h2>

          <Card className="filter-card-modern mt-3 mb-4">
            <Card.Body>
              <DateRangeFilter onApply={(range) => setDateRange(range)} />
            </Card.Body>
          </Card>

          <Card className="chart-card-modern">
            <Card.Header>
              <FaChartBar style={{ marginRight: '0.5rem' }} /> Dividend by Company ({processedData.length} companies)
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable
                data={processedData}
                columns={columns}
                totalRows={processedData.length}
                enableRowSelection={false}
                showColumnToggle={false}
                isLoading={isLoading}
                emptyMessage="No dividend payables found"
              />
            </Card.Body>
          </Card>

          <Row className="mt-4">
            <Col md={6}>
              <Card className="summary-card">
                <Card.Body>
                  <Row>
                    <Col>
                      <small className="text-muted">Total Amount</small>
                      <p className="mb-0 fs-5">
                        <strong>{formatCurrency(totalAmount)}</strong>
                      </p>
                    </Col>
                    <Col>
                      <small className="text-muted">Total Records</small>
                      <p className="mb-0 fs-5">
                        <strong>{totalRecords}</strong>
                      </p>
                    </Col>
                    <Col>
                      <small className="text-muted">Companies</small>
                      <p className="mb-0 fs-5">
                        <strong>{processedData.length}</strong>
                      </p>
                    </Col>
                  </Row>
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

export default DividendCompanyWise;

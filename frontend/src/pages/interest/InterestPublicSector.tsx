/**
 * Interest Payable - Public Sector View
 * Phase 2 Optimized
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form } from 'react-bootstrap';
import { FaChartBar, FaUsers, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import DataTable from '../../components/DataTable';
import { useInterestPayables, useCompanies } from '../../hooks/useQueries';
import { formatCurrency } from '../../utils/reportUtils';
import api from '../../services/api';
import '../../styles/dashboard.css';

interface InterestSectorData {
  company: string;
  boid: string;
  client_name: string;
  total: number;
}

const InterestPublicSector: React.FC = () => {
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });

  const { data: interestData, isLoading } = useInterestPayables();
  const { data: companiesData } = useCompanies();

  const publicSectorCompanyIds = useMemo(() => {
    if (!Array.isArray(companiesData)) return new Set();
    return new Set(
      companiesData
        .filter((c: any) => c.sector_type === 'Public')
        .map((c: any) => c.company_id ?? c.id)
    );
  }, [companiesData]);

  const processedData: InterestSectorData[] = useMemo(() => {
    if (!Array.isArray(interestData)) return [];

    const filtered = interestData.filter((item: any) => {
      if (!publicSectorCompanyIds.has(item.company_id)) return false;

      if (dateRange.fromDate && dateRange.toDate) {
        const itemDate = new Date(item.payable_date || '');
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        if (itemDate < fromDate || itemDate > toDate) return false;
      }
      return true;
    });

    const aggMap = new Map<string, InterestSectorData>();
    filtered.forEach((item: any) => {
      const company = item.company_name || 'N/A';
      const boid = item.client_boid || '';
      const clientName = item.client_name || 'N/A';
      const key = `${company}||${boid}`;
      const amt = Number(item.net_payable || 0);

      if (!aggMap.has(key)) {
        aggMap.set(key, { company, boid, client_name: clientName, total: amt });
      } else {
        aggMap.get(key)!.total += amt;
      }
    });

    return Array.from(aggMap.values());
  }, [interestData, dateRange, publicSectorCompanyIds]);

  const columns: ColumnDef<InterestSectorData>[] = [
    {
      accessorKey: 'company',
      header: 'Company',
      size: 200,
      cell: (info) => <strong>{info.getValue()}</strong>,
    },
    {
      accessorKey: 'boid',
      header: 'BOID',
      size: 150,
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'client_name',
      header: 'Client Name',
      size: 250,
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'total',
      header: 'Total Payable',
      size: 150,
      cell: (info) => (
        <span className="badge bg-info">
          {formatCurrency(info.getValue() as number)}
        </span>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      const params: any = { sector: 'Public' };
      if (dateRange.fromDate) params.from_date = dateRange.fromDate;
      if (dateRange.toDate) params.to_date = dateRange.toDate;

      const response = await api.get('/interest-payables/export/', { params, responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `interest-public-${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <p className="fs-5 text-muted">Loading interest data...</p>
          </div>
        </div>
      </>
    );
  }

  const totalAmount = processedData.reduce((sum, row) => sum + row.total, 0);

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">
            <FaUsers style={{ marginRight: '0.5rem' }} /> Interest Payable - Public Sector
          </h2>

          <Card className="filter-card-modern mt-3 mb-4">
            <Card.Body>
              <DateRangeFilter onApply={(range) => setDateRange(range)} />
            </Card.Body>
          </Card>

          <Card className="chart-card-modern">
            <Card.Header>
              <FaChartBar style={{ marginRight: '0.5rem' }} /> Public Sector Payables ({processedData.length})
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable<InterestSectorData>
                data={processedData}
                columns={columns}
                totalRows={processedData.length}
                enableRowSelection={false}
                showColumnToggle={false}
                isLoading={isLoading}
                emptyMessage="No public sector payables found"
              />
            </Card.Body>
          </Card>

          <Row className="mt-4">
            <Col md={6}>
              <Card className="summary-card">
                <Card.Body>
                  <small className="text-muted">Total Public Sector Amount</small>
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

export default InterestPublicSector;

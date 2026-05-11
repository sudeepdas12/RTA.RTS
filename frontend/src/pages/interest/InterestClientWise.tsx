/**
 * Interest Payable - Client-wise View
 * Phase 2 Optimized with React Query
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form } from 'react-bootstrap';
import { FaChartBar, FaUsers, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../../components/NavigationBar';
import CustomSelect from '../../components/CustomSelect';
import DateRangeFilter from '../../components/DateRangeFilter';
import DataTable from '../../components/DataTable';
import { useInterestPayables, useCompanies } from '../../hooks/useQueries';
import { formatCurrency } from '../../utils/reportUtils';
import api from '../../services/api';
import '../../styles/dashboard.css';

interface InterestClientWiseData {
  company: string;
  company_id?: number;
  boid: string;
  client_name: string;
  total: number;
}

const InterestClientWise: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [selectedCompany, setSelectedCompany] = useState<number | string>('all');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch interest payables
  const { data: interestData, isLoading: isLoadingInterest, isError: isErrorInterest } = useInterestPayables();

  // Fetch companies for filter
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();

  const companies = Array.isArray(companiesData) ? companiesData : [];

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================

  const processedData: InterestClientWiseData[] = useMemo(() => {
    if (!Array.isArray(interestData)) return [];

    const filtered = interestData.filter((item: any) => {
      // Date filtering
      if (dateRange.fromDate && dateRange.toDate) {
        const itemDate = new Date(item.payable_date || '');
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Company filtering
      if (selectedCompany !== 'all') {
        const itemCompanyId = item.company_id || item.company?.id;
        if (itemCompanyId !== selectedCompany) return false;
      }

      return true;
    });

    // Aggregate by company + client (BOID / name)
    const aggMap = new Map<string, InterestClientWiseData>();

    filtered.forEach((item: any) => {
      const company = item.company_name || item.company?.company_name || 'N/A';
      const boid = item.client_boid || '';
      const clientName = item.client_name || 'N/A';
      const companyId = item.company_id || item.company?.id;
      
      const key = `${companyId}||${boid}`;
      const amt = Number(item.net_payable || 0);

      if (!aggMap.has(key)) {
        aggMap.set(key, {
          company,
          company_id: companyId,
          boid,
          client_name: clientName,
          total: amt,
        });
      } else {
        const existing = aggMap.get(key)!;
        existing.total += amt;
      }
    });

    return Array.from(aggMap.values());
  }, [interestData, dateRange, selectedCompany]);

  // ============================================================================
  // COLUMN DEFINITIONS
  // ============================================================================

  const columns: ColumnDef<InterestClientWiseData>[] = [
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
        <span className="badge bg-primary">
          {formatCurrency(info.getValue() as number)}
        </span>
      ),
    },
  ];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
  };

  const handleCompanyChange = (value: number | string | null) => {
    setSelectedCompany(value || 'all');
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (dateRange.fromDate) params.from_date = dateRange.fromDate;
      if (dateRange.toDate) params.to_date = dateRange.toDate;
      if (selectedCompany !== 'all') params.company = selectedCompany;

      const response = await api.get('/interest-payables/export/', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `interest-clientwise-${new Date().toISOString().split('T')[0]}.xlsx`
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

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingInterest || isLoadingCompanies) {
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

  if (isErrorInterest) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>Error Loading Interest Data</Alert.Heading>
              <p className="mb-0">Failed to load interest payables. Please try again.</p>
            </Alert>
          </Container>
        </div>
      </>
    );
  }

  const totalAmount = processedData.reduce((sum, row) => sum + row.total, 0);
  const rangeText = dateRange.fromDate && dateRange.toDate
    ? `${dateRange.fromDate} to ${dateRange.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          {/* Header */}
          <h2 className="dashboard-header">
            <FaUsers style={{ marginRight: '0.5rem' }} /> Debenture Interest Payable - Client-wise View
          </h2>

          {/* Filters */}
          <Card className="filter-card-modern mt-3 mb-4">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <DateRangeFilter onApply={handleDateRangeChange} />
                </Col>
                <Col md={6}>
                  <Form.Label className="text-muted small">Company</Form.Label>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Companies' },
                      ...companies.map((c: any) => ({
                        value: c.company_id ?? c.id,
                        label: c.company_name,
                      })),
                    ]}
                    value={selectedCompany}
                    onChange={handleCompanyChange}
                    placeholder="All Companies"
                    isClearable={false}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Data Table */}
          <Card className="chart-card-modern">
            <Card.Header>
              <FaChartBar style={{ marginRight: '0.5rem' }} /> Interest Payables ({processedData.length} records)
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable
                data={processedData}
                columns={columns}
                totalRows={processedData.length}
                enableRowSelection={false}
                showColumnToggle={true}
                isLoading={isLoadingInterest}
                emptyMessage="No interest payables found"
              />
            </Card.Body>
          </Card>

          {/* Summary */}
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
                      <small className="text-muted">Period</small>
                      <p className="mb-0 fs-6">
                        <strong>{rangeText}</strong>
                      </p>
                    </Col>
                    <Col>
                      <small className="text-muted">Records</small>
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

export default InterestClientWise;

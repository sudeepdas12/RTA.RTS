import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Spinner, Alert, Table, Form, Modal, ButtonGroup, Row, Col } from 'react-bootstrap';
import { FaChartBar, FaBuilding, FaDownload } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import CustomSelect from '../../components/CustomSelect';
import { reportService, interestService, companyService, clientService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const InterestSummaryReports = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryRows, setSummaryRows] = useState([]);
  const [sectorRows, setSectorRows] = useState([]);
  const [sectorTotals, setSectorTotals] = useState({});
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [topNFilter, setTopNFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportingBreakdown, setExportingBreakdown] = useState(false);
  const [exportingSector, setExportingSector] = useState(false);
  const [allInterestData, setAllInterestData] = useState([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  

  const normalizeFiscalYear = (value) => String(value || '')
    .trim()
    .replace('-', '/')
    .replace(/\s+/g, '');

  const normalizeBoid = (value) => String(value || '').trim().toUpperCase();

  const fetchSummary = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      params.page_size = 10000;
      if (selectedFiscalYear) {
        params.fiscal_year = selectedFiscalYear;
      }

      // fetch raw interest items and related reference lists
      const [
        interestResponse,
        publicCompaniesResponse,
        taxExemptCompaniesResponse,
        institutionClientsResponse
      ] = await Promise.all([
        interestService.getAll(params),
        companyService.getAll({ sector_type: 'Public', page_size: 1000 }),
        companyService.getAll({ interest_tax_status: 'Exempted', page_size: 1000 }),
        clientService.getAll({ holder_type: 'Institution', page_size: 1000 }),
      ]);

      const items = normalizeList(interestResponse.data);

      // Get unique companies for filter
      // deduplicate company list and other reference sets
      const companies = [...new Set(items.map(item => item.company_name))].sort();
      setUniqueCompanies(companies);

      const publicCompanyIds = new Set(normalizeList(publicCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const taxExemptCompanyIds = new Set(normalizeList(taxExemptCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const institutionClientIds = new Set(normalizeList(institutionClientsResponse.data).map(c => c.client_id ?? c.id));

      const toNum = (x) => {
        const n = Number(x);
        return isNaN(n) ? 0 : n;
      };
      const summarize = (itemsToSum) => ({
        count: itemsToSum.length,
        gross: itemsToSum.reduce((sum, item) => sum + toNum(item.gross_interest), 0),
        tax: itemsToSum.reduce((sum, item) => sum + toNum(item.tax_amount), 0),
        net: itemsToSum.reduce((sum, item) => sum + toNum(item.net_payable), 0),
      });

      // Filter by selected company + fiscal year
      const filteredItems = items.filter((item) => {
        const byCompany = selectedCompanyFilter === 'all' || item.company_name === selectedCompanyFilter;
        const byFiscal = !selectedFiscalYear || normalizeFiscalYear(item.fiscal_year) === normalizeFiscalYear(selectedFiscalYear);
        return byCompany && byFiscal;
      });

      const groupByType = {
        Public: [],
        Institution: [],
        'Tax Exempted': [],
        Other: [],
      };

      filteredItems.forEach((item) => {
        if (taxExemptCompanyIds.has(item.company)) {
          groupByType['Tax Exempted'].push(item);
        } else if (institutionClientIds.has(item.client)) {
          groupByType.Institution.push(item);
        } else if (publicCompanyIds.has(item.company)) {
          groupByType.Public.push(item);
        } else {
          groupByType.Other.push(item);
        }
      });

      const publicSummary = summarize(groupByType.Public);
      const institutionSummary = summarize(groupByType.Institution);
      const taxExemptSummary = summarize(groupByType['Tax Exempted']);
      const otherSummary = summarize(groupByType.Other);
      const totalSummary = summarize(filteredItems);

      setSummaryRows([
        { type: 'Public', ...publicSummary },
        { type: 'Institution', ...institutionSummary },
        { type: 'Tax Exempted', ...taxExemptSummary },
        { type: 'Other', ...otherSummary },
        { type: 'Total', ...totalSummary, isTotal: true },
      ]);

      const sectorMap = {};
      filteredItems.forEach((item) => {
        const sector = item.company_sector || '(none)';
        if (!sectorMap[sector]) {
          sectorMap[sector] = {
            sector,
            kitta: 0,
            amount: 0,
            gross: 0,
            per_day: 0,
            pumori: 0,
            tax: 0,
            net: 0,
          };
        }
        sectorMap[sector].kitta += toNum(item.allotted_quantity);
        sectorMap[sector].amount += toNum(item.principal_amount);
        sectorMap[sector].gross += toNum(item.gross_interest);
        sectorMap[sector].per_day += toNum(item.interest_per_day);
        sectorMap[sector].pumori += toNum(item.interest_pumori);
        sectorMap[sector].tax += toNum(item.tax_amount);
        sectorMap[sector].net += toNum(item.net_payable);
      });

      const sectorRowsComputed = Object.values(sectorMap).sort((a, b) => b.net - a.net);
      setSectorRows(sectorRowsComputed);
      setSectorTotals({
        kitta: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.kitta), 0),
        amount: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.amount), 0),
        gross: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.gross), 0),
        per_day: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.per_day), 0),
        pumori: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.pumori), 0),
        tax: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.tax), 0),
        net: sectorRowsComputed.reduce((sum, row) => sum + toNum(row.net), 0),
      });

      // Sector summary removed per request

      // Company breakdown with payment status
      const companySummary = {};
      filteredItems.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { count: 0, gross: 0, tax: 0, net: 0, paid: 0, pending: 0, boids: new Set() };
        }
        companySummary[company].count++;
        companySummary[company].gross += item.gross_interest || 0;
        companySummary[company].tax += item.tax_amount || 0;
        companySummary[company].net += item.net_payable || 0;
        const normalizedBoid = normalizeBoid(item.client_boid);
        if (normalizedBoid) {
          companySummary[company].boids.add(normalizedBoid);
        }
        if (item.payment_status === 'Paid') {
          companySummary[company].paid += item.net_payable || 0;
        } else if (item.payment_status === 'Pending') {
          companySummary[company].pending += item.net_payable || 0;
        }
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({
          company: name,
          count: data.count,
          gross: data.gross,
          tax: data.tax,
          net: data.net,
          paid: data.paid,
          pending: data.pending,
          boidCount: data.boids.size,
        }))
        .sort((a, b) => b.net - a.net);
      setCompanyBreakdown(companyRows);
      setAllCompanies(companyRows);
      // Keep details source aligned with active filters to avoid modal/count mismatch.
      setAllInterestData(filteredItems);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch summary data');
      setSummaryRows([]);
      setSectorRows([]);
      setSectorTotals({});
      setCompanyBreakdown([]);
      setAllCompanies([]);
      setAllInterestData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyFilter, selectedFiscalYear]);

  useEffect(() => {
    fetchSummary(range);
  }, [range, selectedCompanyFilter, selectedFiscalYear, fetchSummary]);

  const handleCompanyFilterChange = (companyName) => {
    setSelectedCompanyFilter(companyName);
    setSelectedFiscalYear('');
  };

  // Filter companies by search term and top N
  useEffect(() => {
    let filtered = allCompanies.filter(company =>
      company.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (topNFilter === '5') {
      filtered = filtered.slice(0, 5);
    } else if (topNFilter === '10') {
      filtered = filtered.slice(0, 10);
    }
    
    setCompanyBreakdown(filtered);
  }, [searchTerm, topNFilter, allCompanies]);

  const handleCompanyClick = (companyName) => {
    const details = allInterestData.filter(item => item.company_name === companyName);
    setCompanyDetails(details);
    setSelectedCompany(companyName);
    setShowDetailsModal(true);
  };

  const exportCompanyBreakdown = () => {
    setExportingBreakdown(true);
    try {
      const csvContent = [
        ['Company Name', 'Records', 'Distinct BOIDs', 'Gross Interest', 'Tax', 'Net Payable', 'Paid', 'Pending'],
        ...allCompanies.map(row => [
          row.company,
          row.count,
          row.boidCount,
          row.gross.toFixed(2),
          row.tax.toFixed(2),
          row.net.toFixed(2),
          row.paid.toFixed(2),
          row.pending.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `interest-company-breakdown-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export company breakdown');
    } finally {
      setExportingBreakdown(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const params = buildDateParams(range);
      const response = await reportService.exportInterest(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `interest-report-${timestamp}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSector = async () => {
    setExportingSector(true);
    setError(null);
    try {
      const params = buildDateParams(range);
      if (selectedFiscalYear) {
        params.fiscal_year = selectedFiscalYear;
      }
      if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
        params.company_name = selectedCompanyFilter;
      }
      const response = await reportService.exportSectorSummary(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `sector-summary-${timestamp}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to export sector summary');
    } finally {
      setExportingSector(false);
    }
  };

  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  const companyFiscalYears = selectedCompanyFilter === 'all'
    ? []
    : [...new Set(allInterestData
      .filter(item => item.company_name === selectedCompanyFilter)
      .map(item => normalizeFiscalYear(item.fiscal_year))
      .filter(Boolean))]
        .sort()
        .reverse();

  const fiscalYearOptions = (selectedCompanyFilter === 'all'
    ? [...new Set(allInterestData.map(item => normalizeFiscalYear(item.fiscal_year)).filter(Boolean))]
    : companyFiscalYears)
      .sort()
      .reverse();

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">📑 Debenture Interest Payable - Summary Reports</h2>

          <Row className="g-3">
            <Col lg={8}>
              <Card className="filter-card-modern summary-report-card">
                <Card.Body>
                  <DateRangeFilter onApply={setRange} />
                  <Row className="mt-3 summary-report-controls">
                    <Col md={6} className="mb-2 mb-md-0">
                      <Form.Label className="text-muted small">Company</Form.Label>
                      <CustomSelect
                        options={[{ value: 'all', label: 'All Companies' }, ...uniqueCompanies.map((c) => ({ value: c, label: c }))]}
                        value={selectedCompanyFilter}
                        onChange={(val) => handleCompanyFilterChange(val)}
                        placeholder="All Companies"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="text-muted small">Fiscal Year</Form.Label>
                      <CustomSelect
                        options={[{ value: '', label: 'All Fiscal Years' }, ...fiscalYearOptions.map((fy) => ({ value: fy, label: fy }))]}
                        value={selectedFiscalYear}
                        onChange={(val) => setSelectedFiscalYear(val)}
                        placeholder="All Fiscal Years"
                      />
                    </Col>
                  </Row>
                  {selectedCompanyFilter !== 'all' && (
                    <div className="summary-report-yearbox mt-3">
                      <div className="summary-report-yearbox-title">Available Fiscal Years for {selectedCompanyFilter}</div>
                      <div className="summary-report-yearbox-list">
                        {companyFiscalYears.length === 0 ? (
                          <div className="text-muted small">No fiscal years found for this company.</div>
                        ) : (
                          companyFiscalYears.map((fy) => (
                            <button
                              key={fy}
                              type="button"
                              className={`summary-report-yearbox-pill ${normalizeFiscalYear(selectedFiscalYear) === normalizeFiscalYear(fy) ? 'is-active' : ''}`}
                              onClick={() => setSelectedFiscalYear(fy)}
                            >
                              {fy}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="chart-card-modern summary-report-card">
                <Card.Header><FaDownload style={{ marginRight: '0.5rem' }} /> Export Options</Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">{rangeText}</p>
                  <div className="d-flex flex-column gap-2">
                    <Button
                      variant="primary"
                      onClick={handleExport}
                      disabled={exporting}
                      className="d-flex align-items-center gap-2"
                    >
                      {exporting && <Spinner animation="border" size="sm" />}
                      {exporting ? 'Exporting...' : 'Export Full Report'}
                    </Button>
                    <p className="text-muted mb-0 small">
                      Download detailed interest payable summary as Excel file
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        {loading ? (
          <div className="loading-container-modern">
            <div className="text-center">
              <div className="loading-spinner-modern mx-auto mb-3"></div>
              <p className="fs-5 text-muted">Loading report...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Sector-level aggregation card */}
            <Card className="chart-card-modern summary-report-card">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaChartBar style={{ marginRight: '0.5rem' }} /> Interest Summary by Sector</span>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleExportSector}
                    disabled={exportingSector || sectorRows.length === 0}
                  >
                    {exportingSector ? 'Exporting...' : 'Export to Excel'}
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">
                  Aggregated totals grouped by company sector type
                </p>
                <div className="table-responsive">
                  <Table className="table-modern mb-0 summary-report-table">
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Gross Interest</th>
                        <th className="text-end">Per Day</th>
                        <th className="text-end">Pumori</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorRows.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.sector || '(none)'}</td>
                          <td className="text-end">{row.kitta}</td>
                          <td className="text-end">{formatCurrency(row.amount)}</td>
                          <td className="text-end">{formatCurrency(row.gross)}</td>
                          <td className="text-end">{formatCurrency(row.per_day)}</td>
                          <td className="text-end">{formatCurrency(row.pumori)}</td>
                          <td className="text-end">{formatCurrency(row.tax)}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {sectorRows.length > 0 && (
                      <tfoot>
                        <tr className="table-active fw-bold">
                          <td>TOTAL</td>
                          <td className="text-end">{sectorTotals.kitta || 0}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.amount)}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.gross)}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.per_day)}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.pumori)}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.tax)}</td>
                          <td className="text-end">{formatCurrency(sectorTotals.net)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                </div>
              </Card.Body>
            </Card>

            <Card className="chart-card-modern summary-report-card">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaChartBar style={{ marginRight: '0.5rem' }} /> Interest Summary by Type</span>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">
                  {selectedCompanyFilter === 'all' 
                    ? 'Breakdown by holder category across all companies'
                    : `Showing data for: ${selectedCompanyFilter}`}
                </p>
                <div className="table-responsive">
                  <Table className="table-modern mb-0 summary-report-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th className="text-end">Records</th>
                        <th className="text-end">Amount/Interest</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Interest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row, idx) => (
                        <tr key={idx} className={row.isTotal ? 'table-active fw-bold' : ''}>
                          <td>{row.type}</td>
                          <td className="text-end">{row.count}</td>
                          <td className="text-end">{formatCurrency(row.gross)}</td>
                          <td className="text-end">{formatCurrency(row.tax)}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>

            <Card className="chart-card-modern summary-report-card">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaBuilding style={{ marginRight: '0.5rem' }} /> Company-wise Breakdown</span>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={exportCompanyBreakdown}
                    disabled={exportingBreakdown || allCompanies.length === 0}
                  >
                    {exportingBreakdown ? 'Exporting...' : 'Export to CSV'}
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">
                  Interest payables grouped by company ({allCompanies.length} companies)
                </p>

                <Row className="mb-3 summary-report-controls">
                  <Col md={6}>
                    <Form.Control
                      type="text"
                      placeholder="Search by company name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <ButtonGroup className="w-100">
                      <Button
                        variant={topNFilter === '5' ? 'primary' : 'outline-primary'}
                        onClick={() => setTopNFilter('5')}
                      >
                        Top 5
                      </Button>
                      <Button
                        variant={topNFilter === '10' ? 'primary' : 'outline-primary'}
                        onClick={() => setTopNFilter('10')}
                      >
                        Top 10
                      </Button>
                      <Button
                        variant={topNFilter === 'all' ? 'primary' : 'outline-primary'}
                        onClick={() => setTopNFilter('all')}
                      >
                        All
                      </Button>
                    </ButtonGroup>
                  </Col>
                </Row>

                <div className="table-responsive table-scrollable">
                  <Table className="table-modern mb-0 table-sticky-header summary-report-table">
                    <thead>
                      <tr>
                        <th>Company Name</th>
                        <th className="text-end">Records</th>
                        <th className="text-end">Distinct BOIDs</th>
                        <th className="text-end">Gross Interest</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Payable</th>
                        <th className="text-end">Paid</th>
                        <th className="text-end">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyBreakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <Button
                              variant="link"
                              className="p-0 text-start summary-row-action"
                              onClick={() => handleCompanyClick(row.company)}
                            >
                              {row.company}
                            </Button>
                          </td>
                          <td className="text-end">{row.count}</td>
                          <td className="text-end">
                            <Button
                              variant="link"
                              className="p-0 summary-row-action summary-row-action-count"
                              onClick={() => handleCompanyClick(row.company)}
                            >
                              {row.boidCount}
                            </Button>
                          </td>
                          <td className="text-end">{formatCurrency(row.gross)}</td>
                          <td className="text-end">{formatCurrency(row.tax)}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                          <td className="text-end text-success">{formatCurrency(row.paid)}</td>
                          <td className="text-end text-warning">{formatCurrency(row.pending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </>
        )}

        {/* Company Details Modal */}
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Interest Payables - {selectedCompany}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="table-responsive">
              <Table className="table-modern">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>BOID</th>
                    <th>Instrument Ref</th>
                    <th>Allotted Qty</th>
                    <th className="text-end">Principal</th>
                    <th className="text-end">Rate</th>
                    <th className="text-end">Per Day</th>
                    <th className="text-end">Pumori</th>
                    <th className="text-end">Gross Interest</th>
                    <th className="text-end">Tax Rate</th>
                    <th>Tax Exempted</th>
                    <th className="text-end">Tax</th>
                    <th className="text-end">Net Payable</th>
                    <th>Payment Status</th>
                    <th>Due Date</th>
                    <th>Bank</th>
                    <th>Acct No</th>
                    <th>Lot</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDetails.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.client_name}</td>
                      <td>{item.client_boid || '-'}</td>
                      <td>{item.instrument_ref || 'N/A'}</td>
                      <td>{item.allotted_quantity || '-'}</td>
                      <td className="text-end">{item.principal_amount ? formatCurrency(item.principal_amount) : '-'}</td>
                      <td className="text-end">{item.interest_rate || '-'}</td>
                      <td className="text-end">{item.interest_per_day || '-'}</td>
                      <td className="text-end">{item.interest_pumori ? formatCurrency(item.interest_pumori) : '-'}</td>
                      <td className="text-end">{formatCurrency(item.gross_interest)}</td>
                      <td className="text-end">{item.tax_rate ? `${item.tax_rate}%` : '-'}</td>
                      <td>{item.tax_exempted ? 'Yes' : 'No'}</td>
                      <td className="text-end">{formatCurrency(item.tax_amount)}</td>
                      <td className="text-end">{formatCurrency(item.net_payable)}</td>
                      <td>
                        <span className={`badge bg-${item.payment_status === 'Paid' ? 'success' : 'warning'}`}>
                          {item.payment_status}
                        </span>
                      </td>
                      <td>{item.due_date}</td>
                      <td>{item.bank_name || item.bank_code || '-'}</td>
                      <td>{item.account_number || '-'}</td>
                      <td>{item.lot || '-'}</td>
                      <td>{item.approved_date || '-'}</td>
                      <td>{item.remarks || '-'}</td>                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
    </>
  );
};

export default InterestSummaryReports;

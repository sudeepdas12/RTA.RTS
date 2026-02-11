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
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [topNFilter, setTopNFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportingBreakdown, setExportingBreakdown] = useState(false);
  const [allInterestData, setAllInterestData] = useState([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  

  const normalizeFiscalYear = (value) => String(value || '')
    .trim()
    .replace('-', '/')
    .replace(/\s+/g, '');

  const fetchSummary = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      params.page_size = 1000;
      const [interestResponse, publicCompaniesResponse, taxExemptCompaniesResponse, institutionClientsResponse] = await Promise.all([
        interestService.getAll(params),
        companyService.getAll({ sector_type: 'Public', page_size: 1000 }),
        companyService.getAll({ interest_tax_status: 'Exempted', page_size: 1000 }),
        clientService.getAll({ holder_type: 'Institution', page_size: 1000 }),
      ]);

      const items = normalizeList(interestResponse.data);
      
      // Get unique companies for filter
      const companies = [...new Set(items.map(item => item.company_name))].sort();
      setUniqueCompanies(companies);
      
      const publicCompanyIds = new Set(normalizeList(publicCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const taxExemptCompanyIds = new Set(normalizeList(taxExemptCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const institutionClientIds = new Set(normalizeList(institutionClientsResponse.data).map(c => c.client_id ?? c.id));

      const summarize = (filteredItems) => ({
        count: filteredItems.length,
        gross: filteredItems.reduce((sum, item) => sum + (item.gross_interest || 0), 0),
        tax: filteredItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0),
        net: filteredItems.reduce((sum, item) => sum + (item.net_payable || 0), 0),
      });

      // Filter by selected company + fiscal year
      const filteredItems = items.filter((item) => {
        const byCompany = selectedCompanyFilter === 'all' || item.company_name === selectedCompanyFilter;
        const byFiscal = !selectedFiscalYear || normalizeFiscalYear(item.fiscal_year) === normalizeFiscalYear(selectedFiscalYear);
        return byCompany && byFiscal;
      });

      const publicSummary = summarize(filteredItems.filter(item => publicCompanyIds.has(item.company)));
      const institutionSummary = summarize(filteredItems.filter(item => institutionClientIds.has(item.client)));
      const taxExemptSummary = summarize(filteredItems.filter(item => taxExemptCompanyIds.has(item.company)));
      const totalSummary = summarize(filteredItems);

      setSummaryRows([
        { type: 'Public', ...publicSummary },
        { type: 'Institution', ...institutionSummary },
        { type: 'Tax Exempted', ...taxExemptSummary },
        { type: 'Total', ...totalSummary, isTotal: true },
      ]);

      // Sector summary removed per request

      // Company breakdown with payment status
      const companySummary = {};
      filteredItems.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { count: 0, gross: 0, tax: 0, net: 0, paid: 0, pending: 0 };
        }
        companySummary[company].count++;
        companySummary[company].gross += item.gross_interest || 0;
        companySummary[company].tax += item.tax_amount || 0;
        companySummary[company].net += item.net_payable || 0;
        if (item.payment_status === 'Paid') {
          companySummary[company].paid += item.net_payable || 0;
        } else if (item.payment_status === 'Pending') {
          companySummary[company].pending += item.net_payable || 0;
        }
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({ company: name, ...data }))
        .sort((a, b) => b.net - a.net);
      setCompanyBreakdown(companyRows);
      setAllCompanies(companyRows);
      setAllInterestData(items);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch summary data');
      setSummaryRows([]);
      // sectorSummary cleared (removed)
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
        ['Company Name', 'Records', 'Gross Interest', 'Tax', 'Net Payable', 'Paid', 'Pending'],
        ...allCompanies.map(row => [
          row.company,
          row.count,
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
            {/* Debenture Interest Summary by Sector removed per request */}

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
                              className="p-0 text-start"
                              onClick={() => handleCompanyClick(row.company)}
                            >
                              {row.company}
                            </Button>
                          </td>
                          <td className="text-end">{row.count}</td>
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
                    <th>Instrument Ref</th>
                    <th className="text-end">Gross Interest</th>
                    <th className="text-end">Tax</th>
                    <th className="text-end">Net Payable</th>
                    <th>Payment Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDetails.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.client_name}</td>
                      <td>{item.instrument_ref || 'N/A'}</td>
                      <td className="text-end">{formatCurrency(item.gross_interest)}</td>
                      <td className="text-end">{formatCurrency(item.tax_amount)}</td>
                      <td className="text-end">{formatCurrency(item.net_payable)}</td>
                      <td>
                        <span className={`badge bg-${item.payment_status === 'Paid' ? 'success' : 'warning'}`}>
                          {item.payment_status}
                        </span>
                      </td>
                      <td>{item.due_date}</td>
                    </tr>
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

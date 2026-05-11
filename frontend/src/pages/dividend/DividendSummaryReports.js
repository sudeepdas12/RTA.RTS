import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Alert, Table, Form, Row, Col, ButtonGroup, Modal } from 'react-bootstrap';
import { FaChartBar, FaMoneyBillWave, FaDownload } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import CustomSelect from '../../components/CustomSelect';
import { reportService, dividendService, settingsService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendSummaryReports = () => {
  const [interestRate, setInterestRate] = useState(7);
  const [taxRate, setTaxRate] = useState(0);
  const [interestDays, setInterestDays] = useState(0);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sectorSummary, setSectorSummary] = useState([]);
  const [companySummary, setCompanySummary] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyTopN, setCompanyTopN] = useState('all');
  const [allDividendData, setAllDividendData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportingBreakdown, setExportingBreakdown] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [uniqueCompanies, setUniqueCompanies] = useState([]);

  const toNum = useCallback((x) => {
    const n = Number(x);
    return isNaN(n) ? 0 : n;
  }, []);

  const summarize = useCallback((items) => ({
    kitta: items.reduce((sum, item) => sum + toNum(item.shares_held), 0),
    amount: items.reduce((sum, item) => sum + toNum(item.gross_dividend), 0),
    tax: items.reduce((sum, item) => sum + toNum(item.tax_amount), 0),
    net: items.reduce((sum, item) => sum + toNum(item.net_payable), 0),
  }), [toNum]);

  const normalizeFiscalYear = (value) => String(value || '')
    .trim()
    .replace('-', '/')
    .replace(/\s+/g, '');

  const normalizeBoid = (value) => String(value || '').trim().toUpperCase();

  const normalizeSector = (value) => {
    const sector = String(value || '').trim().toLowerCase();
    if (sector === 'public') return 'Public';
    if (sector === 'private') return 'Private';
    if (sector.includes('tax') || sector.includes('exempt')) return 'Tax-Exempted Sector';
    return 'Uncategorized';
  };

  const getHolderType = (item) => {
    const holder = String(item.holder_type || '').toLowerCase();
    if (holder.includes('institution')) return 'Institution';
    if (holder.includes('public')) return 'Public';
    if (holder.includes('tax') || holder.includes('exempt')) return 'Tax Exempted';
    if (Number(item.tax_amount || 0) === 0) return 'Tax Exempted';
    return 'Other';
  };

  const buildTypeRows = (items) => {
    const groups = {
      Public: [],
      Institution: [],
      'Tax Exempted': [],
    };

    items.forEach((item) => {
      const type = getHolderType(item);
      if (groups[type]) {
        groups[type].push(item);
      }
    });

    const rows = Object.keys(groups).map((type) => ({
      type,
      count: groups[type].length,
      amount: groups[type].reduce((sum, it) => sum + toNum(it.gross_dividend), 0),
      tax: groups[type].reduce((sum, it) => sum + toNum(it.tax_amount), 0),
      net: groups[type].reduce((sum, it) => sum + toNum(it.net_payable), 0),
    }));

    const total = rows.reduce((acc, row) => ({
      type: 'Total',
      count: acc.count + row.count,
      amount: acc.amount + row.amount,
      tax: acc.tax + row.tax,
      net: acc.net + row.net,
    }), { count: 0, amount: 0, tax: 0, net: 0 });
    total.isTotal = true;

    return [...rows, total];
  };

  const fetchSummary = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      params.page_size = 1000;
      const response = await dividendService.getAll(params);
      const items = normalizeList(response.data);
      const companies = [...new Set(items.map(item => item.company_name || 'Unknown'))].sort();
      setUniqueCompanies(companies);
      setAllDividendData(items);

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch summary data');
      setSectorSummary([]);
      setCompanySummary([]);
      setAllDividendData([]);
      setUniqueCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(range);
  }, [range, fetchSummary]);

  useEffect(() => {
    const fetchFiscalYears = async () => {
      try {
        const response = await settingsService.getAllFiscalYears();
        const years = response.data.results || response.data || [];
        setFiscalYears(years);
        
        // Load active fiscal year
        const activeYear = years.find(y => y.is_active);
        if (activeYear) {
          setSelectedFiscalYear(activeYear.fiscal_year || '');
          setInterestRate(parseFloat(activeYear.interest_rate));
          setTaxRate(parseFloat(activeYear.tax_rate));
        }
      } catch (err) {
        console.error('Failed to load fiscal years', err);
      }
    };
    fetchFiscalYears();
  }, []);

  const handleFiscalYearChange = (yearValue) => {
    setSelectedFiscalYear(yearValue);
    const selectedYear = fiscalYears.find(y => normalizeFiscalYear(y.fiscal_year) === normalizeFiscalYear(yearValue));
    if (selectedYear) {
      setInterestRate(parseFloat(selectedYear.interest_rate));
      setTaxRate(parseFloat(selectedYear.tax_rate));
    }
  };

  const handleCompanyFilterChange = (companyName) => {
    setSelectedCompanyFilter(companyName);
    setSelectedFiscalYear('');
  };

  const computeRangeDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diffMs = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    if (selectedCompanyFilter !== 'all' && !uniqueCompanies.includes(selectedCompanyFilter)) {
      setSelectedCompanyFilter('all');
    }
  }, [uniqueCompanies, selectedCompanyFilter]);

  const filteredItems = allDividendData.filter((item) => {
    const byCompany = selectedCompanyFilter === 'all' || item.company_name === selectedCompanyFilter;
    const byFiscal = !selectedFiscalYear || normalizeFiscalYear(item.fiscal_year) === normalizeFiscalYear(selectedFiscalYear);
    return byCompany && byFiscal;
  });

  useEffect(() => {
    // Priority 1: explicit date range selected by user
    const explicitDays = computeRangeDays(range.fromDate, range.toDate);
    if (explicitDays > 0) {
      setInterestDays(explicitDays);
      return;
    }

    // Priority 2: infer a sensible period from filtered records when range is blank
    const parsedDates = filteredItems
      .map((item) => item.declaration_date || item.payment_date || item.created_at || '')
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (parsedDates.length === 0) {
      setInterestDays(1);
      return;
    }

    const minDate = new Date(Math.min(...parsedDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...parsedDates.map((d) => d.getTime())));
    const inferredDays = computeRangeDays(
      minDate.toISOString().slice(0, 10),
      maxDate.toISOString().slice(0, 10)
    );
    setInterestDays(inferredDays > 0 ? inferredDays : 1);
  }, [range.fromDate, range.toDate, filteredItems]);

  useEffect(() => {
    const totalSummary = summarize(filteredItems);
    const publicSector = filteredItems.filter(item => normalizeSector(item.company_sector) === 'Public');
    const privateSector = filteredItems.filter(item => normalizeSector(item.company_sector) === 'Private');
    const taxExemptedSector = filteredItems.filter(item => normalizeSector(item.company_sector) === 'Tax-Exempted Sector');
    const uncategorizedSector = filteredItems.filter(item => normalizeSector(item.company_sector) === 'Uncategorized');
    setSectorSummary([
      { type: 'Public', ...summarize(publicSector) },
      { type: 'Private', ...summarize(privateSector) },
      { type: 'Tax-Exempted Sector', ...summarize(taxExemptedSector) },
      { type: 'Uncategorized', ...summarize(uncategorizedSector) },
      { type: 'Total', ...totalSummary, isTotal: true },
    ]);

    const companyMap = {};
    filteredItems.forEach(item => {
      const name = item.company_name || 'Unknown';
      if (!companyMap[name]) {
        companyMap[name] = { company: name, kitta: 0, amount: 0, tax: 0, net: 0, boids: new Set() };
      }
      companyMap[name].kitta += Number(item.shares_held || 0);
      companyMap[name].amount += Number(item.gross_dividend || 0);
      companyMap[name].tax += Number(item.tax_amount || 0);
      companyMap[name].net += Number(item.net_payable || 0);
      const normalizedBoid = normalizeBoid(item.client_boid);
      if (normalizedBoid) {
        companyMap[name].boids.add(normalizedBoid);
      }
    });
    const companyRows = Object.values(companyMap)
      .map((row) => ({
        company: row.company,
        kitta: row.kitta,
        amount: row.amount,
        tax: row.tax,
        net: row.net,
        boidCount: row.boids.size,
      }))
      .sort((a, b) => b.net - a.net);
    setCompanySummary(companyRows);
  }, [filteredItems, summarize]);


  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const params = buildDateParams(range);
      const response = await reportService.exportDividend(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `dividend-report-${timestamp}.xlsx`);
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
    : [...new Set(allDividendData
      .filter(item => item.company_name === selectedCompanyFilter)
      .map(item => normalizeFiscalYear(item.fiscal_year))
      .filter(Boolean))]
        .sort()
        .reverse();

  const fiscalYearOptions = (selectedCompanyFilter === 'all' ?
    [...new Set((fiscalYears || []).map(y => y.fiscal_year).filter(Boolean))]
    : companyFiscalYears)
      .sort()
      .reverse();

  const derivedTaxRate = (() => {
    const gross = filteredItems.reduce((sum, item) => sum + toNum(item.gross_dividend), 0);
    const tax = filteredItems.reduce((sum, item) => sum + toNum(item.tax_amount), 0);
    if (gross <= 0 || tax <= 0) return 0;
    return (tax / gross) * 100;
  })();

  const effectiveTaxRate = taxRate > 0 ? taxRate : derivedTaxRate;

  const sectorInterestRows = sectorSummary.map((row) => {
    const interestPerDay = (row.amount || 0) * (interestRate / 100) / 365;
    const interestPumori = interestPerDay * (interestDays || 0);
    const tax = interestPumori * (effectiveTaxRate / 100);
    const netInterest = interestPumori - tax;
    return {
      ...row,
      interestRate,
      interestPerDay,
      interestPumori,
      interestTax: tax,
      netInterest,
    };
  });

  const companyInterestRows = companySummary.map((row) => {
    const interestPerDay = (row.amount || 0) * (interestRate / 100) / 365;
    const interestPumori = interestPerDay * (interestDays || 0);
    const tax = interestPumori * (effectiveTaxRate / 100);
    const netInterest = interestPumori - tax;
    return {
      ...row,
      interestRate,
      interestPerDay,
      interestPumori,
      interestTax: tax,
      netInterest,
    };
  });

  const displayedCompanyRows = companyInterestRows
    .filter(r => r.company.toLowerCase().includes((companySearch || '').toLowerCase()))
    .slice(0, companyTopN === 'all' ? undefined : parseInt(companyTopN, 10));

  // Compute holder-type breakdown for selected company or 'all'
  const companyTypeRows = selectedCompanyFilter === 'all'
    ? []
    : buildTypeRows(filteredItems.filter(i => i.company_name === selectedCompanyFilter));

  const handleCompanyClick = (companyName) => {
    const details = filteredItems.filter(item => item.company_name === companyName);
    setCompanyDetails(details);
    setSelectedCompany(companyName);
    setShowDetailsModal(true);
  };

  const exportCompanyBreakdown = () => {
    setExportingBreakdown(true);
    try {
      const csvContent = [
        ['Company Name', 'Distinct BOIDs', 'Kitta', 'Amount', 'Tax', 'Net Interest'] ,
        ...companySummary.map(row => [
          row.company,
          row.boidCount,
          row.kitta,
          row.amount.toFixed(2),
          row.tax.toFixed(2),
          row.net.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `dividend-company-interest-breakdown-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export company breakdown');
    } finally {
      setExportingBreakdown(false);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaChartBar style={{ marginRight: '0.5rem' }} /> Stock Dividend Payable - Summary Reports</h2>
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
                        onChange={(val) => handleFiscalYearChange(val)}
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
                              onClick={() => handleFiscalYearChange(fy)}
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
                      {exporting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                      {exporting ? 'Exporting...' : 'Export Full Report'}
                    </Button>
                    <p className="text-muted mb-0 small">
                      Download detailed dividend payable summary as Excel file
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

          {/* Interest Settings removed per request */}

          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading summary data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Sector Summary removed per request */}

              <Card className="chart-card-modern mt-4 summary-report-card">
                <Card.Header className="summary-report-header">
                  <span><FaMoneyBillWave style={{ marginRight: '0.5rem' }} /> Dividend Summary by Sector</span>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">Calculated for the selected period and fiscal settings</p>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0 summary-report-table">
                      <thead>
                      <tr>
                        <th>Name</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Interest %</th>
                        <th className="text-end">Int. Per Day</th>
                        <th className="text-end">Interest Pumori</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Interest Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorInterestRows.map((row, idx) => (
                        <tr key={idx} className={row.isTotal ? 'table-light fw-bold' : ''}>
                          <td>{row.type}</td>
                          <td className="text-end">{row.kitta.toLocaleString('en-NP')}</td>
                          <td className="text-end">{formatCurrency(row.amount)}</td>
                          <td className="text-end">{row.interestRate.toFixed(2)}</td>
                          <td className="text-end">{formatCurrency(row.interestPerDay)}</td>
                          <td className="text-end">{formatCurrency(row.interestPumori)}</td>
                          <td className="text-end">{formatCurrency(row.interestTax)}</td>
                          <td className="text-end">{formatCurrency(row.netInterest)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  </div>
                  {/* Company-wise list calculated using the same interest settings */}
                  <div className="mt-3 summary-report-subsection">
                    <Row className="mb-3 summary-report-controls">
                      <Col md={6} className="mb-2 mb-md-0">
                        <Form.Control
                          type="text"
                          placeholder="Search by company name..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <ButtonGroup className="w-100">
                          <Button variant={companyTopN === '5' ? 'primary' : 'outline-primary'} onClick={() => setCompanyTopN('5')}>Top 5</Button>
                          <Button variant={companyTopN === '10' ? 'primary' : 'outline-primary'} onClick={() => setCompanyTopN('10')}>Top 10</Button>
                          <Button variant={companyTopN === 'all' ? 'primary' : 'outline-primary'} onClick={() => setCompanyTopN('all')}>All</Button>
                        </ButtonGroup>
                      </Col>
                    </Row>
                  <div className="table-responsive mt-2">
                    <div className="d-flex justify-content-end mb-2 summary-report-toolbar">
                      <Button variant="success" size="sm" onClick={exportCompanyBreakdown} disabled={exportingBreakdown || companySummary.length === 0}>
                        {exportingBreakdown ? 'Exporting...' : 'Export to CSV'}
                      </Button>
                    </div>
                    {selectedCompanyFilter === 'all' ? (
                      <Table className="table-modern mb-0 summary-report-table">
                        <thead>
                          <tr>
                            <th>Company Name</th>
                            <th className="text-end">Distinct BOIDs</th>
                            <th className="text-end">Net Interest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedCompanyRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <Button variant="link" className="p-0 text-start summary-row-action" onClick={() => handleCompanyClick(row.company)}>
                                  {row.company}
                                </Button>
                              </td>
                              <td className="text-end">
                                <Button
                                  variant="link"
                                  className="p-0 summary-row-action summary-row-action-count"
                                  onClick={() => handleCompanyClick(row.company)}
                                >
                                  {row.boidCount}
                                </Button>
                              </td>
                              <td className="text-end">{formatCurrency(row.netInterest)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
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
                          {companyTypeRows.map((row, idx) => (
                            <tr key={idx} className={row.isTotal ? 'table-active fw-bold' : ''}>
                              <td>{row.type}</td>
                              <td className="text-end">{row.count}</td>
                              <td className="text-end">{formatCurrency(row.amount)}</td>
                              <td className="text-end">{formatCurrency(row.tax)}</td>
                              <td className="text-end">{formatCurrency(row.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </div>
                </Card.Body>
              </Card>

              {/* Dividend Summary by Type removed per request */}
            </>
          )}
        </Container>
      </div>
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Dividend Payables - {selectedCompany}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="table-responsive">
            <Table className="table-modern">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>BOID</th>
                  <th>Holder Type</th>
                  <th className="text-end">Shares Held</th>
                  <th className="text-end">Gross Dividend</th>
                  <th className="text-end">Tax</th>
                  <th className="text-end">Net Dividend</th>
                  <th>Payment Status</th>
                  <th>Declared Date</th>
                </tr>
              </thead>
              <tbody>
                {companyDetails.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.client_name}</td>
                    <td>{item.client_boid || '-'}</td>
                    <td>{item.holder_type}</td>
                    <td className="text-end">{(item.shares_held || 0).toLocaleString('en-NP')}</td>
                    <td className="text-end">{formatCurrency(item.gross_dividend)}</td>
                    <td className="text-end">{formatCurrency(item.tax_amount)}</td>
                    <td className="text-end">{formatCurrency(item.net_payable)}</td>
                    <td>
                      <span className={`badge bg-${item.payment_status === 'Paid' ? 'success' : 'warning'}`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td>{item.declaration_date}</td>
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
    </>
  );
};

export default DividendSummaryReports;

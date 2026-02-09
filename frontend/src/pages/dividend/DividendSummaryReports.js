import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Alert, Table, Form, Row, Col, Dropdown } from 'react-bootstrap';
import { FaChartBar, FaCog, FaMoneyBillWave, FaDownload, FaBuilding, FaUsers, FaChevronRight } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { reportService, dividendService, settingsService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendSummaryReports = () => {
  const [interestRate, setInterestRate] = useState(7);
  const [taxRate, setTaxRate] = useState(0);
  const [interestDays, setInterestDays] = useState(0);
  const [useRangeDays, setUseRangeDays] = useState(true);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryRows, setSummaryRows] = useState([]);
  const [sectorSummary, setSectorSummary] = useState([]);

  const summarize = (items) => ({
    kitta: items.reduce((sum, item) => sum + (item.shares_held || 0), 0),
    amount: items.reduce((sum, item) => sum + (item.gross_dividend || 0), 0),
    tax: items.reduce((sum, item) => sum + (item.tax_amount || 0), 0),
    net: items.reduce((sum, item) => sum + (item.net_payable || 0), 0),
  });

  const fetchSummary = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      params.page_size = 1000;
      const response = await dividendService.getAll(params);
      const items = normalizeList(response.data);

      const taxExempted = items.filter(item => Number(item.tax_amount || 0) === 0);
      const institution = items.filter(item => item.holder_type === 'Institution' && Number(item.tax_amount || 0) !== 0);
      const publicItems = items.filter(item => item.holder_type === 'Public' && Number(item.tax_amount || 0) !== 0);

      const totalSummary = summarize(items);
      setSummaryRows([
        { type: 'Public', ...summarize(publicItems) },
        { type: 'Institution', ...summarize(institution) },
        { type: 'Tax Exempted', ...summarize(taxExempted) },
        { type: 'Total', ...totalSummary, isTotal: true },
      ]);

      // Sector-wise summary (Public, Private, Tax-Exempted)
      const publicSector = items.filter(item => item.company_sector === 'Public');
      const privateSector = items.filter(item => item.company_sector === 'Private');
      const taxExemptedSector = items.filter(item => item.company_sector === 'Tax Exempted' || (item.company_sector && item.company_sector.toLowerCase().includes('exempt')));
      
      setSectorSummary([
        { type: 'Public', ...summarize(publicSector) },
        { type: 'Private', ...summarize(privateSector) },
        { type: 'Tax-Exempted Sector', ...summarize(taxExemptedSector) },
        { type: 'Total', ...totalSummary, isTotal: true },
      ]);

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch summary data');
      setSummaryRows([]);
      setSectorSummary([]);
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
          setSelectedFiscalYear(activeYear.id);
          setInterestRate(parseFloat(activeYear.interest_rate));
          setTaxRate(parseFloat(activeYear.tax_rate));
        }
      } catch (err) {
        console.error('Failed to load fiscal years', err);
      }
    };
    fetchFiscalYears();
  }, []);

  const handleFiscalYearChange = (yearId) => {
    setSelectedFiscalYear(yearId);
    const selectedYear = fiscalYears.find(y => y.id === parseInt(yearId));
    if (selectedYear) {
      setInterestRate(parseFloat(selectedYear.interest_rate));
      setTaxRate(parseFloat(selectedYear.tax_rate));
    }
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
    if (useRangeDays) {
      setInterestDays(computeRangeDays(range.fromDate, range.toDate));
    }
  }, [range, useRangeDays]);


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

  const sectorInterestRows = sectorSummary.map((row) => {
    const interestPerDay = (row.amount || 0) * (interestRate / 100) / 365;
    const interestPumori = interestPerDay * (interestDays || 0);
    const tax = interestPumori * (taxRate / 100);
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

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaChartBar style={{ marginRight: '0.5rem' }} /> Stock Dividend Payable - Summary Reports</h2>
          <Card className="filter-card-modern">
            <Card.Body>
              <DateRangeFilter onApply={setRange} />
            </Card.Body>
          </Card>
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          <Card className="chart-card-modern mt-3">
            <Card.Header><FaDownload style={{ marginRight: '0.5rem' }} /> Export Options</Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">{rangeText}</p>
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleExport}
                  disabled={exporting}
                  className="d-flex align-items-center gap-2"
                >
                  {exporting && <div className="spinner-border spinner-border-sm" role="status"></div>}
                  {exporting ? 'Exporting...' : 'Export Full Report'}
                </Button>
                <p className="text-muted mb-0 ms-2 align-self-center">
                  Download detailed dividend payable summary as Excel file
                </p>
              </div>
            </Card.Body>
          </Card>

          <Card className="chart-card-modern mt-3">
            <Card.Header><FaCog style={{ marginRight: '0.5rem' }} /> Interest Settings</Card.Header>
            <Card.Body>
              <Row className="g-3">
              <Col md={3}>
                <Form.Label>Fiscal Year</Form.Label>
                <Dropdown>
                  <Dropdown.Toggle
                    className="modern-dropdown-toggle"
                    style={{
                      background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
                      color: '#8860D0',
                      border: '2px solid #e9d5ff',
                      padding: '10px 16px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(136, 96, 208, 0.1)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>
                      {selectedFiscalYear === '' ? 'Manual Entry' : (
                        fiscalYears.find(y => y.id === parseInt(selectedFiscalYear))?.fiscal_year +
                        (fiscalYears.find(y => y.id === parseInt(selectedFiscalYear))?.is_active ? ' (Active)' : '')
                      )}
                    </span>
                    <FaChevronRight size={12} style={{ transition: 'transform 0.18s ease' }} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e9d5ff',
                      boxShadow: '0 8px 24px rgba(136, 96, 208, 0.15)',
                      padding: '8px',
                      animation: 'dropdownSlideIn 0.2s ease-out',
                      width: '100%',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}
                  >
                    <Dropdown.Item
                      onClick={() => handleFiscalYearChange('')}
                      className="modern-dropdown-item"
                      active={selectedFiscalYear === ''}
                      style={{
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '4px',
                        fontWeight: selectedFiscalYear === '' ? '600' : '500',
                        transition: 'all 0.2s ease',
                        background: selectedFiscalYear === '' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                        color: selectedFiscalYear === '' ? '#ffffff' : '#374151'
                      }}
                    >
                      Manual Entry
                    </Dropdown.Item>
                    {fiscalYears.map(year => (
                      <Dropdown.Item
                        key={year.id}
                        onClick={() => handleFiscalYearChange(year.id.toString())}
                        className="modern-dropdown-item"
                        active={selectedFiscalYear === year.id.toString()}
                        style={{
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginBottom: '4px',
                          fontWeight: selectedFiscalYear === year.id.toString() ? '600' : '500',
                          transition: 'all 0.2s ease',
                          background: selectedFiscalYear === year.id.toString() ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                          color: selectedFiscalYear === year.id.toString() ? '#ffffff' : '#374151'
                        }}
                      >
                        {year.fiscal_year} {year.is_active && '(Active)'}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
              <Col md={3}>
                <Form.Label>Interest Rate (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value || 0))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Tax Rate (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value || 0))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Interest Days</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  value={interestDays}
                  onChange={(e) => setInterestDays(Number(e.target.value || 0))}
                  disabled={useRangeDays}
                />
                <Form.Check
                  type="switch"
                  id="use-range-days"
                  className="mt-2"
                  label="Use date range days"
                  checked={useRangeDays}
                  onChange={(e) => setUseRangeDays(e.target.checked)}
                />
              </Col>
            </Row>
          </Card.Body>
          </Card>

          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading summary data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Sector Summary Section */}
              <Card className="chart-card-modern mt-4">
                <Card.Header><FaBuilding style={{ marginRight: '0.5rem' }} /> Stock Dividend Summary by Sector</Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">Breakdown by company sector (Public/Private/Tax-Exempted)</p>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Name</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Dividend Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorSummary.map((row, idx) => (
                        <tr key={idx} className={row.isTotal ? 'table-light fw-bold' : ''}>
                          <td>{row.type}</td>
                          <td className="text-end">{row.kitta.toLocaleString('en-NP')}</td>
                          <td className="text-end">{formatCurrency(row.amount)}</td>
                          <td className="text-end">{formatCurrency(row.tax)}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  </div>
                </Card.Body>
              </Card>

              <Card className="chart-card-modern mt-4">
                <Card.Header><FaMoneyBillWave style={{ marginRight: '0.5rem' }} /> Interest-Style Summary by Sector</Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">Calculated using the interest settings above</p>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Name</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Intrest %</th>
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
                </Card.Body>
              </Card>

              <Card className="chart-card-modern mt-4">
                <Card.Header><FaUsers style={{ marginRight: '0.5rem' }} /> Dividend Summary by Type</Card.Header>
                <Card.Body>
                  <p className="text-muted small mb-3">Breakdown by holder category (Public/Institution/Tax-Exempted)</p>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Type</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount/Dividend</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Dividend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row, idx) => (
                        <tr key={idx} className={row.isTotal ? 'table-light fw-bold' : ''}>
                          <td>{row.type}</td>
                          <td className="text-end">{row.kitta.toLocaleString('en-NP')}</td>
                          <td className="text-end">{formatCurrency(row.amount)}</td>
                          <td className="text-end">{formatCurrency(row.tax)}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}
        </Container>
      </div>
    </>
  );
};

export default DividendSummaryReports;

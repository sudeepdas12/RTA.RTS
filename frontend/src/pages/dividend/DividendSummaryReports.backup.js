import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Spinner, Alert, Table } from 'react-bootstrap';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { reportService, dividendService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';

const DividendSummaryReports = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryRows, setSummaryRows] = useState([]);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);

  const summarize = (items) => ({
    kitta: items.reduce((sum, item) => sum + (item.shares_held || 0), 0),
    amount: items.reduce((sum, item) => sum + (item.gross_dividend || 0), 0),
    tax: items.reduce((sum, item) => sum + (item.tax_amount || 0), 0),
    net: items.reduce((sum, item) => sum + (item.net_payable || 0), 0),
  });

  const fetchSummary = async (dateRange) => {
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

      // Company breakdown
      const companySummary = {};
      items.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { kitta: 0, amount: 0, tax: 0, net: 0 };
        }
        companySummary[company].kitta += item.shares_held || 0;
        companySummary[company].amount += item.gross_dividend || 0;
        companySummary[company].tax += item.tax_amount || 0;
        companySummary[company].net += item.net_payable || 0;
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({ company: name, ...data }))
        .sort((a, b) => b.net - a.net);
      setCompanyBreakdown(companyRows);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch summary data');
      setSummaryRows([]);
      setCompanyBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(range);
  }, [range]);

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

  return (
    <>
      <NavigationBar />
      <Container fluid className="mt-4">
        <h2 className="mb-3">Stock Dividend Payable - Summary Reports</h2>
        <DateRangeFilter onApply={setRange} />
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        <Card className="shadow-sm mt-3">
          <Card.Body>
            <p className="text-muted mb-3">{rangeText}</p>
            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={exporting}
                className="d-flex align-items-center gap-2"
              >
                {exporting && <Spinner animation="border" size="sm" />}
                {exporting ? 'Exporting...' : 'Export Report'}
              </Button>
              <p className="text-muted mb-0 ms-2 align-self-center">
                Download detailed dividend payable summary as Excel file
              </p>
            </div>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mt-4">
          <Card.Body>
            <h5 className="mb-3">Dividend Summary by Type</h5>
            <p className="text-muted small mb-3">Breakdown by holder category (Public/Institution/Tax-Exempted)</p>
            {loading ? (
              <div className="text-center mt-2">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead className="table-light">
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
            )}
          </Card.Body>
        </Card>

        <Card className="shadow-sm mt-4">
          <Card.Body>
            <h5 className="mb-3">Company-wise Breakdown</h5>
            <p className="text-muted small mb-3">
              Dividend payables grouped by company ({companyBreakdown.length} companies)
            </p>
            {loading ? (
              <div className="text-center mt-2">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped bordered hover className="mb-0">
                  <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th>Company Name</th>
                      <th className="text-end">Kitta</th>
                      <th className="text-end">Gross Dividend</th>
                      <th className="text-end">Tax</th>
                      <th className="text-end">Net Dividend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyBreakdown.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.company}</td>
                        <td className="text-end">{row.kitta.toLocaleString('en-NP')}</td>
                        <td className="text-end">{formatCurrency(row.amount)}</td>
                        <td className="text-end">{formatCurrency(row.tax)}</td>
                        <td className="text-end">{formatCurrency(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default DividendSummaryReports;

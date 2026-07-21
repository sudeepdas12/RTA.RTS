import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Table } from 'react-bootstrap';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { interestService, companyService, clientService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';

const InterestDashboard = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [metrics, setMetrics] = useState({ total: 0, count: 0, paid: 0, pending: 0 });
  const [summaryRows, setSummaryRows] = useState([]);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (dateRange) => {
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
      const total = items.reduce((sum, item) => sum + (item.net_payable || 0), 0);
      const paid = items.filter(item => item.payment_status === 'Paid')
        .reduce((sum, item) => sum + (item.net_payable || 0), 0);
      const pending = items.filter(item => item.payment_status === 'Pending')
        .reduce((sum, item) => sum + (item.net_payable || 0), 0);
      setMetrics({
        total,
        count: items.length,
        paid,
        pending,
      });

      const publicCompanyIds = new Set(normalizeList(publicCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const taxExemptCompanyIds = new Set(normalizeList(taxExemptCompaniesResponse.data).map(c => c.company_id ?? c.id));
      const institutionClientIds = new Set(normalizeList(institutionClientsResponse.data).map(c => c.client_id ?? c.id));

      const summarize = (filteredItems) => ({
        count: filteredItems.length,
        gross: filteredItems.reduce((sum, item) => sum + (item.gross_interest || 0), 0),
        tax: filteredItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0),
        net: filteredItems.reduce((sum, item) => sum + (item.net_payable || 0), 0),
      });

      const publicSummary = summarize(items.filter(item => publicCompanyIds.has(item.company)));
      const institutionSummary = summarize(items.filter(item => institutionClientIds.has(item.client)));
      const taxExemptSummary = summarize(items.filter(item => taxExemptCompanyIds.has(item.company)));
      const totalSummary = summarize(items);

      setSummaryRows([
        { type: 'Public', ...publicSummary },
        { type: 'Institution', ...institutionSummary },
        { type: 'Tax Exempted', ...taxExemptSummary },
        { type: 'Total', ...totalSummary, isTotal: true },
      ]);

      const companySummary = {};
      items.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { count: 0, gross: 0, tax: 0, net: 0 };
        }
        companySummary[company].count++;
        companySummary[company].gross += item.gross_interest || 0;
        companySummary[company].tax += item.tax_amount || 0;
        companySummary[company].net += item.net_payable || 0;
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({ company: name, ...data }))
        .sort((a, b) => b.net - a.net);
      setCompanyBreakdown(companyRows);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setMetrics({ total: 0, count: 0, paid: 0, pending: 0 });
      setSummaryRows([]);
      setCompanyBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <Container fluid className="mt-4">
        <h2 className="mb-3">Debenture Interest Payable - Dashboard</h2>
        <DateRangeFilter onApply={setRange} />
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        {loading ? (
          <div className="text-center mt-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : (
          <>
            <p className="text-muted mt-3">{rangeText}</p>
            <Row className="g-3 mt-1">
              <Col md={6} lg={3}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <Card.Title className="text-muted small">Total Amount</Card.Title>
                    <h4 className="text-primary">{formatCurrency(metrics.total)}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <Card.Title className="text-muted small">Records Count</Card.Title>
                    <h4 className="text-info">{metrics.count}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <Card.Title className="text-muted small">Paid Amount</Card.Title>
                    <h4 className="text-success">{formatCurrency(metrics.paid)}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <Card.Title className="text-muted small">Pending Amount</Card.Title>
                    <h4 className="text-warning">{formatCurrency(metrics.pending)}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            <Card className="shadow-sm mt-4">
              <Card.Body>
                <h5 className="mb-3">Interest Summary by Type</h5>
                <p className="text-muted small mb-3">Breakdown by holder category (Public/Institution/Tax-Exempted)</p>
                <div className="table-responsive">
                  <Table striped bordered hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Type</th>
                        <th className="text-end">Kitta</th>
                        <th className="text-end">Amount/Interest</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Interest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row, idx) => (
                        <tr key={idx} className={row.isTotal ? 'table-light fw-bold' : ''}>
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

            <Card className="shadow-sm mt-4">
              <Card.Body>
                <h5 className="mb-3">Company-wise Breakdown</h5>
                <p className="text-muted small mb-3">
                  Interest payables grouped by company ({companyBreakdown.length} companies)
                </p>
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <Table striped bordered hover className="mb-0">
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th>Company Name</th>
                        <th className="text-end">Records</th>
                        <th className="text-end">Gross Interest</th>
                        <th className="text-end">Tax</th>
                        <th className="text-end">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyBreakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.company}</td>
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
          </>
        )}
      </Container>
    </>
  );
};

export default InterestDashboard;

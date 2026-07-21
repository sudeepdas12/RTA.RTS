import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Table } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { FaMoneyBillWave, FaFileInvoice, FaCheckCircle, FaClock, FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { interestService, companyService, clientService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const InterestDashboard = () => {
  const toNumber = (value) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [metrics, setMetrics] = useState({ total: 0, count: 0, paid: 0, pending: 0 });
  const [summaryRows, setSummaryRows] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (dateRange) => {
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
      const total = items.reduce((sum, item) => sum + toNumber(item.net_payable), 0);
      const paid = items.filter(item => item.payment_status === 'Paid')
        .reduce((sum, item) => sum + toNumber(item.net_payable), 0);
      const pending = items.filter(item => item.payment_status === 'Pending')
        .reduce((sum, item) => sum + toNumber(item.net_payable), 0);
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
        gross: filteredItems.reduce((sum, item) => sum + toNumber(item.gross_interest), 0),
        tax: filteredItems.reduce((sum, item) => sum + toNumber(item.tax_amount), 0),
        net: filteredItems.reduce((sum, item) => sum + toNumber(item.net_payable), 0),
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

      // Company breakdown with payment status
      const companySummary = {};
      items.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { count: 0, gross: 0, tax: 0, net: 0, paid: 0, pending: 0 };
        }
        companySummary[company].count++;
        const grossInterest = toNumber(item.gross_interest);
        const taxAmount = toNumber(item.tax_amount);
        const netPayable = toNumber(item.net_payable);
        companySummary[company].gross += grossInterest;
        companySummary[company].tax += taxAmount;
        companySummary[company].net += netPayable;
        if (item.payment_status === 'Paid') {
          companySummary[company].paid += netPayable;
        } else if (item.payment_status === 'Pending') {
          companySummary[company].pending += netPayable;
        }
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({ company: name, ...data }))
        .sort((a, b) => b.net - a.net);
      setAllCompanies(companyRows);
      console.log('Interest data loaded - items count:', items.length);
      console.log('Company summary:', companyRows.length, 'companies');
      console.log('Top 10 companies:', companyRows.slice(0, 10));
      console.log('Top 10 net values:', companyRows.slice(0, 10).map(r => ({ company: r.company, net: r.net })));
    } catch (err) {
      console.error('Error fetching interest data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setMetrics({ total: 0, count: 0, paid: 0, pending: 0 });
      setSummaryRows([]);
      setAllCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  // Prepare pie chart data (top 10 companies)
  const topCompanies = allCompanies.slice(0, 10);
  const topNetValues = topCompanies.map(row => toNumber(row.net));
  const hasTopNetValues = topNetValues.some(v => v > 0);

  console.log('Pie chart - topCompanies count:', topCompanies.length);
  console.log('Pie chart - topNetValues:', topNetValues);
  console.log('Pie chart - hasTopNetValues:', hasTopNetValues);
  console.log('Pie chart - allCompanies total:', allCompanies.length);

  const pieChartData = {
    labels: topCompanies.map(row => row.company),
    datasets: [
      {
        label: 'Net Payable',
        data: topNetValues,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
          position: 'bottom',
        labels: {
            padding: 15,
            font: {
              size: 12
            }
        }
      },
      tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          padding: 12,
          titleColor: '#f1f5f9',
          bodyColor: '#f1f5f9',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = toNumber(context.parsed);
            const total = context.dataset.data.reduce((a, b) => a + toNumber(b), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">≡ƒÆ╝ Debenture Interest Payable - Dashboard</h2>
          <DateRangeFilter onApply={setRange} />
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading interest data...</p>
              </div>
            </div>
          ) : allCompanies.length === 0 && error ? (
            <Alert variant="warning" className="mt-3">
              {error} - Please ensure you are logged in.
            </Alert>
          ) : (
            <>
              <p className="text-muted mt-3 mb-4">{rangeText}</p>
              <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                  <Card className="modern-stat-card card-warning">
                    <Card.Body>
                      <div className="stat-icon-modern">
                        <FaMoneyBillWave />
                      </div>
                      <div className="stat-value-modern stat-value-large">{formatCurrency(metrics.total)}</div>
                      <div className="stat-label-modern">Total Amount</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="modern-stat-card card-primary">
                    <Card.Body>
                      <div className="stat-icon-modern">
                        <FaFileInvoice />
                      </div>
                      <div className="stat-value-modern">{metrics.count}</div>
                      <div className="stat-label-modern">Records Count</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="modern-stat-card card-success">
                    <Card.Body>
                      <div className="stat-icon-modern">
                        <FaCheckCircle />
                      </div>
                      <div className="stat-value-modern stat-value-large">{formatCurrency(metrics.paid)}</div>
                      <div className="stat-label-modern">Paid Amount</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="modern-stat-card card-danger">
                    <Card.Body>
                      <div className="stat-icon-modern">
                        <FaClock />
                      </div>
                      <div className="stat-value-modern stat-value-large">{formatCurrency(metrics.pending)}</div>
                      <div className="stat-label-modern">Pending Amount</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col lg={7} className="mb-3">
                  <Card className="chart-card-modern">
                    <Card.Header><FaMoneyBillWave style={{ marginRight: '0.5rem' }} /> Interest Distribution - Top 10 Companies</Card.Header>
                    <Card.Body className="chart-body-modern chart-body-large">
                      {console.log('Rendering pie - topCompanies:', topCompanies.length, 'hasValues:', hasTopNetValues)}
                      {topCompanies.length > 0 && hasTopNetValues ? (
                        <Pie data={pieChartData} options={pieChartOptions} />
                      ) : (
                        <p className="text-muted text-center">
                          {topCompanies.length === 0 ? 'No companies data' : 'No payable values to chart'}
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col lg={5}>
                  <Card className="chart-card-modern">
                    <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> Interest Summary by Type</Card.Header>
                    <Card.Body>
                      <p className="text-muted small mb-3">Breakdown by holder category</p>
                      <Table className="table-modern mb-0">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th className="text-end">Records</th>
                            <th className="text-end">Net Interest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryRows.map((row, idx) => (
                            <tr key={idx} className={row.isTotal ? 'fw-bold' : ''}>
                              <td>{row.type}</td>
                              <td className="text-end">{row.count}</td>
                              <td className="text-end">{formatCurrency(row.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="chart-card-modern">
              <Card.Header>
                <FaChartBar style={{ marginRight: '0.5rem' }} /> Top Companies Overview
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <p className="text-muted small mb-0">
                      Quick view of top 10 companies by net payable
                    </p>
                </div>
                <div className="table-responsive">
                  <Table className="table-modern mb-0">
                    <thead>
                      <tr>
                        <th>Company Name</th>
                        <th className="text-end">Records</th>
                        <th className="text-end">Net Payable</th>
                        <th className="text-end">Paid</th>
                        <th className="text-end">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCompanies.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.company}</td>
                          <td className="text-end">{row.count}</td>
                          <td className="text-end">{formatCurrency(row.net)}</td>
                          <td className="text-end text-success">{formatCurrency(row.paid)}</td>
                          <td className="text-end text-warning">{formatCurrency(row.pending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="text-center mt-3">
                  <p className="text-muted small">
                    For detailed company breakdown with search and export, visit <a href="/interest/summary-reports">Summary Reports</a>
                  </p>
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

export default InterestDashboard;

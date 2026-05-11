import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Button, Table, Modal } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { FaDollarSign, FaFileInvoice, FaCheckCircle, FaClock, FaChartLine, FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { dividendService } from '../../services/api';
import { buildDateParams, formatCurrency } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const DividendDashboard = () => {
  const toNumber = (value) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const fetchAllDividendItems = async (baseParams = {}) => {
    const all = [];
    let page = 1;
    while (true) {
      const response = await dividendService.getAll({ ...baseParams, page, page_size: 1000 });
      const data = response?.data;
      if (Array.isArray(data)) {
        all.push(...data);
        break;
      }
      const rows = Array.isArray(data?.results) ? data.results : [];
      all.push(...rows);
      if (!data?.next) break;
      page += 1;
      if (page > 500) break;
    }
    return all;
  };

  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [metrics, setMetrics] = useState({ total: 0, count: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportingBreakdown, setExportingBreakdown] = useState(false);
  const [allDividendData, setAllDividendData] = useState([]);

  const fetchData = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      const items = await fetchAllDividendItems(params);
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

      const companySummary = {};
      items.forEach(item => {
        const company = item.company_name || 'Unknown';
        if (!companySummary[company]) {
          companySummary[company] = { kitta: 0, amount: 0, tax: 0, net: 0, paid: 0, pending: 0 };
        }
        companySummary[company].kitta += toNumber(item.shares_held);
        companySummary[company].amount += toNumber(item.gross_dividend);
        companySummary[company].tax += toNumber(item.tax_amount);
        companySummary[company].net += toNumber(item.net_payable);
        if (item.payment_status === 'Paid') {
          companySummary[company].paid += toNumber(item.net_payable);
        } else if (item.payment_status === 'Pending') {
          companySummary[company].pending += toNumber(item.net_payable);
        }
      });
      const companyRows = Object.entries(companySummary)
        .map(([name, data]) => ({ company: name, ...data }))
        .sort((a, b) => b.net - a.net);
      setCompanyBreakdown(companyRows);
      setAllCompanies(companyRows);
      setAllDividendData(items);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setMetrics({ total: 0, count: 0, paid: 0, pending: 0 });
      setCompanyBreakdown([]);
      setAllCompanies([]);
      setAllDividendData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);


  const handleCompanyClick = (companyName) => {
    const details = allDividendData.filter(item => item.company_name === companyName);
    setCompanyDetails(details);
    setSelectedCompany(companyName);
    setShowDetailsModal(true);
  };

  const exportCompanyBreakdown = () => {
    setExportingBreakdown(true);
    try {
      const csvContent = [
        ['Company Name', 'Kitta', 'Gross Dividend', 'Tax', 'Net Dividend', 'Paid', 'Pending'],
        ...allCompanies.map(row => [
          row.company,
          row.kitta,
          row.amount.toFixed(2),
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
      link.setAttribute('download', `dividend-company-breakdown-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export company breakdown');
    } finally {
      setExportingBreakdown(false);
    }
  };

  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  const pieChartData = {
    labels: allCompanies.slice(0, 10).map(row => row.company),
    datasets: [
      {
        label: 'Net Dividend',
        data: allCompanies.slice(0, 10).map(row => row.net),
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <>
      <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <h2 className="dashboard-header"><FaChartLine style={{ marginRight: '0.5rem' }} /> Stock Dividend Payable - Dashboard</h2>
        <DateRangeFilter onApply={setRange} />
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading dividend data...</p>
              </div>
          </div>
        ) : (
          <>
              <p className="text-muted mt-3 mb-4">{rangeText}</p>
            <Row className="mb-4">
              <Col lg={3} md={6} className="mb-3">
                <Card className="modern-stat-card card-warning">
                  <Card.Body>
                    <div className="stat-icon-modern">
                      <FaDollarSign />
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
                  <Card.Header><FaDollarSign style={{ marginRight: '0.5rem' }} /> Company Distribution - Top 10</Card.Header>
                  <Card.Body className="chart-body-modern chart-body-large">
                      {allCompanies.length > 0 ? (
                        <Pie data={pieChartData} options={pieChartOptions} />
                      ) : (
                        <p className="text-muted text-center">No data available</p>
                      )}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5} className="mb-3">
                <Card className="chart-card-modern">
                  <Card.Header>
                    <FaChartBar style={{ marginRight: '0.5rem' }} /> Company-wise Breakdown
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">
                      Dividend payables grouped by company ({allCompanies.length} companies)
                    </p>
                    <div className="d-flex justify-content-end mb-3">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={exportCompanyBreakdown}
                        disabled={exportingBreakdown || allCompanies.length === 0}
                      >
                        {exportingBreakdown ? 'Exporting...' : 'Export to CSV'}
                      </Button>
                    </div>

                    <div className="table-responsive">
                      <Table className="table-modern mb-0">
                        <thead className="table-sticky-header">
                          <tr>
                            <th>Company Name</th>
                            <th className="text-end">Net Dividend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyBreakdown.slice(0, 8).map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <Button
                                  variant="link"
                                  className="p-0 text-start table-action-text"
                                  onClick={() => handleCompanyClick(row.company)}
                                >
                                  {row.company}
                                </Button>
                              </td>
                              <td className="text-end">{formatCurrency(row.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
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
            <Table className="table-modern mb-0">
              <thead>
                <tr>
                  <th>Client Name</th>
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

export default DividendDashboard;

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { FaMoneyBillWave, FaDollarSign, FaChartLine, FaBuilding, FaUsers } from 'react-icons/fa';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { reportService } from '../services/api';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await reportService.getDashboard();
      setData(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <Container className="text-center mt-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading dashboard...</p>
        </Container>
      </>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Chart data for company-wise interest
  const interestChartData = {
    labels: data?.company_interest?.map(item => item.company__company_name) || [],
    datasets: [
      {
        label: 'Interest Payables',
        data: data?.company_interest?.map(item => item.total) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart data for company-wise dividend
  const dividendChartData = {
    labels: data?.company_dividend?.map(item => item.company__company_name) || [],
    datasets: [
      {
        label: 'Dividend Payables',
        data: data?.company_dividend?.map(item => item.total) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <NavigationBar />
      <Container fluid>
        <h2 className="mb-4">Dashboard</h2>

        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center shadow-sm stat-card">
              <Card.Body>
                <div className="stat-icon text-primary">
                  <FaBuilding />
                </div>
                <div className="stat-value">{data?.total_companies || 0}</div>
                <div className="stat-label">Active Companies</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm stat-card">
              <Card.Body>
                <div className="stat-icon text-success">
                  <FaUsers />
                </div>
                <div className="stat-value">{data?.total_clients || 0}</div>
                <div className="stat-label">Active Clients</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm stat-card">
              <Card.Body>
                <div className="stat-icon text-info">
                  <FaMoneyBillWave />
                </div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(data?.interest?.total_net || 0).split('.')[0]}</div>
                <div className="stat-label">Interest Payables</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center shadow-sm stat-card">
              <Card.Body>
                <div className="stat-icon text-warning">
                  <FaDollarSign />
                </div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(data?.dividend?.total_net || 0).split('.')[0]}</div>
                <div className="stat-label">Dividend Payables</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Interest Summary */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <strong>💰 Interest Payables Summary</strong>
              </Card.Header>
              <Card.Body>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Records:</strong></td>
                      <td><strong style={{ color: '#667eea' }}>{data?.interest?.count || 0}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Gross Amount:</strong></td>
                      <td>{formatCurrency(data?.interest?.total_gross || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Tax Amount:</strong></td>
                      <td>{formatCurrency(data?.interest?.total_tax || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Net Payable:</strong></td>
                      <td><strong style={{ color: '#667eea' }}>{formatCurrency(data?.interest?.total_net || 0)}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Paid:</strong></td>
                      <td style={{ color: '#27ae60', fontWeight: '600' }}>✓ {formatCurrency(data?.interest?.paid || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Pending:</strong></td>
                      <td style={{ color: '#e74c3c', fontWeight: '600' }}>⏳ {formatCurrency(data?.interest?.pending || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>

          {/* Dividend Summary */}
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <strong>📊 Dividend Payables Summary</strong>
              </Card.Header>
              <Card.Body>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Records:</strong></td>
                      <td><strong style={{ color: '#f5576c' }}>{data?.dividend?.count || 0}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Gross Amount:</strong></td>
                      <td>{formatCurrency(data?.dividend?.total_gross || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Tax Amount:</strong></td>
                      <td>{formatCurrency(data?.dividend?.total_tax || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Net Payable:</strong></td>
                      <td><strong style={{ color: '#f5576c' }}>{formatCurrency(data?.dividend?.total_net || 0)}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Paid:</strong></td>
                      <td style={{ color: '#27ae60', fontWeight: '600' }}>✓ {formatCurrency(data?.dividend?.paid || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Pending:</strong></td>
                      <td style={{ color: '#e74c3c', fontWeight: '600' }}>⏳ {formatCurrency(data?.dividend?.pending || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header>
                <strong>Top Companies - Interest Payables</strong>
              </Card.Header>
              <Card.Body>
                <Bar data={interestChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header>
                <strong>Top Companies - Dividend Payables</strong>
              </Card.Header>
              <Card.Body>
                <Bar data={dividendChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Dashboard;

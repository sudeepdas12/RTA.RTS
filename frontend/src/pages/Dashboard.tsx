/**
 * Dashboard Page - Phase 2 Optimized
 * Real-time metrics with React Query auto-refresh
 */

import { useEffect } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import {
  FaMoneyBillWave, FaBuilding, FaUsers, FaArrowUp, FaArrowDown,
  FaChartLine, FaTachometerAlt, FaMoneyCheckAlt, FaChartBar, FaListAlt
} from 'react-icons/fa';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useDashboardStats } from '../hooks/useQueries';
import NavigationBar from '../components/NavigationBar';
import '../styles/dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard: React.FC = () => {
  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: dashboardData, isLoading, refetch } = useDashboardStats();

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60000);

    return () => clearInterval(interval);
  }, [refetch]);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const formatCurrency = (value: number | undefined): string => {
    const formatted = new Intl.NumberFormat('ne-NP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
    return `रू ${formatted}`;
  };

  const formatNumber = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-NP').format(value || 0);
  };

  const buildBarGradient = (ctx: CanvasRenderingContext2D | null, chartArea: any): CanvasGradient => {
    if (!ctx || !chartArea) {
      const canvas = document.createElement('canvas');
      const gradCtx = canvas.getContext('2d');
      const gradient = gradCtx?.createLinearGradient(0, 30, 0, 300);
      gradient?.addColorStop(0, 'rgba(79, 70, 229, 0.8)');
      gradient?.addColorStop(1, 'rgba(79, 70, 229, 0.2)');
      return gradient as CanvasGradient;
    }
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.8)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.2)');
    return gradient;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  const data: any = dashboardData || {};
  const interestData = data.interest || {};
  const dividendData = data.dividend || {};

  const totalInterest = interestData.total_net || 0;
  const paidInterest = interestData.paid || 0;
  const partialInterest = interestData.partial || 0;
  const pendingInterest = interestData.pending || 0;

  const totalDividend = dividendData.total_net || 0;
  const paidDividend = dividendData.paid || 0;
  const partialDividend = dividendData.partial || 0;
  const pendingDividend = dividendData.pending || 0;

  const totalPaid = paidInterest + paidDividend;
  const totalPartial = partialInterest + partialDividend;
  const totalPending = pendingInterest + pendingDividend;

  // Chart data
  const paymentStatusChart = {
    labels: ['Paid', 'Partial', 'Pending'],
    datasets: [
      {
        label: 'Amount (रू)',
        data: [totalPaid, totalPartial, totalPending],
        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
        borderColor: ['#198754', '#ffc107', '#dc3545'],
        borderWidth: 2,
      },
    ],
  };

  const payableBreakdownChart = {
    labels: ['Interest', 'Dividend'],
    datasets: [
      {
        data: [totalInterest, totalDividend],
        backgroundColor: ['rgba(79, 70, 229, 0.7)', 'rgba(244, 164, 96, 0.7)'],
        borderColor: ['rgb(79, 70, 229)', 'rgb(244, 164, 96)'],
        borderWidth: 2,
      },
    ],
  };

  const interestBreakdownChart = {
    labels: ['Paid', 'Partial', 'Pending'],
    datasets: [
      {
        data: [paidInterest, partialInterest, pendingInterest],
        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
        borderColor: ['#198754', '#ffc107', '#dc3545'],
        borderWidth: 2,
      },
    ],
  };

  const dividendBreakdownChart = {
    labels: ['Paid', 'Partial', 'Pending'],
    datasets: [
      {
        data: [paidDividend, partialDividend, pendingDividend],
        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
        borderColor: ['#198754', '#ffc107', '#dc3545'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          {/* Header */}
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header">
                <FaTachometerAlt style={{ marginRight: '0.5rem' }} /> Dashboard Overview
              </h2>
            </Col>
          </Row>

          {/* KPI Cards */}
          <Row className="mb-4">
            {/* Total Interest */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="kpi-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Total Interest</small>
                      <h4 className="mt-2 mb-0">{formatCurrency(totalInterest)}</h4>
                    </div>
                    <div className="text-primary fs-3">
                      <FaMoneyBillWave />
                    </div>
                  </div>
                  <div className="mt-3 text-muted small">
                    <FaArrowUp className="text-success" /> {formatNumber(paidInterest)} Paid
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Total Dividend */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="kpi-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Total Dividend</small>
                      <h4 className="mt-2 mb-0">{formatCurrency(totalDividend)}</h4>
                    </div>
                    <div className="text-warning fs-3">
                      <FaChartLine />
                    </div>
                  </div>
                  <div className="mt-3 text-muted small">
                    <FaArrowUp className="text-success" /> {formatNumber(paidDividend)} Paid
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Total Payables */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="kpi-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Total Payables</small>
                      <h4 className="mt-2 mb-0">{formatCurrency(totalInterest + totalDividend)}</h4>
                    </div>
                    <div className="text-info fs-3">
                      <FaMoneyCheckAlt />
                    </div>
                  </div>
                  <div className="mt-3 text-muted small">
                    <Badge bg="danger">{formatNumber(totalPending)} Pending</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Payment Status */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="kpi-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Outstanding</small>
                      <h4 className="mt-2 mb-0">{formatCurrency(totalPending)}</h4>
                    </div>
                    <div className="text-danger fs-3">
                      <FaArrowDown />
                    </div>
                  </div>
                  <div className="mt-3 text-muted small">
                    <FaArrowUp className="text-warning" /> {formatNumber(totalPartial)} Partial
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts Section */}
          <Row className="mb-4">
            {/* Payment Status Overview */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>Payment Status</Card.Header>
                <Card.Body>
                  <Doughnut
                    data={paymentStatusChart}
                    options={{
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                      maintainAspectRatio: true,
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>

            {/* Interest vs Dividend */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>Interest vs Dividend</Card.Header>
                <Card.Body>
                  <Doughnut
                    data={payableBreakdownChart}
                    options={{
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                      maintainAspectRatio: true,
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>

            {/* Interest Breakdown */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>Interest Breakdown</Card.Header>
                <Card.Body>
                  <Doughnut
                    data={interestBreakdownChart}
                    options={{
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                      maintainAspectRatio: true,
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>

            {/* Dividend Breakdown */}
            <Col md={6} lg={3} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>Dividend Breakdown</Card.Header>
                <Card.Body>
                  <Doughnut
                    data={dividendBreakdownChart}
                    options={{
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                      maintainAspectRatio: true,
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Details Section */}
          <Row>
            {/* Interest Details */}
            <Col md={6} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>
                  <FaChartBar style={{ marginRight: '0.5rem' }} /> Interest Details
                </Card.Header>
                <Card.Body>
                  <div className="detail-row mb-3">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value">{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="detail-row mb-3">
                    <span className="detail-label">
                      <Badge bg="success">Paid</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(paidInterest)}</span>
                  </div>
                  <div className="detail-row mb-3">
                    <span className="detail-label">
                      <Badge bg="warning text-dark">Partial</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(partialInterest)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      <Badge bg="danger">Pending</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(pendingInterest)}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Dividend Details */}
            <Col md={6} className="mb-3">
              <Card className="chart-card-modern">
                <Card.Header>
                  <FaChartBar style={{ marginRight: '0.5rem' }} /> Dividend Details
                </Card.Header>
                <Card.Body>
                  <div className="detail-row mb-3">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value">{formatCurrency(totalDividend)}</span>
                  </div>
                  <div className="detail-row mb-3">
                    <span className="detail-label">
                      <Badge bg="success">Paid</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(paidDividend)}</span>
                  </div>
                  <div className="detail-row mb-3">
                    <span className="detail-label">
                      <Badge bg="warning text-dark">Partial</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(partialDividend)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      <Badge bg="danger">Pending</Badge>
                    </span>
                    <span className="detail-value">{formatCurrency(pendingDividend)}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Footer */}
          <div className="mt-4 p-3 bg-light rounded text-muted small">
            <FaListAlt style={{ marginRight: '0.5rem' }} />
            Dashboard data auto-refreshes every 60 seconds | Last updated: {new Date().toLocaleTimeString()}
          </div>
        </Container>
      </div>
    </>
  );
};

export default Dashboard;

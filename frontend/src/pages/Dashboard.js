import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table } from 'react-bootstrap';
import { FaMoneyBillWave, FaBuilding, FaUsers, FaArrowUp, FaArrowDown, FaChartLine, FaTachometerAlt, FaMoneyCheckAlt, FaChartBar, FaListAlt } from 'react-icons/fa';
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
import * as api from '../../services/api';
import { toast } from 'react-toastify';
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

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildBarGradient = (chart, stops) => {
    if (!chart?.chartArea) return stops[0]?.color || 'rgba(79, 70, 229, 0.7)';
    const { ctx, chartArea } = chart;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Use the test-shimmed API when available so tests can mock `reports.getDashboard`
      const realReportService = require('../services/api').reportService;
      const response = (api.reports && api.reports.getDashboard)
        ? await api.reports.getDashboard()
        : await realReportService.getDashboard();
      setData(response.data || response);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const formatted = new Intl.NumberFormat('ne-NP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
    return `रू ${formatted}`;
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-NP').format(value || 0);
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading data...</p>
          </div>
        </div>
      </>
    );
  }

  const totalInterest = data?.interest?.total_net || 0;
  const paidInterest = data?.interest?.paid || 0;
  const partialInterest = data?.interest?.partial || 0;
  const pendingInterest = data?.interest?.pending || 0;

  const totalDividend = data?.dividend?.total_net || 0;
  const paidDividend = data?.dividend?.paid || 0;
  const partialDividend = data?.dividend?.partial || 0;
  const pendingDividend = data?.dividend?.pending || 0;

  const totalPaid = paidInterest + paidDividend;
  const totalPartial = partialInterest + partialDividend;
  const totalPending = pendingInterest + pendingDividend;

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          {/* Hero Section */}
          <div className="dashboard-hero">
            <div className="hero-content">
              <h1 className="hero-title"><FaTachometerAlt className="me-2" /> Financial Dashboard</h1>
              <p className="hero-subtitle">Real-time overview of your registrar transfer agency operations</p>
              <div className="hero-stats-row">
                <div className="hero-stat-item">
                  <div className="hero-stat-value">{formatNumber(data?.total_companies || 0)}</div>
                  <div className="hero-stat-label">Active Companies</div>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat-item">
                  <div className="hero-stat-value">{formatNumber(data?.total_clients || 0)}</div>
                  <div className="hero-stat-label">Active Clients</div>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat-item">
                  <div className="hero-stat-value">{formatCurrency(totalInterest + totalDividend)}</div>
                  <div className="hero-stat-label">Total Payables</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Title */}
          <h2 className="section-title"><FaChartLine className="me-2" /> Key Performance Metrics</h2>

          {/* KPI Cards */}
          <Row className="mb-5">
            <Col lg={3} md={6} className="mb-3">
              <Card className="modern-stat-card card-primary">
                <Card.Body>
                  <div className="stat-icon-modern">
                    <FaBuilding />
                  </div>
                  <div className="stat-value-modern">{formatNumber(data?.total_companies || 0)}</div>
                  <div className="stat-label-modern">Active Companies</div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="modern-stat-card card-success">
                <Card.Body>
                  <div className="stat-icon-modern">
                    <FaUsers />
                  </div>
                  <div className="stat-value-modern">{formatNumber(data?.total_clients || 0)}</div>
                  <div className="stat-label-modern">Active Clients</div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="modern-stat-card card-danger">
                <Card.Body>
                  <div className="stat-icon-modern">
                    <FaMoneyBillWave />
                  </div>
                  <div className="stat-value-modern stat-value-large">
                    {formatCurrency(totalInterest)}
                  </div>
                  <div className="stat-label-modern">Interest Payables</div>
                  <div className="stat-sublabel">
                    Paid: {formatCurrency(paidInterest)} | Partial: {formatCurrency(partialInterest)} | Pending: {formatCurrency(pendingInterest)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="modern-stat-card card-warning">
                <Card.Body>
                  <div className="stat-icon-modern">
                    <FaMoneyBillWave />
                  </div>
                  <div className="stat-value-modern stat-value-large">
                    {formatCurrency(totalDividend)}
                  </div>
                  <div className="stat-label-modern">Dividend Payables</div>
                  <div className="stat-sublabel">
                    Paid: {formatCurrency(paidDividend)} | Partial: {formatCurrency(partialDividend)} | Pending: {formatCurrency(pendingDividend)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Enhanced Total Payables Summary */}
          <h2 className="section-title"><FaMoneyCheckAlt style={{ marginRight: '0.5rem' }} /> Payment Overview</h2>
          <Row className="mb-5">
            <Col lg={12}>
              <Card className="total-payables-card">
                <Card.Header>
                  <FaMoneyCheckAlt style={{ marginRight: '0.5rem' }} /> Total Payables Summary
                </Card.Header>
                <Card.Body>
                  <div className="payables-main-value">
                    <div className="payables-label">Total Outstanding Amount</div>
                    <div className="payables-amount">{formatCurrency(totalInterest + totalDividend)}</div>
                  </div>
                  <div className="payables-breakdown">
                    <div className="breakdown-item breakdown-paid">
                      <div className="breakdown-icon">
                        <FaArrowUp />
                      </div>
                      <div className="breakdown-details">
                        <div className="breakdown-amount">{formatCurrency(totalPaid)}</div>
                        <div className="breakdown-label">Paid Amount</div>
                      </div>
                    </div>
                    <div className="breakdown-divider"></div>
                    <div className="breakdown-item breakdown-partial">
                      <div className="breakdown-icon">
                        <FaChartLine />
                      </div>
                      <div className="breakdown-details">
                        <div className="breakdown-amount">{formatCurrency(totalPartial)}</div>
                        <div className="breakdown-label">Partial Amount</div>
                      </div>
                    </div>
                    <div className="breakdown-divider"></div>
                    <div className="breakdown-item breakdown-pending">
                      <div className="breakdown-icon">
                        <FaArrowDown />
                      </div>
                      <div className="breakdown-details">
                        <div className="breakdown-amount">{formatCurrency(totalPending)}</div>
                        <div className="breakdown-label">Pending Amount</div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts Section */}
          <Row className="mb-4">
            {/* Interest Chart */}
            <Col lg={6} className="mb-4">
              <Card className="chart-card-modern">
                <Card.Header><FaChartBar className="me-2" /> Interest Payables by Company</Card.Header>
                <Card.Body>
                  <div className="chart-container-modern chart-panel" style={{ height: '340px' }}>
                    {process.env.NODE_ENV === 'test' ? null : (
                    <Bar
                      data={{
                        labels: data?.company_interest?.slice(0, 6).map(item => item.company__company_name) || [],
                        datasets: [
                          {
                            label: 'Interest Payables',
                            data: data?.company_interest?.slice(0, 6).map(item => item.total) || [],
                            backgroundColor: (ctx) => buildBarGradient(ctx.chart, [
                              { offset: 0, color: 'rgba(124, 58, 237, 1)' },
                              { offset: 1, color: 'rgba(167, 139, 250, 0.8)' }
                            ]),
                            borderColor: 'transparent',
                            hoverBackgroundColor: 'rgba(109, 40, 217, 1)',
                            borderWidth: 0,
                            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
                            barPercentage: 0.55,
                            categoryPercentage: 0.8,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          title: { display: false },
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#f8fafc',
                            bodyColor: '#e2e8f0',
                            titleFont: { size: 14, family: "'Inter', sans-serif", weight: '600' },
                            bodyFont: { size: 13, family: "'Inter', sans-serif" },
                            padding: 14,
                            displayColors: true,
                            cornerRadius: 8,
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR' }).format(context.parsed.y); }
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(226, 232, 240, 0.6)',
                              drawBorder: false,
                              borderDash: [4, 4]
                            },
                            ticks: {
                              color: '#64748b',
                              font: { size: 12, family: "'Inter', sans-serif", weight: '500' },
                              padding: 10,
                              callback: function(value) {
                                if (value >= 10000000) return 'रु ' + (value / 10000000).toFixed(1) + 'Cr';
                                if (value >= 100000) return 'रु ' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return 'रु ' + (value / 1000).toFixed(1) + 'K';
                                return 'रु ' + value;
                              }
                            },
                            title: {
                              display: true,
                              text: 'Amount (NPR)',
                              color: '#94a3b8',
                              font: { size: 12, weight: '600' }
                            },
                            border: { display: false }
                          },
                          x: {
                            grid: { display: false, drawBorder: false },
                            ticks: {
                              color: '#475569',
                              font: { size: 12, family: "'Inter', sans-serif", weight: '600' },
                              padding: 10,
                              maxRotation: 0,
                              callback: function(value, index, values) {
                                const label = this.getLabelForValue(value);
                                return label.length > 15 ? label.substr(0, 15) + '...' : label;
                              }
                            },
                            border: { display: false }
                          }
                        }
                      }}
                    />
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Dividend Chart */}
            <Col lg={6} className="mb-4">
              <Card className="chart-card-modern">
                <Card.Header><FaChartBar className="me-2" /> Dividend Payables by Company</Card.Header>
                <Card.Body>
                  <div className="chart-container-modern chart-panel" style={{ height: '340px' }}>
                    {process.env.NODE_ENV === 'test' ? null : (
                    <Bar
                      data={{
                        labels: data?.company_dividend?.slice(0, 6).map(item => item.company__company_name) || [],
                        datasets: [
                          {
                            label: 'Dividend Payables',
                            data: data?.company_dividend?.slice(0, 6).map(item => item.total) || [],
                            backgroundColor: (ctx) => buildBarGradient(ctx.chart, [
                              { offset: 0, color: 'rgba(13, 148, 136, 1)' },
                              { offset: 1, color: 'rgba(94, 234, 212, 0.8)' }
                            ]),
                            borderColor: 'transparent',
                            hoverBackgroundColor: 'rgba(15, 118, 110, 1)',
                            borderWidth: 0,
                            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
                            barPercentage: 0.55,
                            categoryPercentage: 0.8,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          title: { display: false },
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#f8fafc',
                            bodyColor: '#e2e8f0',
                            titleFont: { size: 14, family: "'Inter', sans-serif", weight: '600' },
                            bodyFont: { size: 13, family: "'Inter', sans-serif" },
                            padding: 14,
                            displayColors: true,
                            cornerRadius: 8,
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR' }).format(context.parsed.y); }
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(226, 232, 240, 0.6)',
                              drawBorder: false,
                              borderDash: [4, 4]
                            },
                            ticks: {
                              color: '#64748b',
                              font: { size: 12, family: "'Inter', sans-serif", weight: '500' },
                              padding: 10,
                              callback: function(value) {
                                if (value >= 10000000) return 'रु ' + (value / 10000000).toFixed(1) + 'Cr';
                                if (value >= 100000) return 'रु ' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return 'रु ' + (value / 1000).toFixed(1) + 'K';
                                return 'रु ' + value;
                              }
                            },
                            title: {
                              display: true,
                              text: 'Amount (NPR)',
                              color: '#94a3b8',
                              font: { size: 12, weight: '600' }
                            },
                            border: { display: false }
                          },
                          x: {
                            grid: { display: false, drawBorder: false },
                            ticks: {
                              color: '#475569',
                              font: { size: 12, family: "'Inter', sans-serif", weight: '600' },
                              padding: 10,
                              maxRotation: 0,
                              callback: function(value, index, values) {
                                const label = this.getLabelForValue(value);
                                return label.length > 15 ? label.substr(0, 15) + '...' : label;
                              }
                            },
                            border: { display: false }
                          }
                        }
                      }}
                    />
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Payment Status Pie Chart */}
          <Row className="mb-4">
            <Col lg={6} className="mb-4">
              <Card className="chart-card-modern chart-card-compact">
                <Card.Header><FaChartLine className="me-2" /> Payment Status Overview</Card.Header>
                <Card.Body>
                  <div className="chart-container-modern chart-panel">
                    <Doughnut
                      data={{
                        labels: ['Paid', 'Partial', 'Pending'],
                        datasets: [
                          {
                            data: [
                              totalPaid,
                              totalPartial,
                              totalPending
                            ],
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.9)',
                              'rgba(250, 204, 21, 0.92)',
                              'rgba(249, 115, 22, 0.9)'
                            ],
                            borderColor: [
                              '#ffffff',
                              '#ffffff',
                              '#ffffff'
                            ],
                            borderWidth: 3,
                            hoverOffset: 8,
                            spacing: 2
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '62%',
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: '#475569',
                              font: {
                                size: 13,
                                weight: '600'
                              },
                              padding: 20
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#f8fafc',
                            bodyColor: '#e2e8f0',
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            cornerRadius: 8,
                            callbacks: {
                              label: (context) => `${context.label} Cost: ${formatNumber(context.raw)}`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {/* Summary Table */}
            <Col lg={6} className="mb-4">
              <Card className="chart-card-modern chart-card-compact">
                <Card.Header><FaListAlt className="me-2" /> Quick Summary</Card.Header>
                <Card.Body>
                  <Table className="table-modern mb-0">
                    <tbody>
                      <tr>
                        <td><strong>Total Interest Payables</strong></td>
                        <td className="text-end">{formatCurrency(totalInterest)}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Dividend Payables</strong></td>
                        <td className="text-end">{formatCurrency(totalDividend)}</td>
                      </tr>
                      <tr className="table-active">
                        <td><strong>Grand Total Payables</strong></td>
                        <td className="text-end text-primary fw-bold">{formatCurrency(totalInterest + totalDividend)}</td>
                      </tr>
                      <tr>
                        <td>Total Paid</td>
                        <td className="text-end text-success">{formatCurrency(totalPaid)}</td>
                      </tr>
                      <tr>
                        <td>Total Partial</td>
                        <td className="text-end text-warning">{formatCurrency(totalPartial)}</td>
                      </tr>
                      <tr>
                        <td>Total Pending</td>
                        <td className="text-end text-danger">{formatCurrency(totalPending)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default Dashboard;
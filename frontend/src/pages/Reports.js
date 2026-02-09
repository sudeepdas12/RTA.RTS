import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Alert, Dropdown } from 'react-bootstrap';
import { FaDownload, FaSync, FaFileAlt, FaBuilding, FaBriefcase, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import { reportService } from '../services/api';
import { buildDateParams, formatCurrency } from '../utils/reportUtils';

const Reports = () => {
  const [reportType, setReportType] = useState('interest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recoType, setRecoType] = useState('interest');
  const [recoData, setRecoData] = useState({ rows: [], totals: { books_amount: 0, rts_amount: 0, difference: 0 } });
  const [loadingReco, setLoadingReco] = useState(false);
  const [recoError, setRecoError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState('');

  const handleExport = async () => {
    try {
      const params = { from_date: dateFrom, to_date: dateTo };
      if (reportType === 'interest' && fiscalYear) params.fiscal_year = fiscalYear;
      const response = reportType === 'interest'
        ? await reportService.exportInterest(params)
        : await reportService.exportDividend(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const fetchReco = async () => {
    setLoadingReco(true);
    setRecoError(null);
    try {
      const params = buildDateParams({ fromDate: dateFrom, toDate: dateTo });
      if (fiscalYear) params.fiscal_year = fiscalYear;
      const response = recoType === 'interest'
        ? await reportService.getInterestReco(params)
        : await reportService.getDividendReco(params);
      setRecoData(response.data);
    } catch (err) {
      setRecoData({ rows: [], totals: { books_amount: 0, rts_amount: 0, difference: 0 } });
      setRecoError(err.response?.data?.detail || 'Failed to load reconciliation report');
    } finally {
      setLoadingReco(false);
    }
  };

  const handleRecoExport = async () => {
    try {
      const params = buildDateParams({ fromDate: dateFrom, toDate: dateTo });
      if (fiscalYear) params.fiscal_year = fiscalYear;
      const response = recoType === 'interest'
        ? await reportService.exportInterestReco(params)
        : await reportService.exportDividendReco(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${recoType}_reconciliation_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Reconciliation report exported');
    } catch (err) {
      toast.error('Failed to export reconciliation report');
    }
  };

  useEffect(() => {
    fetchReco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoType]);

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaFileAlt style={{ marginRight: '0.5rem' }} /> Reports & Exports</h2>

            <Row>
            <Col md={6}>
              <Card className="chart-card-modern">
                <Card.Header><FaDownload style={{ marginRight: '0.5rem' }} /> Export Reports</Card.Header>
                <Card.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Report Type</Form.Label>
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
                        <span>{reportType === 'interest' ? 'Interest Payables' : 'Dividend Payables'}</span>
                        <FaChevronRight size={12} style={{ transition: 'transform 0.18s ease' }} />
                      </Dropdown.Toggle>
                      <Dropdown.Menu
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e9d5ff',
                          boxShadow: '0 8px 24px rgba(136, 96, 208, 0.15)',
                          padding: '8px',
                          animation: 'dropdownSlideIn 0.2s ease-out',
                          width: '100%'
                        }}
                      >
                        <Dropdown.Item
                          onClick={() => setReportType('interest')}
                          className="modern-dropdown-item"
                          active={reportType === 'interest'}
                          style={{
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            fontWeight: reportType === 'interest' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            background: reportType === 'interest' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                            color: reportType === 'interest' ? '#ffffff' : '#374151'
                          }}
                        >
                          Interest Payables
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setReportType('dividend')}
                          className="modern-dropdown-item"
                          active={reportType === 'dividend'}
                          style={{
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            fontWeight: reportType === 'dividend' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            background: reportType === 'dividend' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                            color: reportType === 'dividend' ? '#ffffff' : '#374151'
                          }}
                        >
                          Dividend Payables
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Fiscal Year (YYYY/YYYY+1)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="e.g. 2024/2025"
                          value={fiscalYear}
                          onChange={(e) => setFiscalYear(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>From Date</Form.Label>
                        <Form.Control type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>To Date</Form.Label>
                        <Form.Control type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Button variant="primary" onClick={handleExport}>
                    <FaDownload /> Export to Excel
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="chart-card-modern">
              <Card.Header><FaSync style={{ marginRight: '0.5rem' }} /> Reconciliation Report</Card.Header>
              <Card.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Report Type</Form.Label>
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
                        <span>{recoType === 'interest' ? 'Debenture Interest' : 'Stock Dividend'}</span>
                        <FaChevronRight size={12} style={{ transition: 'transform 0.18s ease' }} />
                      </Dropdown.Toggle>
                      <Dropdown.Menu
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e9d5ff',
                          boxShadow: '0 8px 24px rgba(136, 96, 208, 0.15)',
                          padding: '8px',
                          animation: 'dropdownSlideIn 0.2s ease-out',
                          width: '100%'
                        }}
                      >
                        <Dropdown.Item
                          onClick={() => setRecoType('interest')}
                          className="modern-dropdown-item"
                          active={recoType === 'interest'}
                          style={{
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            fontWeight: recoType === 'interest' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            background: recoType === 'interest' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                            color: recoType === 'interest' ? '#ffffff' : '#374151'
                          }}
                        >
                          Debenture Interest
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setRecoType('dividend')}
                          className="modern-dropdown-item"
                          active={recoType === 'dividend'}
                          style={{
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            fontWeight: recoType === 'dividend' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            background: recoType === 'dividend' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                            color: recoType === 'dividend' ? '#ffffff' : '#374151'
                          }}
                        >
                          Stock Dividend
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>From Date</Form.Label>
                        <Form.Control type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>To Date</Form.Label>
                        <Form.Control type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex gap-2">
                    <Button variant="secondary" onClick={fetchReco} disabled={loadingReco}>
                      <FaSync /> Refresh
                    </Button>
                    <Button variant="primary" onClick={handleRecoExport} disabled={loadingReco || recoData.rows.length === 0}>
                      <FaDownload /> Export Reco
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col>
            <Card className="chart-card-modern">
              <Card.Header>{recoType === 'interest' ? <><FaBuilding style={{ marginRight: '0.5rem' }} /> Debenture Interest Reconciliation</> : <><FaBriefcase style={{ marginRight: '0.5rem' }} /> Stock Dividend Reconciliation</>}</Card.Header>
              <Card.Body>
                {recoError && <Alert variant="danger" className="mb-3">{recoError}</Alert>}
                {loadingReco ? (
                  <div className="loading-container-modern">
                    <div className="text-center">
                      <div className="loading-spinner-modern mx-auto mb-3"></div>
                      <p className="fs-5 text-muted">Loading reconciliation data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-modern mb-3">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Particulars</th>
                          <th>Company</th>
                          <th>Client</th>
                          <th>Financial Year</th>
                          <th>{recoType === 'interest' ? 'Due Date' : 'Payment Date'}</th>
                          <th className="text-end">In Books (NPR)</th>
                          <th className="text-end">In RTS (NPR)</th>
                          <th className="text-end">Difference</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recoData.rows.length === 0 && (
                          <tr>
                            <td colSpan={10} className="text-center text-muted">No data for the selected filters.</td>
                          </tr>
                        )}
                        {recoData.rows.map((row, idx) => (
                          <tr key={row.id}>
                            <td>{idx + 1}</td>
                            <td>{row.particulars}</td>
                            <td>{row.company_name}</td>
                            <td>{row.client_name}</td>
                            <td>{row.financial_year || '-'}</td>
                            <td>{row.due_or_payment_date || '-'}</td>
                            <td className="text-end">{formatCurrency(row.books_amount)}</td>
                            <td className="text-end">{formatCurrency(row.rts_amount)}</td>
                            <td className="text-end">{formatCurrency(row.difference)}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                        {recoData.rows.length > 0 && (
                          <tr className="table-light fw-bold">
                            <td colSpan={6}>Total</td>
                            <td className="text-end">{formatCurrency(recoData.totals?.books_amount)}</td>
                            <td className="text-end">{formatCurrency(recoData.totals?.rts_amount)}</td>
                            <td className="text-end">{formatCurrency(recoData.totals?.difference)}</td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        </Container>
      </div>
    </>
  );
};

export default Reports;
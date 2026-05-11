import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Alert, Dropdown } from 'react-bootstrap';
import { FaDownload, FaSync, FaFileAlt, FaBuilding, FaBriefcase, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import NavigationBar from '../components/NavigationBar';
import AppDatePicker from '../components/AppDatePicker';
import DateRangeFilter from '../components/DateRangeFilter';
import { reportService } from '../services/api';
import { buildDateParams, formatCurrency } from '../utils/reportUtils';
import '../styles/dashboard.css';

const Reports = () => {
  const emptyReco = { rows: [], totals: { books_amount: 0, rts_amount: 0, difference: 0 } };
  const [reportType, setReportType] = useState('interest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recoType, setRecoType] = useState('interest');
  const [recoData, setRecoData] = useState(emptyReco);
  const [combinedReco, setCombinedReco] = useState({ interest: emptyReco, dividend: emptyReco });
  const [loadingReco, setLoadingReco] = useState(false);
  const [recoError, setRecoError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState('');

  const toNum = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const groupByParticulars = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.particulars || 'N/A';
      if (!map.has(key)) {
        map.set(key, {
          particulars: key,
          rows: [],
          books_amount: 0,
          rts_amount: 0,
          difference: 0,
        });
      }
      const current = map.get(key);
      current.rows.push(row);
      current.books_amount += toNum(row.books_amount);
      current.rts_amount += toNum(row.rts_amount);
      current.difference += toNum(row.difference);
    });

    return Array.from(map.values());
  };

  const renderStatementSection = (title, sectionData) => {
    const groups = groupByParticulars(sectionData.rows || []);
    return (
      <>
        <tr className="table-secondary fw-bold">
          <td colSpan={6}>{title}</td>
        </tr>
        {groups.length === 0 && (
          <tr>
            <td className="text-muted">No records</td>
            <td className="text-end">{formatCurrency(0)}</td>
            <td className="text-end">{formatCurrency(0)}</td>
            <td className="text-end">-</td>
            <td className="text-end">-</td>
            <td className="text-end">{formatCurrency(0)}</td>
          </tr>
        )}
        {groups.map((group) => (
          <React.Fragment key={`${title}-${group.particulars}`}>
            {group.rows.map((row, idx) => (
              <tr key={`${title}-${group.particulars}-${row.id || idx}`}>
                <td>{idx === 0 ? group.particulars : ''}</td>
                <td className="text-end">{formatCurrency(row.books_amount)}</td>
                <td className="text-end">{formatCurrency(row.rts_amount)}</td>
                <td className="text-end">{row.financial_year || '-'}</td>
                <td className="text-end">{row.agm_date || row.due_or_payment_date || '-'}</td>
                <td className="text-end">{formatCurrency(row.difference)}</td>
              </tr>
            ))}
            <tr className="table-light fw-bold">
              <td>Sub-Total</td>
              <td className="text-end">{formatCurrency(group.books_amount)}</td>
              <td className="text-end">{formatCurrency(group.rts_amount)}</td>
              <td className="text-end">-</td>
              <td className="text-end">-</td>
              <td className="text-end">{formatCurrency(group.difference)}</td>
            </tr>
          </React.Fragment>
        ))}
      </>
    );
  };

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

      if (recoType === 'combined') {
        const [interestRes, dividendRes] = await Promise.all([
          reportService.getInterestReco(params),
          reportService.getDividendReco(params),
        ]);
        setCombinedReco({
          interest: interestRes.data || emptyReco,
          dividend: dividendRes.data || emptyReco,
        });
        setRecoData(emptyReco);
      } else {
        const response = recoType === 'interest'
          ? await reportService.getInterestReco(params)
          : await reportService.getDividendReco(params);
        setRecoData(response.data);
      }
    } catch (err) {
      setRecoData(emptyReco);
      setCombinedReco({ interest: emptyReco, dividend: emptyReco });
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
        : recoType === 'dividend'
          ? await reportService.exportDividendReco(params)
          : await reportService.exportCombinedReco(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filenameBase = recoType === 'combined' ? 'combined_statement_reconciliation' : `${recoType}_reconciliation`;
      link.setAttribute('download', `${filenameBase}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const combinedRowCount = (combinedReco.interest?.rows?.length || 0) + (combinedReco.dividend?.rows?.length || 0);

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
                            background: reportType === 'interest' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
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
                            background: reportType === 'dividend' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
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
                        <AppDatePicker
                          selected={dateFrom ? parseISO(dateFrom) : null}
                          onChange={(d) => setDateFrom(d ? format(d, 'yyyy-MM-dd') : '')}
                          className="form-control"
                          dateFormat="yyyy-MM-dd"
                          isClearable
                          placeholderText="From Date"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>To Date</Form.Label>
                        <AppDatePicker
                          selected={dateTo ? parseISO(dateTo) : null}
                          onChange={(d) => setDateTo(d ? format(d, 'yyyy-MM-dd') : '')}
                          className="form-control"
                          dateFormat="yyyy-MM-dd"
                          isClearable
                          placeholderText="To Date"
                        />
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
                        <span>
                          {recoType === 'interest' && 'Debenture Interest'}
                          {recoType === 'dividend' && 'Stock Dividend'}
                          {recoType === 'combined' && 'Combined Statement'}
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
                            background: recoType === 'interest' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
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
                            background: recoType === 'dividend' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                            color: recoType === 'dividend' ? '#ffffff' : '#374151'
                            
                          }}
                        >
                          Stock Dividend
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setRecoType('combined')}
                          className="modern-dropdown-item"
                          active={recoType === 'combined'}
                          style={{
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            fontWeight: recoType === 'combined' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            background: recoType === 'combined' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                            color: recoType === 'combined' ? '#ffffff' : '#374151'
                          }}
                        >
                          Combined Statement
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                  <Row>
                    <Col>
                      <DateRangeFilter compact initialFrom={dateFrom} initialTo={dateTo} onApply={({ fromDate, toDate }) => { setDateFrom(fromDate); setDateTo(toDate); }} />
                    </Col>
                  </Row>
                  <div className="d-flex gap-2">
                    <Button variant="secondary" onClick={fetchReco} disabled={loadingReco}>
                      <FaSync /> Refresh
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleRecoExport}
                      disabled={loadingReco || (recoType === 'combined' ? combinedRowCount === 0 : recoData.rows.length === 0)}
                    >
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
              <Card.Header>
                {recoType === 'interest' && <><FaBuilding style={{ marginRight: '0.5rem' }} /> Debenture Interest Reconciliation</>}
                {recoType === 'dividend' && <><FaBriefcase style={{ marginRight: '0.5rem' }} /> Stock Dividend Reconciliation</>}
                {recoType === 'combined' && <><FaFileAlt style={{ marginRight: '0.5rem' }} /> Combined Summary Statement</>}
              </Card.Header>
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
                    {recoType === 'combined' ? (
                      <Table className="table-modern mb-3">
                        <thead>
                          <tr>
                            <th rowSpan={2}>Particulars</th>
                            <th rowSpan={2} className="text-end">In Books of Accounts Amount</th>
                            <th colSpan={3} className="text-center">In RTS Dep.</th>
                            <th rowSpan={2} className="text-end">Difference</th>
                          </tr>
                          <tr>
                            <th className="text-end">Amount</th>
                            <th className="text-end">Financial Year</th>
                            <th className="text-end">AGM Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderStatementSection('Debenture Interest Payable', combinedReco.interest || emptyReco)}
                          <tr className="table-warning fw-bold">
                            <td>Total Interest Payable</td>
                            <td className="text-end">{formatCurrency(combinedReco.interest?.totals?.books_amount)}</td>
                            <td className="text-end">{formatCurrency(combinedReco.interest?.totals?.rts_amount)}</td>
                            <td className="text-end">-</td>
                            <td className="text-end">-</td>
                            <td className="text-end">{formatCurrency(combinedReco.interest?.totals?.difference)}</td>
                          </tr>

                          {renderStatementSection('IPO & Dividend Payable', combinedReco.dividend || emptyReco)}
                          <tr className="table-warning fw-bold">
                            <td>Sub-Total of IPO & Dividend Payable</td>
                            <td className="text-end">{formatCurrency(combinedReco.dividend?.totals?.books_amount)}</td>
                            <td className="text-end">{formatCurrency(combinedReco.dividend?.totals?.rts_amount)}</td>
                            <td className="text-end">-</td>
                            <td className="text-end">-</td>
                            <td className="text-end">{formatCurrency(combinedReco.dividend?.totals?.difference)}</td>
                          </tr>

                          <tr className="table-danger fw-bold">
                            <td>Total Payable (IPO + Interest + Dividend)</td>
                            <td className="text-end">
                              {formatCurrency(toNum(combinedReco.interest?.totals?.books_amount) + toNum(combinedReco.dividend?.totals?.books_amount))}
                            </td>
                            <td className="text-end">
                              {formatCurrency(toNum(combinedReco.interest?.totals?.rts_amount) + toNum(combinedReco.dividend?.totals?.rts_amount))}
                            </td>
                            <td className="text-end">-</td>
                            <td className="text-end">-</td>
                            <td className="text-end">
                              {formatCurrency(toNum(combinedReco.interest?.totals?.difference) + toNum(combinedReco.dividend?.totals?.difference))}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    ) : (
                      <Table className="table-modern mb-3">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Particulars</th>
                            <th>Company</th>
                            <th>Client</th>
                            <th>BOID</th>
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
                              <td>{row.client_boid || '-'}</td>
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
                    )}
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
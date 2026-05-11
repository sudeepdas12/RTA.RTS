import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Alert, Form, Row, Col } from 'react-bootstrap';
import { FaChartBar, FaUsers } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import CustomSelect from '../../components/CustomSelect';
import { dividendService, companyService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendClientWise = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      if (selectedCompany && selectedCompany !== 'all') {
        params.company = selectedCompany;
      }
      const response = await dividendService.getAll(params);
      const items = normalizeList(response.data);

      // aggregate by BOID (fall back to name)
      const aggMap = new Map();
      items.forEach((item) => {
        const boid = item.client_boid || '';
        const name = item.client_name || '';
        const key = boid || name;
        const amt = Number(item.net_payable || 0);
        if (!aggMap.has(key)) {
          aggMap.set(key, { name, boid, total: amt });
        } else {
          aggMap.get(key).total += amt;
        }
      });
      const aggregated = Array.from(aggMap.values());
      setData(aggregated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // load company list once
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await companyService.getAll({ page_size: 1000 });
        setCompanies(normalizeList(res.data));
      } catch (err) {
        console.error('Failed to load companies', err);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const companyLabel = selectedCompany === 'all'
    ? 'All Companies'
    : (companies.find(c => String(c.company_id ?? c.id) === String(selectedCompany))?.company_name || 'Selected Company');

  const total = data.reduce((sum, row) => sum + row.total, 0);
  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaUsers style={{ marginRight: '0.5rem' }} /> Stock Dividend Payable - Client-wise View</h2>
          <Card className="filter-card-modern">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <DateRangeFilter onApply={setRange} />
                </Col>
                <Col md={6}>
                  <Form.Label className="text-muted small">Company</Form.Label>
                  <CustomSelect
                    options={[{ value: 'all', label: 'All Companies' }, ...companies.map(c => ({ value: c.company_id ?? c.id, label: c.company_name }))]}
                    value={selectedCompany}
                    onChange={(val) => setSelectedCompany(val)}
                    placeholder="All Companies"
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading dividend data...</p>
              </div>
            </div>
          ) : (
            <Card className="chart-card-modern">
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> Client-wise Dividend Report</Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="mb-0">{data.length} clients</h5>
                    <small className="text-muted">{companyLabel} · {rangeText}</small>
                  </div>
                </div>
                {data.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Client Name</th>
                        <th>BOID</th>
                        <th className="text-end">Total Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.name}</td>
                          <td>{row.boid || '-'}</td>
                          <td className="text-end">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="table-light fw-bold">
                        <td colSpan="2">Grand Total</td>
                        <td className="text-end">{formatCurrency(total)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted mb-0">No data found for the selected date range.</p>
              )}
            </Card.Body>
          </Card>
        )}
        </Container>
      </div>
    </>
  );
};

export default DividendClientWise;

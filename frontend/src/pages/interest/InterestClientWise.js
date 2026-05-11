import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Alert, Form, Row, Col } from 'react-bootstrap';
import { FaChartBar, FaUsers } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import CustomSelect from '../../components/CustomSelect';
import DateRangeFilter from '../../components/DateRangeFilter';
import { interestService, companyService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const InterestClientWise = () => {
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
      const response = await interestService.getAll(params);
      const items = normalizeList(response.data);
      // if filtering by company we may want to reset other filters later

      // aggregate amounts by company + client so caller knows which company
      // each total is coming from; use boid fallback but preserve company
      const aggMap = new Map();
      items.forEach((item) => {
        const company = item.company_name || 'N/A';
        const boid = item.client_boid || '';
        const name = item.client_name || '';
        const clientKey = boid || name;
        const key = `${company}||${clientKey}`; // delimiter unlikely in names
        const amt = Number(item.net_payable || 0);
        if (!aggMap.has(key)) {
          aggMap.set(key, { company, name, boid, total: amt });
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

  const total = data.reduce((sum, row) => sum + row.total, 0);
  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaUsers style={{ marginRight: '0.5rem' }} /> Debenture Interest Payable - Client-wise View</h2>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      <Card className="filter-card-modern mt-2">
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
          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading report...</p>
              </div>
            </div>
          ) : (
            <Card className="chart-card-modern">
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> {data.length} clients ({rangeText})</Card.Header>
              <Card.Body>
                {data.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Client Name</th>
                          <th>BOID</th>
                          <th className="text-end">Total Amount (NPR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.company}</td>
                            <td>{row.name}</td>
                            <td>{row.boid || '-'}</td>
                            <td className="text-end">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                        <tr className="table-active fw-bold">
                          <td colSpan="3">Grand Total</td>
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

export default InterestClientWise;

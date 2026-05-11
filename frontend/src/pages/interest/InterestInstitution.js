import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Alert } from 'react-bootstrap';
import { FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { interestService, clientService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const InterestInstitution = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [institutionClients, setInstitutionClients] = useState([]);

  const fetchClients = async () => {
    try {
      const response = await clientService.getAll({ holder_type: 'Institution' });
      const clients = normalizeList(response.data);
      setInstitutionClients(clients.map(c => c.client_id ?? c.id));
    } catch (err) {
      console.error('Failed to fetch institution clients', err);
    }
  };

  const fetchData = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      // Request a large page_size so client-side filtering sees all items
      params.page_size = 1000;
      const response = await interestService.getAll(params);
      const items = normalizeList(response.data);
      const filtered = items.filter(item => institutionClients.includes(item.client));
      const clientMap = new Map();
      filtered.forEach((item) => {
        const clientName = item.client_name || 'Unknown';
        const boid = item.client_boid || '';
        const key = boid || clientName;
        const amount = Number(item.net_payable || 0);

        if (!clientMap.has(key)) {
          clientMap.set(key, {
            clientName,
            boid,
            total: amount,
          });
        } else {
          clientMap.get(key).total += amount;
        }
      });

      const aggregated = Array.from(clientMap.values());
      setData(aggregated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [institutionClients]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (institutionClients.length > 0) {
      fetchData(range);
    }
  }, [range, institutionClients, fetchData]);

  const total = data.reduce((sum, row) => sum + row.total, 0);
  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">🏦 Debenture Interest Payable - Institution</h2>

          <Card className="filter-card-modern">
            <Card.Body>
              <DateRangeFilter onApply={setRange} />
            </Card.Body>
          </Card>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading report...</p>
              </div>
            </div>
          ) : (
            <Card className="chart-card-modern">
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> {data.length} institution clients ({rangeText})</Card.Header>
              <Card.Body>
                {data.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                        <tr>
                          <th>Institution Name</th>
                          <th>BOID</th>
                          <th className="text-end">Total Amount (NPR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.clientName}</td>
                            <td>{row.boid || '-'}</td>
                            <td className="text-end">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                        <tr className="table-active fw-bold">
                          <td>Grand Total</td>
                          <td>-</td>
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

export default InterestInstitution;

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table } from 'react-bootstrap';
import { FaBuilding, FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { dividendService, companyService, getApiErrorMessage } from '../../services/api';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/AsyncState';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendPrivate = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [privateCompanies, setPrivateCompanies] = useState([]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ sector_type: 'Private' });
      const companies = normalizeList(response.data);
      setPrivateCompanies(companies.map(c => c.company_id ?? c.id));
    } catch (err) {
      console.error('Failed to fetch private companies', err);
    }
  };

  const fetchData = useCallback(async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      params.page_size = 1000;
      const response = await dividendService.getAll(params);
      const items = normalizeList(response.data);
      const filtered = items.filter(item => privateCompanies.includes(item.company));
      const companyMap = new Map();
      filtered.forEach((item) => {
        const companyName = item.company_name || 'Unknown';
        const amount = Number(item.net_payable || 0);
        const boid = item.client_boid || '';

        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            companyName,
            total: amount,
            boids: new Set(boid ? [boid] : []),
          });
        } else {
          const current = companyMap.get(companyName);
          current.total += amount;
          if (boid) {
            current.boids.add(boid);
          }
        }
      });

      const aggregated = Array.from(companyMap.values()).map((row) => ({
        companyName: row.companyName,
        total: row.total,
        boidCount: row.boids.size,
      }));
      setData(aggregated);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch data'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [privateCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (privateCompanies.length > 0) {
      fetchData(range);
    }
  }, [range, privateCompanies, fetchData]);

  const total = data.reduce((sum, row) => sum + row.total, 0);
  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header"><FaBuilding style={{ marginRight: '0.5rem' }} /> Stock Dividend Payable - Private Sector</h2>
          <Card className="filter-card-modern">
            <Card.Body>
              <DateRangeFilter onApply={setRange} />
            </Card.Body>
          </Card>
          {error && <ErrorState message={error} heading={null} className="mt-3" />}
          {loading ? (
            <LoadingState message="Loading dividend data..." />
          ) : (
            <Card className="chart-card-modern">
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> Private Sector Dividend Report</Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>{data.length} private sector companies ({rangeText})</h5>
                </div>
                {data.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Company Name</th>
                        <th className="text-center">Distinct BOIDs</th>
                        <th className="text-end">Total Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.companyName}</td>
                          <td className="text-center">{row.boidCount}</td>
                          <td className="text-end">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="table-light fw-bold">
                        <td>Grand Total</td>
                        <td className="text-center">-</td>
                        <td className="text-end">{formatCurrency(total)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="No data found for the selected date range." />
              )}
            </Card.Body>
          </Card>
        )}
        </Container>
      </div>
    </>
  );
};

export default DividendPrivate;

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Alert } from 'react-bootstrap';
import { FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { dividendService, companyService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendTaxExempted = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taxExemptedCompanies, setTaxExemptedCompanies] = useState([]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ page_size: 1000 });
      const companies = normalizeList(response.data);
      const taxExempted = companies.filter((c) => {
        const sector = String(c.sector_type || '').toLowerCase();
        const taxStatus = String(c.interest_tax_status || '').toLowerCase();
        return taxStatus === 'exempted' || sector.includes('exempt');
      });
      setTaxExemptedCompanies(taxExempted.map(c => c.company_id ?? c.id));
    } catch (err) {
      console.error('Failed to fetch tax exempted companies', err);
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
      const filtered = items.filter(item => taxExemptedCompanies.includes(item.company));
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
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [taxExemptedCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (taxExemptedCompanies.length > 0) {
      fetchData(range);
    } else if (taxExemptedCompanies.length === 0) {
      setData([]);
    }
  }, [range, taxExemptedCompanies, fetchData]);

  const total = data.reduce((sum, row) => sum + row.total, 0);
  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <h2 className="dashboard-header">🎓 Stock Dividend Payable - Tax Exempted Sector</h2>
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
                <p className="fs-5 text-muted">Loading dividend data...</p>
              </div>
            </div>
          ) : (
            <Card className="chart-card-modern">
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> Tax Exempted Sector Dividend Report</Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>{data.length} tax exempted companies ({rangeText})</h5>
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

export default DividendTaxExempted;

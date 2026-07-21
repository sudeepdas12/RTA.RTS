import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Alert } from 'react-bootstrap';
import { FaChartBar, FaUsers } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { dividendService } from '../../services/api';
import { buildDateParams, formatCurrency, aggregateBy, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const DividendClientWise = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      const response = await dividendService.getAll(params);
      const items = normalizeList(response.data);
      const aggregated = aggregateBy(
        items,
        (item) => item.client_name,
        (item) => item.net_payable
      );
      setData(aggregated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

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
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> Client-wise Dividend Report</Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>{data.length} clients ({rangeText})</h5>
                </div>
                {data.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                      <thead>
                      <tr>
                        <th>Client Name</th>
                        <th className="text-end">Total Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.key}</td>
                          <td className="text-end">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="table-light fw-bold">
                        <td>Grand Total</td>
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

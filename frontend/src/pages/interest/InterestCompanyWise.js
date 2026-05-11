import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Alert, Modal, Button } from 'react-bootstrap';
import { FaBuilding, FaChartBar } from 'react-icons/fa';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { interestService } from '../../services/api';
import { buildDateParams, formatCurrency, normalizeList } from '../../utils/reportUtils';
import '../../styles/dashboard.css';

const InterestCompanyWise = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [data, setData] = useState([]);
  const [detailsMap, setDetailsMap] = useState({});
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (dateRange) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildDateParams(dateRange);
      const response = await interestService.getAll(params);
      const items = normalizeList(response.data);
      const companyMap = new Map();
      const companyDetails = {};
      items.forEach((item) => {
        const companyName = item.company_name || 'N/A';
        const amount = Number(item.net_payable || 0);
        const boid = item.client_boid || '';
        const clientName = item.client_name || 'N/A';

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

        if (!companyDetails[companyName]) {
          companyDetails[companyName] = new Map();
        }
        const detailKey = boid || clientName;
        if (!companyDetails[companyName].has(detailKey)) {
          companyDetails[companyName].set(detailKey, {
            clientName,
            boid,
            amount,
          });
        } else {
          companyDetails[companyName].get(detailKey).amount += amount;
        }
      });

      const aggregated = Array.from(companyMap.values()).map((row) => ({
        companyName: row.companyName,
        total: row.total,
        boidCount: row.boids.size,
      }));

      const normalizedDetails = {};
      Object.keys(companyDetails).forEach((companyName) => {
        normalizedDetails[companyName] = Array.from(companyDetails[companyName].values());
      });

      setData(aggregated);
      setDetailsMap(normalizedDetails);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setData([]);
      setDetailsMap({});
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (companyName) => {
    setSelectedCompany(companyName);
    setShowDetailsModal(true);
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
          <h2 className="dashboard-header"><FaBuilding style={{ marginRight: '0.5rem' }} /> Debenture Interest Payable - Company-wise View</h2>

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
              <Card.Header><FaChartBar style={{ marginRight: '0.5rem' }} /> {data.length} companies ({rangeText})</Card.Header>
              <Card.Body>
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
                            <td>
                              <Button variant="link" className="p-0 text-decoration-none" onClick={() => openDetails(row.companyName)}>
                                {row.companyName}
                              </Button>
                            </td>
                            <td className="text-center">
                              <Button variant="link" className="p-0" onClick={() => openDetails(row.companyName)}>
                                {row.boidCount}
                              </Button>
                            </td>
                            <td className="text-end">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                        <tr className="table-active fw-bold">
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

          <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" enforceFocus={false}>
            <Modal.Header closeButton>
              <Modal.Title>Client Details - {selectedCompany || 'Company'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="table-responsive">
                <Table className="table-modern mb-0">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>BOID</th>
                      <th className="text-end">Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailsMap[selectedCompany] || []).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.clientName}</td>
                        <td>{row.boid || '-'}</td>
                        <td className="text-end">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                    {(detailsMap[selectedCompany] || []).length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted">No client details found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Modal.Body>
          </Modal>
        </Container>
      </div>
    </>
  );
};

export default InterestCompanyWise;

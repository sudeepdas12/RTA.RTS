import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Alert, Dropdown, Pagination, Button } from 'react-bootstrap';
import { FaClipboardList, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import '../styles/dashboard.css';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLogs = React.useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: pageSize };
      if (filterAction && filterAction !== 'All') params.action = filterAction;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await api.get('/audit/', { params });
      // Handle paginated or non-paginated responses
      if (Array.isArray(response.data)) {
        setLogs(response.data);
        setTotalCount(response.data.length);
        setPage(p);
      } else if (response.data.results) {
        setLogs(response.data.results);
        setTotalCount(response.data.count || 0);
        setPage(p);
      } else {
        setLogs(response.data || []);
        setTotalCount(Array.isArray(response.data) ? response.data.length : 0);
        setPage(p);
      }

      setError(null);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setError(`Error loading audit logs: ${error.message}`);
      toast.error('Failed to fetch audit logs');
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [pageSize, filterAction, fromDate, toDate]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);



  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading audit logs...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>Error Loading Data</Alert.Heading>
              <p className="mb-0">{error}</p>
            </Alert>
          </Container>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header"><FaClipboardList style={{ marginRight: '0.5rem' }} /> Audit Logs</h2>
            </Col>
            <Col md={4} className="d-flex gap-2 justify-content-end">
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                title="From date"
                className="me-2"
              />
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title="To date"
                className="me-2"
              />
              <Button variant="outline-primary" onClick={() => fetchLogs(1)}>Filter</Button>
            </Col>
            <Col md={3} className="mt-3 mt-md-0">
              <Dropdown onSelect={(value) => { setFilterAction(value); }}>
                <Dropdown.Toggle 
                  variant="outline-primary" 
                  id="action-filter-dropdown"
                  className="w-100 d-flex justify-content-between align-items-center modern-dropdown-toggle"
                >
                  {filterAction === 'All' ? 'All Actions' : filterAction === 'CREATE' ? 'Create' : filterAction === 'UPDATE' ? 'Update' : filterAction === 'DELETE' ? 'Delete' : filterAction === 'LOGIN' ? 'Login' : filterAction}
                  <FaChevronRight style={{ fontSize: '12px', transition: 'transform 0.18s' }} />
                </Dropdown.Toggle>

                <Dropdown.Menu className="w-100 modern-dropdown-menu">
                  <Dropdown.Item eventKey="All" active={filterAction === 'All'} className="modern-dropdown-item">All Actions</Dropdown.Item>
                  <Dropdown.Item eventKey="CREATE" active={filterAction === 'CREATE'} className="modern-dropdown-item">Create</Dropdown.Item>
                  <Dropdown.Item eventKey="UPDATE" active={filterAction === 'UPDATE'} className="modern-dropdown-item">Update</Dropdown.Item>
                  <Dropdown.Item eventKey="DELETE" active={filterAction === 'DELETE'} className="modern-dropdown-item">Delete</Dropdown.Item>
                  <Dropdown.Item eventKey="LOGIN" active={filterAction === 'LOGIN'} className="modern-dropdown-item">Login</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Card className="chart-card-modern">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div><FaClipboardList style={{ marginRight: '0.5rem' }} /> Audit Logs</div>
              <div className="d-flex align-items-center">
                <div className="summary-meta me-3">
                  <small className="text-muted">Showing</small>
                  <div><strong>{Math.min((page - 1) * pageSize + 1, totalCount || 0)} - {Math.min(page * pageSize, totalCount || 0)}</strong> of <strong>{totalCount}</strong></div>
                </div>
                <div className="summary-badges d-flex gap-2">
                  {['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map(a => {
                    const count = logs.filter(l => l.action === a).length;
                    const variant = a === 'CREATE' ? 'success' : a === 'DELETE' ? 'danger' : a === 'LOGIN' ? 'secondary' : 'primary';
                    return <Badge key={a} bg={variant} className="px-2 py-1">{a} {count > 0 ? `(${count})` : ''}</Badge>;
                  })}
              </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive table-scrollable">
                <Table className="table-modern mb-0 table-sticky-header">
                <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">No audit logs found</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.audit_id}>
                      <td>{new Date(log.action_time || log.timestamp).toLocaleString()}</td>
                      <td>{log.username || log.user?.username || 'System'}</td>
                      <td>
                        <Badge bg={log.action === 'CREATE' ? 'success' : log.action === 'DELETE' ? 'danger' : 'primary'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td>{log.table_name || log.resource_type}</td>
                      <td className="text-truncate" style={{maxWidth: '320px'}} title={log.description || JSON.stringify(log.new_value || log.old_value || '')}>{log.description || (log.new_value?.username ? `User: ${log.new_value.username}` : JSON.stringify(log.new_value || log.old_value || '-'))}</td>
                      <td>{log.ip_address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <small className="text-muted">Page {page} · {Math.ceil((totalCount || 0)/pageSize)} pages</small>
                </div>
                <Pagination>
                  <Pagination.Prev disabled={page <= 1} onClick={() => { if (page > 1) fetchLogs(page - 1); }} />
                  {Array.from({length: Math.min(7, Math.ceil((totalCount || 0)/pageSize))}).map((_, idx) => {
                    const p = Math.max(1, Math.min(Math.ceil((totalCount || 0)/pageSize), page - 3 + idx));
                    return <Pagination.Item key={p} active={p === page} onClick={() => fetchLogs(p)}>{p}</Pagination.Item>;
                  })}
                  <Pagination.Next disabled={page >= Math.ceil((totalCount || 0)/pageSize)} onClick={() => { if (page < Math.ceil((totalCount || 0)/pageSize)) fetchLogs(page + 1); }} />
                </Pagination>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </>
  );
};

export default AuditLogs;
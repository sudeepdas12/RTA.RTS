import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Alert, Dropdown, Pagination } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaUsers, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import '../styles/dashboard.css';

const Clients = () => {
  const DEFAULT_PAGE_SIZE = 50;
  const [clients, setClients] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialCompany = params.get('company') || '';
  const initialSearch = params.get('search') || '';
  const initialHolderType = params.get('holder_type') || 'All';
  const initialPage = Math.max(1, Number(params.get('page') || 1));
  const initialPageSize = Math.max(1, Number(params.get('page_size') || DEFAULT_PAGE_SIZE));

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [companyFilter, setCompanyFilter] = useState(initialCompany);
  const [showModal, setShowModal] = useState(false);
  const [showBoidModal, setShowBoidModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterType, setFilterType] = useState(initialHolderType);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentClient, setCurrentClient] = useState({
    client_code: '',
    full_name: '',
    boid: '',
    company: '', // will hold company id
    holder_type: 'Public',
    pan_or_citizenship: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active'
  });
  const [boidQuery, setBoidQuery] = useState('');
  const [boidResult, setBoidResult] = useState(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = {};
      if (companyFilter) params.company = companyFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterType !== 'All') params.holder_type = filterType;
      params.page = currentPage;
      params.page_size = pageSize;

      const response = await api.get('/clients/', { params });
      const payload = response.data;
      if (Array.isArray(payload)) {
        setClients(payload);
        setTotalClients(payload.length);
        setTotalPages(1);
      } else {
        const effectivePageSize = pageSize || DEFAULT_PAGE_SIZE;
        setClients(payload.results || []);
        setTotalClients(payload.count || 0);
        setTotalPages(Math.max(1, Math.ceil((payload.count || 0) / effectivePageSize)));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to fetch clients');
      setClients([]);
      setTotalClients(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [companyFilter, searchTerm, filterType, currentPage, pageSize]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get('/companies/');
      setCompanies(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    }
  }, []);

  useEffect(() => {
    // reload clients when company filter changes
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    // load companies once
    fetchCompanies();
  }, [fetchCompanies]);

  // Keep URL state in sync for reliable pagination and shareable views
  useEffect(() => {
    const p = new URLSearchParams();
    if (companyFilter) {
      p.set('company', companyFilter);
    }
    if (searchTerm.trim()) {
      p.set('search', searchTerm.trim());
    }
    if (filterType !== 'All') {
      p.set('holder_type', filterType);
    }
    p.set('page', String(currentPage));
    p.set('page_size', String(pageSize));

    const nextSearch = p.toString();
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (nextSearch !== currentSearch) {
      navigate({ search: nextSearch }, { replace: true });
    }
  }, [companyFilter, searchTerm, filterType, currentPage, pageSize, location.search, navigate]);

  

  const handleShowModal = (client = null) => {
    if (client) {
      // API returns `company` field (id); normalize into our state
      setCurrentClient({
        ...client,
        company: client.company || ''
      });
      setEditMode(true);
    } else {
      setCurrentClient({
        client_code: '',
        full_name: '',
        boid: '',
        company: '',
        holder_type: 'Public',
        pan_or_citizenship: '',
        bank_name: '',
        bank_account_no: '',
        status: 'Active'
      });
      setEditMode(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
  };

  const handleSave = async () => {
    try {
      // Basic client-side validation for required BOID
      if (!currentClient.boid || String(currentClient.boid).trim() === '') {
        toast.error('BOID is required');
        return;
      }
      // if company input is present make sure it's valid id (optional)
      if (currentClient.company !== '' && isNaN(Number(currentClient.company))) {
        toast.error('Please select a valid company');
        return;
      }

      // For clarity and to keep payload consistent with component state,
      // build the payload by spreading the current client state.
      // payload = { ...currentClient }
      const payload = { ...currentClient };
      // API expects `company` field not `company_id`
      if (payload.company === '') delete payload.company;

      if (editMode) {
        await api.put(`/clients/${currentClient.client_id}/`, payload);
        toast.success('Client updated successfully');
      } else {
        await api.post('/clients/', payload);
        toast.success('Client created successfully');
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      const msg = error.response?.data?.boid || error.response?.data?.message || 'Failed to save client';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await api.delete(`/clients/${id}/`);
        toast.success('Client deleted successfully');
        fetchClients();
      } catch (error) {
        toast.error('Failed to delete client');
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/clients/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (value) => {
    setFilterType(value || 'All');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleCompanyFilterClear = () => {
    setCompanyFilter('');
    setCurrentPage(1);
  };
  const renderPaginationItems = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let page = start; page <= end; page += 1) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    return items;
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading clients...</p>
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
              <h2 className="dashboard-header"><FaUsers style={{ marginRight: '0.5rem' }} /> Clients Management</h2>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={4} className="mb-2">
              <Form.Control
                type="text"
                placeholder="Search by name, code, BOID, or folio..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </Col>
            {companyFilter && (
              <Col md={4} className="mb-2 d-flex align-items-center">
                <Badge bg="info" className="me-2">
                  Filtered by company: {companies.find(c => String(c.company_id) === String(companyFilter))?.company_name || companyFilter}
                </Badge>
                <Button size="sm" variant="outline-secondary" onClick={handleCompanyFilterClear}>
                  Clear
                </Button>
              </Col>
            )}
            <Col md={3} className="mb-2">
              <Dropdown onSelect={handleFilterTypeChange}>
                <Dropdown.Toggle 
                  variant="outline-primary" 
                  id="type-filter-dropdown"
                  className="w-100 d-flex justify-content-between align-items-center modern-dropdown-toggle"
                  style={{
                    background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
                    border: '2px solid #e9d5ff',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    color: '#8860D0',
                    fontWeight: '600',
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(136, 96, 208, 0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {filterType === 'All' ? 'All Types' : filterType}
                  <FaChevronRight style={{ fontSize: '12px', transition: 'transform 0.18s' }} />
                </Dropdown.Toggle>

                <Dropdown.Menu 
                  className="w-100 modern-dropdown-menu"
                  style={{
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(136, 96, 208, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    padding: '8px',
                    marginTop: '8px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <Dropdown.Item 
                    eventKey="All"
                    active={filterType === 'All'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'All' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterType === 'All' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    All Types
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Public"
                    active={filterType === 'Public'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Public' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterType === 'Public' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Public
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Promoter"
                    active={filterType === 'Promoter'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Promoter' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterType === 'Promoter' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Promoter
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Institution"
                    active={filterType === 'Institution'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Institution' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterType === 'Institution' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Institution
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mb-2">
              <CustomSelect
                options={[
                  { value: 25, label: '25 / page' },
                  { value: 50, label: '50 / page' },
                  { value: 100, label: '100 / page' },
                ]}
                value={pageSize}
                onChange={handlePageSizeChange}
                placeholder="Page size"
                isSearchable={false}
              />
            </Col>
            <Col md={3} className="text-end mb-2">
              <Button variant="outline-secondary" className="me-2" onClick={() => setShowBoidModal(true)}>
                Used BOID
              </Button>
              <Button variant="primary" onClick={handleExport}>
                <FaDownload /> Export
              </Button>
            </Col>
          </Row>

          <Card className="chart-card-modern">
            <Card.Header><FaUsers style={{ marginRight: '0.5rem' }} /> Clients</Card.Header>
            <Card.Body>
              <div className="table-responsive table-scrollable">
                <Table className="table-modern mb-0 table-sticky-header">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>BOID</th>
                  <th>Client Name</th>
                  { !companyFilter && <th>Company</th> }
                  <th>Type</th>
                  <th>PAN/Citizenship</th>
                  <th>Bank</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={companyFilter ? 8 : 9} className="text-center">No clients found</td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.client_id}>
                      <td><strong>{client.client_code}</strong></td>
                      <td>{client.boid || '-'}</td>
                      <td>{client.client_name || client.full_name}</td>
                      { !companyFilter && (
                        <td>{client.company_name || client.company_detail?.company_name || '-'}</td>
                      ) }
                      <td><Badge bg={client.holder_type === 'Promoter' ? 'primary' : client.holder_type === 'Institution' ? 'success' : 'info'}>{client.holder_type}</Badge></td>
                      <td>{client.pan_or_citizenship || '-'}</td>
                      <td>{client.bank_name || '-'}</td>
                      <td>{client.status || '-'}</td>
                      <td>
                        <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleShowModal(client)}>
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(client.client_id)}>
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <small className="text-muted">
                  {totalClients === 0
                    ? 'Showing 0 clients'
                    : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalClients)} of ${totalClients} clients`}
                </small>
                <Pagination className="mb-0 clients-pagination">
                  <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                  <Pagination.Prev onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} />
                  {renderPaginationItems()}
                  <Pagination.Next onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} />
                  <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                </Pagination>
              </div>
            </Card.Body>
          </Card>

        <Modal show={showModal} onHide={handleCloseModal} size="lg" enforceFocus={false}>
          <Modal.Header closeButton>
            <Modal.Title>{editMode ? 'Edit Client' : 'Add Client'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Client Code *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.client_code}
                      onChange={(e) => setCurrentClient({ ...currentClient, client_code: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>BOID *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.boid}
                      onChange={(e) => setCurrentClient({ ...currentClient, boid: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Holder Type *</Form.Label>
                    <CustomSelect
                      options={[{ value: 'Public', label: 'Public' }, { value: 'Promoter', label: 'Promoter' }, { value: 'Institution', label: 'Institution' }]}
                      value={currentClient.holder_type}
                      onChange={(val) => setCurrentClient({ ...currentClient, holder_type: val })}
                      placeholder="Select Holder Type"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Client Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={currentClient.full_name || ''}
                  onChange={(e) => setCurrentClient({ ...currentClient, full_name: e.target.value })}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Company</Form.Label>
                    <CustomSelect
                      options={companies.map((c) => ({ value: c.company_id, label: c.company_name }))}
                      value={currentClient.company}
                      onChange={(val) => setCurrentClient({ ...currentClient, company: val })}
                      placeholder="Select Company"
                      isSearchable
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>PAN or Citizenship</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.pan_or_citizenship || ''}
                      onChange={(e) => setCurrentClient({ ...currentClient, pan_or_citizenship: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bank Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.bank_name || ''}
                      onChange={(e) => setCurrentClient({ ...currentClient, bank_name: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bank Account No</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.bank_account_no || ''}
                      onChange={(e) => setCurrentClient({ ...currentClient, bank_account_no: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <CustomSelect
                  options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                  value={currentClient.status || 'Active'}
                  onChange={(val) => setCurrentClient({ ...currentClient, status: val })}
                  placeholder="Select Status"
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              {editMode ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showBoidModal} onHide={() => { setShowBoidModal(false); setBoidResult(null); setBoidQuery(''); }}>
          <Modal.Header closeButton>
            <Modal.Title>Used BOID Lookup</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>BOID</Form.Label>
                <Form.Control
                  type="text"
                  value={boidQuery}
                  onChange={(e) => setBoidQuery(e.target.value)}
                  placeholder="Enter BOID to lookup"
                />
              </Form.Group>
              <div className="text-end">
                <Button variant="primary" onClick={async () => {
                  try {
                    const res = await api.get('/clients/lookup_boid/', { params: { boid: boidQuery } });
                    setBoidResult({ found: true, data: res.data });
                  } catch (err) {
                    setBoidResult({ found: false });
                  }
                }}>Search</Button>
              </div>
              <hr />
              {boidResult && (boidResult.found ? (
                <div>
                  <p><strong>Client Code:</strong> {boidResult.data.client_code}</p>
                  <p><strong>Client Name:</strong> {boidResult.data.client_name || boidResult.data.full_name}</p>
                  <p><strong>BOID:</strong> {boidResult.data.boid}</p>
                </div>
              ) : (
                <p className="text-muted">No client found for the provided BOID.</p>
              ))}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowBoidModal(false); setBoidResult(null); setBoidQuery(''); }}>Close</Button>
          </Modal.Footer>
        </Modal>

        </Container>
      </div>
    </>
  );
};

export default Clients;

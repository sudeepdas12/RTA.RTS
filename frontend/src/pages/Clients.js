import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Alert, Dropdown } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaUsers, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import '../styles/dashboard.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [currentClient, setCurrentClient] = useState({
    client_code: '',
    client_name: '',
    company_id: '',
    holder_type: 'Individual',
    folio_no: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
    fetchCompanies();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to fetch clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/');
      setCompanies(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    }
  };

  const handleShowModal = (client = null) => {
    if (client) {
      setCurrentClient(client);
      setEditMode(true);
    } else {
      setCurrentClient({
        client_code: '',
        client_name: '',
        company_id: '',
        holder_type: 'Individual',
        folio_no: '',
        email: '',
        phone: '',
        address: ''
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
      if (editMode) {
        await api.put(`/clients/${currentClient.client_id}/`, currentClient);
        toast.success('Client updated successfully');
      } else {
        await api.post('/clients/', currentClient);
        toast.success('Client created successfully');
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save client');
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

  const filteredClients = clients.filter(client => {
    const name = (client.client_name || '').toLowerCase();
    const code = (client.client_code || '').toLowerCase();
    const folio = (client.folio_no || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = name.includes(term) || code.includes(term) || folio.includes(term);
    const matchesType = filterType === 'All' || client.holder_type === filterType;
    return matchesSearch && matchesType;
  });

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
                placeholder="Search by name, code, or folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={3} className="mb-2">
              <Dropdown onSelect={(value) => setFilterType(value)}>
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
                      background: filterType === 'All' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                      color: filterType === 'All' ? '#ffffff' : '#1e293b',
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
                    eventKey="Individual"
                    active={filterType === 'Individual'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Individual' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                      color: filterType === 'Individual' ? '#ffffff' : '#1e293b',
                      fontWeight: filterType === 'Individual' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Individual
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Corporate"
                    active={filterType === 'Corporate'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Corporate' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                      color: filterType === 'Corporate' ? '#ffffff' : '#1e293b',
                      fontWeight: filterType === 'Corporate' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Corporate
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Joint"
                    active={filterType === 'Joint'}
                    className="modern-dropdown-item"
                    style={{
                      background: filterType === 'Joint' ? 'linear-gradient(135deg, #8860D0, #9d7de3)' : 'transparent',
                      color: filterType === 'Joint' ? '#ffffff' : '#1e293b',
                      fontWeight: filterType === 'Joint' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Joint
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={5} className="text-end mb-2">
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
                  <th>Client Name</th>
                  <th>Type</th>
                  <th>Folio No</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No clients found</td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <tr key={client.client_id}>
                      <td><strong>{client.client_code}</strong></td>
                      <td>{client.client_name}</td>
                      <td><Badge bg={client.holder_type === 'Individual' ? 'primary' : client.holder_type === 'Corporate' ? 'success' : 'info'}>{client.holder_type}</Badge></td>
                      <td>{client.folio_no || '-'}</td>
                      <td>{client.email || '-'}</td>
                      <td>{client.phone || '-'}</td>
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
            </Card.Body>
          </Card>

        <Modal show={showModal} onHide={handleCloseModal} size="lg">
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
                    <Form.Label>Holder Type *</Form.Label>
                    <Form.Select
                      value={currentClient.holder_type}
                      onChange={(e) => setCurrentClient({ ...currentClient, holder_type: e.target.value })}
                    >
                      <option value="Individual">Individual</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Joint">Joint</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Client Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={currentClient.client_name}
                  onChange={(e) => setCurrentClient({ ...currentClient, client_name: e.target.value })}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Company</Form.Label>
                    <Form.Select
                      value={currentClient.company_id}
                      onChange={(e) => setCurrentClient({ ...currentClient, company_id: e.target.value })}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Folio Number</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.folio_no}
                      onChange={(e) => setCurrentClient({ ...currentClient, folio_no: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={currentClient.email}
                      onChange={(e) => setCurrentClient({ ...currentClient, email: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentClient.phone}
                      onChange={(e) => setCurrentClient({ ...currentClient, phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={currentClient.address}
                  onChange={(e) => setCurrentClient({ ...currentClient, address: e.target.value })}
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
        </Container>
      </div>
    </>
  );
};

export default Clients;

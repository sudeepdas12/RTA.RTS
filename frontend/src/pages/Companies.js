import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Alert, Dropdown } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaBuilding, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import '../styles/dashboard.css';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('All');
  const [currentCompany, setCurrentCompany] = useState({
    company_code: '',
    company_name: '',
    sector_type: 'Private',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/');
      setCompanies(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setError(`Error loading companies: ${error.message}`);
      toast.error('Failed to fetch companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (company = null) => {
    if (company) {
      setCurrentCompany(company);
      setEditMode(true);
    } else {
      setCurrentCompany({
        company_code: '',
        company_name: '',
        sector_type: 'Private',
        contact_person: '',
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
        await api.put(`/companies/${currentCompany.company_id}/`, currentCompany);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies/', currentCompany);
        toast.success('Company created successfully');
      }
      fetchCompanies();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save company');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await api.delete(`/companies/${id}/`);
        toast.success('Company deleted successfully');
        fetchCompanies();
      } catch (error) {
        toast.error('Failed to delete company');
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/companies/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `companies_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const filteredCompanies = companies.filter(company => {
    const name = (company.company_name || '').toLowerCase();
    const code = (company.company_code || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = name.includes(term) || code.includes(term);
    const matchesSector = filterSector === 'All' || company.sector_type === filterSector;
    return matchesSearch && matchesSector;
  });

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading companies...</p>
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
              <h2 className="dashboard-header"><FaBuilding className="me-2" /> Companies Management</h2>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={4} className="mb-2">
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="mb-2">
              <Dropdown onSelect={(value) => setFilterSector(value)}>
                <Dropdown.Toggle 
                  variant="outline-primary" 
                  id="sector-filter-dropdown"
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
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {filterSector === 'All' ? 'All Sectors' : filterSector}
                  <FaChevronRight className="submenu-icon" />
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
                    backgroundColor: '#ffffff',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Dropdown.Item 
                    eventKey="All"
                    active={filterSector === 'All'}
                    className="modern-dropdown-item"
                    style={{
                      backgroundColor: filterSector === 'All' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      background: filterSector === 'All' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterSector === 'All' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    All Sectors
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Private"
                    active={filterSector === 'Private'}
                    className="modern-dropdown-item"
                    style={{
                      backgroundColor: filterSector === 'Private' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      background: filterSector === 'Private' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterSector === 'Private' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Private
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Tax-Exempted"
                    active={filterSector === 'Tax-Exempted'}
                    className="modern-dropdown-item"
                    style={{
                      backgroundColor: filterSector === 'Tax-Exempted' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      background: filterSector === 'Tax-Exempted' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterSector === 'Tax-Exempted' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Tax-Exempted
                  </Dropdown.Item>
                  <Dropdown.Item 
                    eventKey="Public"
                    active={filterSector === 'Public'}
                    className="modern-dropdown-item"
                    style={{
                      backgroundColor: filterSector === 'Public' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      background: filterSector === 'Public' ? 'linear-gradient(135deg, #ffd6ea, #ffc1e0)' : 'transparent',
                      color: '#1e293b',
                      fontWeight: filterSector === 'Public' ? '700' : '500',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }}
                  >
                    Public
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
            <Card.Header><FaBuilding style={{ marginRight: '0.5rem' }} /> Companies</Card.Header>
            <Card.Body>
              <div className="table-responsive table-scrollable">
                <Table className="table-modern mb-0 table-sticky-header">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company Name</th>
                  <th>Sector</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">No companies found</td>
                  </tr>
                ) : (
                  filteredCompanies.map(company => (
                    <tr key={company.company_id}>
                      <td><strong>{company.company_code}</strong></td>
                      <td>{company.company_name}</td>
                      <td><Badge bg={company.sector_type === 'Private' ? 'primary' : company.sector_type === 'Public' ? 'success' : 'info'}>{company.sector_type}</Badge></td>
                      <td>{company.contact_person || '-'}</td>
                      <td>{company.email || '-'}</td>
                      <td>{company.phone || '-'}</td>
                      <td>
                        <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleShowModal(company)}>
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(company.company_id)}>
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
            <Modal.Title>{editMode ? 'Edit Company' : 'Add Company'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Company Code *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.company_code}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, company_code: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sector Type *</Form.Label>
                    <CustomSelect
                      options={[{ value: 'Private', label: 'Private' }, { value: 'Tax-Exempted', label: 'Tax-Exempted' }, { value: 'Public', label: 'Public' }]}
                      value={currentCompany.sector_type}
                      onChange={(val) => setCurrentCompany({ ...currentCompany, sector_type: val })}
                      placeholder="Select Sector"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Company Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={currentCompany.company_name}
                  onChange={(e) => setCurrentCompany({ ...currentCompany, company_name: e.target.value })}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.contact_person}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, contact_person: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.phone}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={currentCompany.email}
                  onChange={(e) => setCurrentCompany({ ...currentCompany, email: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={currentCompany.address}
                  onChange={(e) => setCurrentCompany({ ...currentCompany, address: e.target.value })}
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

export default Companies;

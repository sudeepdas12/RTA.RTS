import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaBuilding } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import '../styles/dashboard.css';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCompany, setCurrentCompany] = useState({
    company_code: '',
    company_name: '',
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
    return name.includes(term) || code.includes(term);
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
            <Col md={7} className="mb-2">
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center">No companies found</td>
                  </tr>
                ) : (
                  filteredCompanies.map(company => (
                    <tr key={company.company_id}>
                      <td><strong>{company.company_code}</strong></td>
                      <td>{company.company_name}</td>
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
                    <Form.Label>Company Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.company_name}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, company_name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
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
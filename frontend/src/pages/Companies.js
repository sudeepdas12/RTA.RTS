import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Alert, Dropdown, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaDownload, FaBuilding, FaChevronRight, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import '../styles/dashboard.css';

const Companies = () => {
  const DEFAULT_PAGE_SIZE = 50;
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentCompany, setCurrentCompany] = useState({
    company_code: '',
    company_name: '',
    sector_type: 'Private',
    interest_tax_status: 'Taxable',
    pan_no: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active'
  });

  const fetchCompanies = useCallback(async () => {
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterSector !== 'All') params.sector_type = filterSector;

      const response = await api.get('/companies/', { params });
      const payload = response.data;
      if (Array.isArray(payload)) {
        setCompanies(payload);
        setTotalCompanies(payload.length);
        setTotalPages(1);
      } else {
        setCompanies(payload.results || []);
        setTotalCompanies(payload.count || 0);
        setTotalPages(Math.max(1, Math.ceil((payload.count || 0) / pageSize)));
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setError(`Error loading companies: ${error.message}`);
      toast.error('Failed to fetch companies');
      setCompanies([]);
      setTotalCompanies(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterSector]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSector, pageSize]);

  const handleShowModal = (company = null) => {
    if (company) {
      setCurrentCompany(company);
      setEditMode(true);
    } else {
      setCurrentCompany({
        company_code: '',
        company_name: '',
        sector_type: 'Private',
        interest_tax_status: 'Taxable',
        pan_no: '',
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
      const payload = {
        company_code: currentCompany.company_code,
        company_name: currentCompany.company_name,
        sector_type: currentCompany.sector_type,
        interest_tax_status: currentCompany.interest_tax_status || null,
        pan_no: currentCompany.pan_no || null,
        bank_name: currentCompany.bank_name || null,
        bank_account_no: currentCompany.bank_account_no || null,
        status: currentCompany.status || 'Active',
      };

      if (editMode) {
        await api.put(`/companies/${currentCompany.company_id}/`, payload);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies/', payload);
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
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="mb-2">
              <Dropdown onSelect={(value) => { setFilterSector(value); setCurrentPage(1); }}>
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
            <Col md={2} className="mb-2">
              <CustomSelect
                options={[
                  { value: 25, label: '25 / page' },
                  { value: 50, label: '50 / page' },
                  { value: 100, label: '100 / page' },
                ]}
                value={pageSize}
                onChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}
                placeholder="Page size"
                isSearchable={false}
              />
            </Col>
            <Col md={3} className="text-end mb-2">
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
                  <th>Tax Status</th>
                  <th>PAN</th>
                  <th>Bank</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No companies found</td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr key={company.company_id}>
                      <td><strong>{company.company_code}</strong></td>
                      <td>{company.company_name}</td>
                      <td><Badge bg={company.sector_type === 'Private' ? 'primary' : company.sector_type === 'Public' ? 'success' : 'info'}>{company.sector_type}</Badge></td>
                      <td>{company.interest_tax_status || '-'}</td>
                      <td>{company.pan_no || '-'}</td>
                      <td>{company.bank_name || '-'}</td>
                      <td>                        <Button size="sm" variant="outline-info" className="me-2" onClick={() => navigate(`/clients?company=${company.company_id}`)}>
                          <FaUsers />
                        </Button>                        <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleShowModal(company)}>
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
              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <small className="text-muted">
                  {totalCompanies === 0
                    ? 'Showing 0 companies'
                    : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCompanies)} of ${totalCompanies} companies`}
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
                      options={[{ value: 'Private', label: 'Private' }, { value: 'Public', label: 'Public' }]}
                      value={currentCompany.sector_type}
                      onChange={(val) => setCurrentCompany({ ...currentCompany, sector_type: val })}
                      placeholder="Select Sector"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Interest Tax Status</Form.Label>
                    <CustomSelect
                      options={[{ value: 'Taxable', label: 'Taxable' }, { value: 'Exempted', label: 'Exempted' }]}
                      value={currentCompany.interest_tax_status || ''}
                      onChange={(val) => setCurrentCompany({ ...currentCompany, interest_tax_status: val })}
                      placeholder="Select Tax Status"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <CustomSelect
                      options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                      value={currentCompany.status || 'Active'}
                      onChange={(val) => setCurrentCompany({ ...currentCompany, status: val })}
                      placeholder="Select Status"
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
                    <Form.Label>PAN No</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.pan_no || ''}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, pan_no: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bank Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentCompany.bank_name || ''}
                      onChange={(e) => setCurrentCompany({ ...currentCompany, bank_name: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Bank Account No</Form.Label>
                <Form.Control
                  type="text"
                  value={currentCompany.bank_account_no || ''}
                  onChange={(e) => setCurrentCompany({ ...currentCompany, bank_account_no: e.target.value })}
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

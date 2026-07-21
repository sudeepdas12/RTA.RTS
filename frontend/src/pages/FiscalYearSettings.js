import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import NavigationBar from '../components/NavigationBar';
import { settingsService, companyService } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import '../styles/dashboard.css';

const FiscalYearSettings = () => {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    company: '',
    fiscal_year: '',
    interest_rate: 7.0,
    tax_rate: 0.0,
    is_active: false,
  });

  const fetchFiscalYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsService.getAllFiscalYears();
      setFiscalYears(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch fiscal year settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setCompanyLoading(true);
    try {
      const response = await companyService.getAll({ page_size: 1000 });
      setCompanies(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch company list');
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
    fetchCompanies();
  }, []);

  const handleShowModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        company: item.company,
        fiscal_year: item.fiscal_year,
        interest_rate: item.interest_rate,
        tax_rate: item.tax_rate,
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        company: '',
        fiscal_year: '',
        interest_rate: 7.0,
        tax_rate: 0.0,
        is_active: false,
      });
    }
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingItem) {
        await settingsService.updateFiscalYear(editingItem.id, formData);
        setSuccess('Fiscal year updated successfully');
      } else {
        await settingsService.createFiscalYear(formData);
        setSuccess('Fiscal year created successfully');
      }
      fetchFiscalYears();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.fiscal_year?.[0] || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fiscal year?')) return;

    try {
      await settingsService.deleteFiscalYear(id);
      setSuccess('Fiscal year deleted successfully');
      fetchFiscalYears();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete fiscal year');
    }
  };

  const handleSetActive = async (id) => {
    try {
      await settingsService.setActiveFiscalYear(id);
      setSuccess('Active fiscal year updated');
      fetchFiscalYears();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set active fiscal year');
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="dashboard-header">📅 Fiscal Year Settings</h2>
            <Button variant="primary" onClick={() => handleShowModal()}>
              Add Fiscal Year
            </Button>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

          {loading ? (
            <div className="loading-container-modern">
              <div className="text-center">
                <div className="loading-spinner-modern mx-auto mb-3"></div>
                <p className="fs-5 text-muted">Loading fiscal year settings...</p>
              </div>
            </div>
          ) : (
            <Card className="chart-card-modern">
              <Card.Header>📅 Fiscal Year Settings</Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table className="table-modern mb-0">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Fiscal Year</th>
                        <th>Interest Rate (%)</th>
                        <th>Tax Rate (%)</th>
                        <th>Status</th>
                        <th>Updated At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                <tbody>
                  {fiscalYears.length === 0 ? (
                    <tr>
                          <td colSpan="7" className="text-center text-muted">
                        No fiscal year settings found
                      </td>
                    </tr>
                  ) : (
                    fiscalYears.map((item) => (
                      <tr key={item.id}>
                            <td>{item.company_name || item.company_detail?.company_name || '—'}</td>
                        <td>{item.fiscal_year}</td>
                        <td>{item.interest_rate}%</td>
                        <td>{item.tax_rate}%</td>
                        <td>
                          {item.is_active ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(item)}
                          >
                            Edit
                          </Button>
                          {!item.is_active && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleSetActive(item.id)}
                            >
                              Set Active
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
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
          )}
        </Container>
      </div>

        {/* Add/Edit Modal */}
        <Modal show={showModal} onHide={handleCloseModal}>
          <Modal.Header closeButton>
            <Modal.Title>{editingItem ? 'Edit Fiscal Year' : 'Add Fiscal Year'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Company *</Form.Label>
                <CustomSelect
                  isDisabled={companyLoading || !!editingItem}
                  options={companies.map((c) => ({ value: c.company_id, label: c.company_name }))}
                  value={formData.company}
                  onChange={(val) => setFormData({ ...formData, company: val })}
                  placeholder={companyLoading ? 'Loading companies...' : 'Select Company'}
                  isSearchable
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Fiscal Year *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., 2080-81"
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                  required
                  disabled={!!editingItem}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Interest Rate (%) *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Tax Rate (%) *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Set as Active Fiscal Year"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
    </>
  );
};

export default FiscalYearSettings;

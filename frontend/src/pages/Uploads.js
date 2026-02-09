import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Tabs, Tab, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { FaUpload, FaDownload, FaPlus, FaEdit, FaTrash, FaDatabase } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api, { settingsService, companyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const Uploads = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('companies');
  const [uploading, setUploading] = useState({
    companies: false,
    clients: false,
    reconciliation: false,
    interest: false,
    dividend: false,
    fiscalYears: false,
  });
  const [saving, setSaving] = useState({
    companies: false,
    clients: false,
    users: false,
    fiscalYears: false,
  });
  const [roles, setRoles] = useState([]);
  const [companyForm, setCompanyForm] = useState({
    company_code: '',
    company_name: '',
    sector_type: 'Private',
    interest_tax_status: 'Taxable',
    pan_no: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active',
  });
  const [clientForm, setClientForm] = useState({
    client_code: '',
    full_name: '',
    holder_type: 'Public',
    pan_or_citizenship: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active',
  });
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'Active',
  });
  const [companies, setCompanies] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [showFiscalModal, setShowFiscalModal] = useState(false);
  const [editingFiscal, setEditingFiscal] = useState(null);
  const [fiscalForm, setFiscalForm] = useState({
    company: '',
    fiscal_year: '',
    interest_rate: '7.00',
    tax_rate: '0.00',
    is_active: false,
  });

  const canCreateCompanies = hasPermission('companies', 'create');
  const canCreateClients = hasPermission('clients', 'create');
  const canCreateUsers = hasPermission('users', 'create');
    const canManageSettings = hasPermission('users', 'read');
  const canCreateInterest = hasPermission('interest_payables', 'create');
  const canCreateDividend = hasPermission('dividend_payables', 'create');
  const canCreateReconciliation = hasPermission('reconciliation', 'create');
  const canAnyCreate = canCreateCompanies || canCreateClients || canCreateUsers || canCreateInterest || canCreateDividend || canCreateReconciliation;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('/users/roles/');
        setRoles(Array.isArray(response.data) ? response.data : response.data.results || []);
      } catch (error) {
        setRoles([]);
      }
    };

    if (canCreateUsers) {
      fetchRoles();
    }
  }, [canCreateUsers]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await companyService.getAllCompanies();
        setCompanies(response.data.results || response.data || []);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    };

    if (canManageSettings) {
      fetchCompanies();
      loadFiscalYears();
    }
  }, [canManageSettings]);

  const loadFiscalYears = async () => {
    try {
      const response = await settingsService.getAllFiscalYears();
      setFiscalYears(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to load fiscal years:', error);
    }
  };

  const handleFiscalUpload = async (file) => {
    if (!file) return;
    try {
      setUploading((prev) => ({ ...prev, fiscalYears: true }));
      const response = await settingsService.bulkUploadFiscalYears(file);
      toast.success(`Uploaded: ${response.data.created} created, ${response.data.updated} updated`);
      if (response.data.errors?.length > 0) {
        console.log('Upload errors:', response.data.errors);
      }
      loadFiscalYears();
    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload failed:', error);
    } finally {
      setUploading((prev) => ({ ...prev, fiscalYears: false }));
    }
  };

  const handleFiscalSubmit = async () => {
    if (!fiscalForm.company || !fiscalForm.fiscal_year) {
      toast.error('Company and Fiscal Year are required');
      return;
    }
    try {
      setSaving((prev) => ({ ...prev, fiscalYears: true }));
      if (editingFiscal) {
        await settingsService.updateFiscalYear(editingFiscal.id, fiscalForm);
        toast.success('Fiscal year updated successfully');
      } else {
        await settingsService.createFiscalYear(fiscalForm);
        toast.success('Fiscal year created successfully');
      }
      setShowFiscalModal(false);
      setEditingFiscal(null);
      setFiscalForm({
        company: '',
        fiscal_year: '',
        interest_rate: '7.00',
        tax_rate: '0.00',
        is_active: false,
      });
      loadFiscalYears();
    } catch (error) {
      toast.error('Failed to save fiscal year');
      console.error('Failed to save:', error);
    } finally {
      setSaving((prev) => ({ ...prev, fiscalYears: false }));
    }
  };

  const handleEditFiscal = (fiscal) => {
    setEditingFiscal(fiscal);
    setFiscalForm({
      company: fiscal.company,
      fiscal_year: fiscal.fiscal_year,
      interest_rate: fiscal.interest_rate,
      tax_rate: fiscal.tax_rate,
      is_active: fiscal.is_active,
    });
    setShowFiscalModal(true);
  };

  const handleDeleteFiscal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fiscal year setting?')) return;
    try {
      await settingsService.deleteFiscalYear(id);
      toast.success('Fiscal year deleted');
      loadFiscalYears();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleSetActive = async (id) => {
    try {
      await settingsService.setActiveFiscalYear(id);
      toast.success('Fiscal year activated');
      loadFiscalYears();
    } catch (error) {
      toast.error('Failed to activate');
    }
  };

  const downloadFiscalTemplate = () => {
    const csv = 'Company Name,Fiscal Year,Interest Rate %,Tax Rate %\n' +
                'ABC Company,2080-81,7.00,0.00\n' +
                'XYZ Company,2081-82,7.50,5.00\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fiscal_year_settings_template.csv';
    link.click();
  };

  const handleUpload = async (type, endpoint, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading((prev) => ({ ...prev, [type]: true }));
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload failed:', error);
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDownloadTemplate = async (endpoint, filename) => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
      console.error('Template download failed:', error);
    }
  };

  const handleCreateCompany = async () => {
    if (!companyForm.company_code || !companyForm.company_name) {
      toast.error('Company code and name are required');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, companies: true }));
      await api.post('/companies/', companyForm);
      toast.success('Company created successfully');
      setCompanyForm({
        company_code: '',
        company_name: '',
        sector_type: 'Private',
        interest_tax_status: 'Taxable',
        pan_no: '',
        bank_name: '',
        bank_account_no: '',
        status: 'Active',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create company');
    } finally {
      setSaving((prev) => ({ ...prev, companies: false }));
    }
  };

  const handleCreateClient = async () => {
    if (!clientForm.client_code || !clientForm.full_name) {
      toast.error('Client code and full name are required');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, clients: true }));
      await api.post('/clients/', clientForm);
      toast.success('Client created successfully');
      setClientForm({
        client_code: '',
        full_name: '',
        holder_type: 'Public',
        pan_or_citizenship: '',
        bank_name: '',
        bank_account_no: '',
        status: 'Active',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create client');
    } finally {
      setSaving((prev) => ({ ...prev, clients: false }));
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.full_name || !userForm.password || !userForm.role_id) {
      toast.error('Username, full name, role, and password are required');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, users: true }));
      await api.post('/users/', userForm);
      toast.success('User created successfully');
      setUserForm({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'Active',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving((prev) => ({ ...prev, users: false }));
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header"><FaDatabase style={{ marginRight: '0.5rem' }} /> Data Center</h2>
            </Col>
          </Row>
          {!canAnyCreate && (
            <Alert variant="warning">
              You don’t have create or upload permissions. Contact an admin to enable access for your role.
            </Alert>
          )}

          <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key)} className="mb-4">
          <Tab eventKey="companies" title="Companies">
            <Row className="g-4">
              {canCreateCompanies && (
                <Col lg={6}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Create Company</Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Company Code *</Form.Label>
                            <Form.Control
                              value={companyForm.company_code}
                              onChange={(e) => setCompanyForm({ ...companyForm, company_code: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Company Name *</Form.Label>
                            <Form.Control
                              value={companyForm.company_name}
                              onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Sector</Form.Label>
                            <Form.Select
                              value={companyForm.sector_type}
                              onChange={(e) => setCompanyForm({ ...companyForm, sector_type: e.target.value })}
                            >
                              <option value="Public">Public</option>
                              <option value="Private">Private</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Tax Status</Form.Label>
                            <Form.Select
                              value={companyForm.interest_tax_status}
                              onChange={(e) => setCompanyForm({ ...companyForm, interest_tax_status: e.target.value })}
                            >
                              <option value="Taxable">Taxable</option>
                              <option value="Exempted">Exempted</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              value={companyForm.status}
                              onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value })}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>PAN No</Form.Label>
                            <Form.Control
                              value={companyForm.pan_no}
                              onChange={(e) => setCompanyForm({ ...companyForm, pan_no: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Bank Name</Form.Label>
                            <Form.Control
                              value={companyForm.bank_name}
                              onChange={(e) => setCompanyForm({ ...companyForm, bank_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Bank Account No</Form.Label>
                            <Form.Control
                              value={companyForm.bank_account_no}
                              onChange={(e) => setCompanyForm({ ...companyForm, bank_account_no: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-3 text-end">
                        <Button variant="primary" onClick={handleCreateCompany} disabled={saving.companies}>
                          {saving.companies ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaPlus />} Create
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {canCreateCompanies && (
                <Col lg={6}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Companies Upload</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Companies File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => handleUpload('companies', '/companies/upload/', e.target.files[0])}
                          disabled={uploading.companies}
                        />
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button variant="primary" disabled={uploading.companies}>
                          {uploading.companies ? <div className="loading-spinner-modern loading-spinner-md"></div> : <FaUpload />} Upload
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => handleDownloadTemplate('/companies/export_template/', 'companies_template.xlsx')}
                        >
                          <FaDownload /> Template
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="clients" title="Clients">
            <Row className="g-4">
              {canCreateClients && (
                <Col lg={6}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Create Client</Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Client Code *</Form.Label>
                            <Form.Control
                              value={clientForm.client_code}
                              onChange={(e) => setClientForm({ ...clientForm, client_code: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Full Name *</Form.Label>
                            <Form.Control
                              value={clientForm.full_name}
                              onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Holder Type</Form.Label>
                            <Form.Select
                              value={clientForm.holder_type}
                              onChange={(e) => setClientForm({ ...clientForm, holder_type: e.target.value })}
                            >
                              <option value="Public">Public</option>
                              <option value="Promoter">Promoter</option>
                              <option value="Institution">Institution</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              value={clientForm.status}
                              onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>PAN/Citizenship</Form.Label>
                            <Form.Control
                              value={clientForm.pan_or_citizenship}
                              onChange={(e) => setClientForm({ ...clientForm, pan_or_citizenship: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Bank Name</Form.Label>
                            <Form.Control
                              value={clientForm.bank_name}
                              onChange={(e) => setClientForm({ ...clientForm, bank_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Bank Account No</Form.Label>
                            <Form.Control
                              value={clientForm.bank_account_no}
                              onChange={(e) => setClientForm({ ...clientForm, bank_account_no: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-3 text-end">
                        <Button variant="primary" onClick={handleCreateClient} disabled={saving.clients}>
                          {saving.clients ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaPlus />} Create
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {canCreateClients && (
                <Col lg={6}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Clients Upload</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Clients File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => handleUpload('clients', '/clients/upload/', e.target.files[0])}
                          disabled={uploading.clients}
                        />
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button variant="primary" disabled={uploading.clients}>
                          {uploading.clients ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => handleDownloadTemplate('/clients/export_template/', 'clients_template.xlsx')}
                        >
                          <FaDownload /> Template
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="users" title="Users">
            <Row className="g-4">
              {canCreateUsers && (
                <Col lg={6}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Create User</Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Username *</Form.Label>
                            <Form.Control
                              value={userForm.username}
                              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Full Name *</Form.Label>
                            <Form.Control
                              value={userForm.full_name}
                              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Password *</Form.Label>
                            <Form.Control
                              type="password"
                              value={userForm.password}
                              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Role *</Form.Label>
                            <Form.Select
                              value={userForm.role_id}
                              onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}
                            >
                              <option value="">Select role</option>
                              {roles.map((role) => (
                                <option key={role.role_id} value={role.role_id}>
                                  {role.role_name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              value={userForm.status}
                              onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="mt-3 text-end">
                        <Button variant="primary" onClick={handleCreateUser} disabled={saving.users}>
                          {saving.users ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaPlus />} Create
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
              {!canCreateUsers && (
                <Col>
                  <Alert variant="info">You don’t have permission to create users.</Alert>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="payables" title="Payables">
            <Row className="g-4">
              {canCreateInterest && (
                <Col md={6} lg={4}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Interest Payables Upload</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Interest Payables File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => handleUpload('interest', '/payables/interest/upload/', e.target.files[0])}
                          disabled={uploading.interest}
                        />
                        <Form.Text className="text-muted">
                          Required columns: company_code, client_code, gross_interest, tax_amount, due_date
                        </Form.Text>
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button variant="primary" disabled={uploading.interest}>
                          {uploading.interest ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => handleDownloadTemplate('/payables/interest/export_template/', 'interest_payables_template.xlsx')}
                        >
                          <FaDownload /> Template
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {canCreateDividend && (
                <Col md={6} lg={4}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Dividend Payables Upload</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Dividend Payables File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => handleUpload('dividend', '/payables/dividend/upload/', e.target.files[0])}
                          disabled={uploading.dividend}
                        />
                        <Form.Text className="text-muted">
                          Required columns: company_code, client_code, shares_held, gross_dividend, tax_amount
                        </Form.Text>
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button variant="primary" disabled={uploading.dividend}>
                          {uploading.dividend ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => handleDownloadTemplate('/payables/dividend/export_template/', 'dividend_payables_template.xlsx')}
                        >
                          <FaDownload /> Template
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="reconciliation" title="Reconciliation">
            <Row className="g-4">
              {canCreateReconciliation && (
                <Col md={6} lg={4}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Bank Statement Upload</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Bank Statement</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => handleUpload('reconciliation', '/reconciliation/bank-statements/upload/', e.target.files[0])}
                          disabled={uploading.reconciliation}
                        />
                        <Form.Text className="text-muted">
                          Required columns: txn_date, reference_no, description, debit, credit, balance
                        </Form.Text>
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button variant="primary" disabled={uploading.reconciliation}>
                          {uploading.reconciliation ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => handleDownloadTemplate('/reconciliation/bank-statements/export_template/', 'bank_statement_template.xlsx')}
                        >
                          <FaDownload /> Template
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="fiscalYears" title="Fiscal Year Settings">
            <Row className="g-4">
              {canManageSettings && (
                <>
                  <Col md={6}>
                    <Card>
                      <Card.Header>Upload Fiscal Year Settings</Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>Upload CSV File</Form.Label>
                          <Form.Control
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFiscalUpload(e.target.files[0])}
                            disabled={uploading.fiscalYears}
                          />
                          <Form.Text className="text-muted">
                            Required columns: Company Name, Fiscal Year, Interest Rate %, Tax Rate %
                          </Form.Text>
                        </Form.Group>
                        <div className="d-flex gap-2">
                          <Button variant="primary" disabled={uploading.fiscalYears}>
                            {uploading.fiscalYears ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload
                          </Button>
                          <Button variant="outline-secondary" onClick={downloadFiscalTemplate}>
                            <FaDownload /> Template
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header>Manual Entry</Card.Header>
                      <Card.Body>
                        <Button variant="primary" onClick={() => setShowFiscalModal(true)}>
                          <FaPlus /> Add Fiscal Year Setting
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card>
                      <Card.Header>All Fiscal Year Settings</Card.Header>
                      <Card.Body>
                        <Table className="table-modern mb-0" responsive>
                          <thead>
                            <tr>
                              <th>Company</th>
                              <th>Fiscal Year</th>
                              <th>Interest Rate %</th>
                              <th>Tax Rate %</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fiscalYears.length === 0 && (
                              <tr><td colSpan="6" className="text-center">No fiscal year settings found</td></tr>
                            )}
                            {fiscalYears.map((fiscal) => (
                              <tr key={fiscal.id}>
                                <td>{fiscal.company_name}</td>
                                <td>{fiscal.fiscal_year}</td>
                                <td>{fiscal.interest_rate}</td>
                                <td>{fiscal.tax_rate}</td>
                                <td>
                                  {fiscal.is_active ? (
                                    <Badge bg="success">Active</Badge>
                                  ) : (
                                    <Button size="sm" variant="outline-secondary" onClick={() => handleSetActive(fiscal.id)}>
                                      Set Active
                                    </Button>
                                  )}
                                </td>
                                <td>
                                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleEditFiscal(fiscal)}>
                                    <FaEdit />
                                  </Button>
                                  <Button size="sm" variant="outline-danger" onClick={() => handleDeleteFiscal(fiscal.id)}>
                                    <FaTrash />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                </>
              )}
            </Row>
          </Tab>
        </Tabs>

        <Modal show={showFiscalModal} onHide={() => setShowFiscalModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{editingFiscal ? 'Edit' : 'Add'} Fiscal Year Setting</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Company *</Form.Label>
                <Form.Select
                  value={fiscalForm.company}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, company: e.target.value })}
                  disabled={editingFiscal}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fiscal Year * (e.g., 2080-81)</Form.Label>
                <Form.Control
                  value={fiscalForm.fiscal_year}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, fiscal_year: e.target.value })}
                  disabled={editingFiscal}
                  placeholder="2080-81"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Interest Rate %</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={fiscalForm.interest_rate}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, interest_rate: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tax Rate %</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={fiscalForm.tax_rate}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, tax_rate: e.target.value })}
                />
              </Form.Group>
              <Form.Check
                type="checkbox"
                label="Set as Active"
                checked={fiscalForm.is_active}
                onChange={(e) => setFiscalForm({ ...fiscalForm, is_active: e.target.checked })}
              />
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowFiscalModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFiscalSubmit} disabled={saving.fiscalYears}>
              {saving.fiscalYears ? <div className="loading-spinner-modern loading-spinner-sm"></div> : editingFiscal ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Modal>
        </Container>
      </div>
    </>
  );
};

export default Uploads;

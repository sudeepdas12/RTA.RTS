import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Tabs, Tab, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { FaUpload, FaDownload, FaPlus, FaEdit, FaTrash, FaDatabase } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import IAFAllocations from '../pages/IAFAllocations';
import NavigationBar from '../components/NavigationBar';
import api, { settingsService, companyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import AppDatePicker from '../components/AppDatePicker';
import '../styles/dashboard.css';

const Uploads = () => {
  const { hasPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState('companies');
  const [uploading, setUploading] = useState({
    companies: false,
    clients: false,
    reconciliation: false,
    interest: false,
    dividend: false,
    fiscalYears: false,
    debenture: false,
  });
  const [uploadFiles, setUploadFiles] = useState({
    companies: null,
    clients: null,
    reconciliation: null,
    interest: null,
    dividend: null,
    fiscalYears: null,
    debenture: null,
  });
  const [debentureUploadForm, setDebentureUploadForm] = useState({
    company_code: '',
    interest_rate: '8.75',
    tax_rate: '6.00',
    period_from: '',
    period_to: '',
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
  const [selectedUploadCompany, setSelectedUploadCompany] = useState('');
  const [selectedUploadInterestCompany, setSelectedUploadInterestCompany] = useState('');
  const [selectedUploadDividendCompany, setSelectedUploadDividendCompany] = useState('');
  const [selectedInterestPhysicalYear, setSelectedInterestPhysicalYear] = useState('');
  const [selectedDividendPhysicalYear, setSelectedDividendPhysicalYear] = useState('');
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
  const [reconForm, setReconForm] = useState({
    bank_name: '',
    account_no: '',
    statement_from: '',
    statement_to: '',
  });

  const canCreateCompanies = hasPermission('companies', 'create');
  const canCreateClients = hasPermission('clients', 'create');
  const canCreateUsers = hasPermission('users', 'create');
  const canManageSettings = hasPermission('settings', 'manage') || user?.role === 'Admin';
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
        const response = await companyService.getAll({ page_size: 1000 });
        setCompanies(response.data.results || response.data || []);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    };

    if (user) {
      fetchCompanies();
      loadFiscalYears();
    }
  }, [user]);

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
      setUploadFiles((prev) => ({ ...prev, fiscalYears: null }));
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
    // Include company_code for clients, interest, and dividend uploads
    if (type === 'clients' && selectedUploadCompany) {
      formData.append('company_code', selectedUploadCompany);
    }
    if (type === 'interest' && selectedUploadInterestCompany) {
      formData.append('company_code', selectedUploadInterestCompany);
      if (selectedInterestPhysicalYear) formData.append('physical_year', selectedInterestPhysicalYear);
    }
    if (type === 'dividend' && selectedUploadDividendCompany) {
      formData.append('company_code', selectedUploadDividendCompany);
      if (selectedDividendPhysicalYear) formData.append('physical_year', selectedDividendPhysicalYear);
    }

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
      setUploadFiles((prev) => ({ ...prev, [type]: null }));
    }
  };

  const handleReconciliationUpload = async () => {
    if (!uploadFiles.reconciliation) return;
    if (!reconForm.bank_name || !reconForm.account_no || !reconForm.statement_from || !reconForm.statement_to) {
      toast.error('Bank name, account no, and statement date range are required');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFiles.reconciliation);
    formData.append('bank_name', reconForm.bank_name);
    formData.append('account_no', reconForm.account_no);
    formData.append('statement_from', reconForm.statement_from);
    formData.append('statement_to', reconForm.statement_to);

    try {
      setUploading((prev) => ({ ...prev, reconciliation: true }));
      await api.post('/reconciliation/bank-statements/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Bank statement uploaded successfully');
    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload failed:', error);
    } finally {
      setUploading((prev) => ({ ...prev, reconciliation: false }));
      setUploadFiles((prev) => ({ ...prev, reconciliation: null }));
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

  const handleDebentureUpload = async () => {
    if (!uploadFiles.debenture || !debentureUploadForm.company_code) {
      toast.error('Company and file are required');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFiles.debenture);
    formData.append('company_code', debentureUploadForm.company_code);
    formData.append('interest_rate', debentureUploadForm.interest_rate);
    formData.append('tax_rate', debentureUploadForm.tax_rate);
    if (debentureUploadForm.period_from) formData.append('period_from', debentureUploadForm.period_from);
    if (debentureUploadForm.period_to) formData.append('period_to', debentureUploadForm.period_to);

    try {
      setUploading((prev) => ({ ...prev, debenture: true }));
      const response = await api.post('/payables/debenture/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Upload completed! ${response.data.created} records created.`);
      if (response.data.errors?.length > 0) {
        console.log('Upload errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} errors (see console)`);
      }
      setUploadFiles((prev) => ({ ...prev, debenture: null }));
    } catch (error) {
      // Surface detailed errors when available
      console.error('Debenture upload failed:', error);
      let errorMsg = 'Debenture upload failed';
      const resp = error.response?.data;
      if (resp) {
        // If backend included traceback/detail, log it and show a concise message
        if (resp.detail) {
          console.error('Upload detail:', resp.detail);
          errorMsg = typeof resp.detail === 'string' ? resp.detail : JSON.stringify(resp.detail);
        } else if (resp.error) {
          errorMsg = resp.error;
        } else if (typeof resp === 'string') {
          errorMsg = resp;
        } else if (typeof resp === 'object') {
          // Flatten object values
          try {
            errorMsg = Object.values(resp).flat().map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
          } catch (e) {
            errorMsg = JSON.stringify(resp);
          }
        }
      }
      // Show user-friendly toast and keep detailed info in console
      toast.error(errorMsg);
    } finally {
      setUploading((prev) => ({ ...prev, debenture: false }));
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
                          onChange={(e) => setUploadFiles((prev) => ({ ...prev, companies: e.target.files[0] || null }))}
                          disabled={uploading.companies}
                        />
                        {uploadFiles.companies?.name && (
                          <Form.Text className="text-muted">Selected: {uploadFiles.companies.name}</Form.Text>
                        )}
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          disabled={uploading.companies || !uploadFiles.companies}
                          onClick={() => handleUpload('companies', '/companies/upload/', uploadFiles.companies)}
                        >
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
                            <CustomSelect
                              options={[{ value: 'Public', label: 'Public' }, { value: 'Promoter', label: 'Promoter' }, { value: 'Institution', label: 'Institution' }]}
                              value={clientForm.holder_type}
                              onChange={(val) => setClientForm({ ...clientForm, holder_type: val })}
                              placeholder="Select Holder Type"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <CustomSelect
                              options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                              value={clientForm.status}
                              onChange={(val) => setClientForm({ ...clientForm, status: val })}
                              placeholder="Select Status"
                            />
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
                        <Form.Label>Company (optional)</Form.Label>
                        <CustomSelect
                          options={companies.map((c) => ({ value: c.company_code, label: `${c.company_code} - ${c.company_name}` }))}
                          value={selectedUploadCompany}
                          onChange={(val) => setSelectedUploadCompany(val)}
                          placeholder="-- Select company (optional) --"
                          isSearchable
                          isClearable
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Upload Clients File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => setUploadFiles((prev) => ({ ...prev, clients: e.target.files[0] || null }))}
                          disabled={uploading.clients}
                        />
                        {uploadFiles.clients?.name && (
                          <Form.Text className="text-muted">Selected: {uploadFiles.clients.name}</Form.Text>
                        )}
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          disabled={uploading.clients || !uploadFiles.clients}
                          onClick={() => handleUpload('clients', '/clients/upload/', uploadFiles.clients)}
                        >
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
                            <CustomSelect
                              options={roles.map((role) => ({ value: role.role_id, label: role.role_name }))}
                              value={userForm.role_id}
                              onChange={(val) => setUserForm({ ...userForm, role_id: val })}
                              placeholder="Select role"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <CustomSelect
                              options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                              value={userForm.status}
                              onChange={(val) => setUserForm({ ...userForm, status: val })}
                              placeholder="Select Status"
                            />
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

          <Tab eventKey="iaf" title="IAF File Conversion">
            <Row className="g-4">
              <Col xs={12}>
                <Card className="h-100 chart-card-modern">
                  <Card.Header>IAF Allocations</Card.Header>
                  <Card.Body>
                    <IAFAllocations />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="payables" title="Payables">
            <Row className="g-4">
              {canCreateDividend && (
                <Col md={6} lg={4}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Dividend Payables Upload (Stock)</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Company *</Form.Label>
                        <CustomSelect
                          options={companies.map((c) => ({ value: c.company_code, label: `${c.company_code} - ${c.company_name}` }))}
                          value={selectedUploadDividendCompany}
                          onChange={(val) => setSelectedUploadDividendCompany(val)}
                          placeholder="-- Select Company --"
                          isSearchable
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Dividend Payables File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={(e) => setUploadFiles((prev) => ({ ...prev, dividend: e.target.files[0] || null }))}
                          disabled={uploading.dividend || !selectedUploadDividendCompany}
                        />
                        {uploadFiles.dividend?.name && (
                          <Form.Text className="text-muted">Selected: {uploadFiles.dividend.name}</Form.Text>
                        )}
                        <Form.Text className="text-muted">
                          Required columns: shares_held, gross_dividend, tax_amount. Each row must include either <code>client_code</code> or <code>boid</code>. Optional: fiscal_year, payment_status
                        </Form.Text>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Physical Year (optional)</Form.Label>
                        <Form.Control
                          placeholder="e.g., 2024"
                          value={selectedDividendPhysicalYear}
                          onChange={(e) => setSelectedDividendPhysicalYear(e.target.value)}
                        />
                        <Form.Text className="text-muted">Optional: set a physical year to apply to all uploaded rows that don't include a year.</Form.Text>
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          disabled={uploading.dividend || !uploadFiles.dividend || !selectedUploadDividendCompany}
                          onClick={() => handleUpload('dividend', '/payables/dividend/upload/', uploadFiles.dividend)}
                        >
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

              {/* Debenture Data Upload - for Interest Reconciliation */}
              {canCreateInterest && (
                <Col md={6} lg={4}>
                  <Card className="h-100 chart-card-modern">
                    <Card.Header>Debenture Data Upload (Interest Reconciliation)</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Company *</Form.Label>
                        <CustomSelect
                          options={companies.map((c) => ({ value: c.company_code, label: `${c.company_code} - ${c.company_name}` }))}
                          value={debentureUploadForm.company_code}
                          onChange={(val) => setDebentureUploadForm(f => ({...f, company_code: val}))}
                          placeholder="-- Select Company --"
                          isSearchable
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Upload Debenture Data File</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setUploadFiles((prev) => ({ ...prev, debenture: e.target.files[0] || null }))}
                          disabled={uploading.debenture || !debentureUploadForm.company_code}
                        />
                        {uploadFiles.debenture?.name && (
                          <Form.Text className="text-muted">Selected: {uploadFiles.debenture.name}</Form.Text>
                        )}
                        <Form.Text className="text-muted">
                          Upload the Excel file with <strong>BOID, NAME, KITTA, BANK, ACCOUNT</strong> columns. Interest is auto-calculated. 
                          Supports both ORIGINAL and PUBLIC sheet formats.
                        </Form.Text>
                      </Form.Group>
                      <Row className="g-2 mb-3">
                        <Col md={6}>
                          <Form.Label>Interest Rate %</Form.Label>
                          <Form.Control
                            type="number" step="0.01"
                            value={debentureUploadForm.interest_rate}
                            onChange={(e) => setDebentureUploadForm(f => ({...f, interest_rate: e.target.value}))}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Tax Rate %</Form.Label>
                          <Form.Control
                            type="number" step="0.01"
                            value={debentureUploadForm.tax_rate}
                            onChange={(e) => setDebentureUploadForm(f => ({...f, tax_rate: e.target.value}))}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Period From</Form.Label>
                          <AppDatePicker
                            selected={debentureUploadForm.period_from ? new Date(debentureUploadForm.period_from) : null}
                            onChange={(d) => setDebentureUploadForm(f => ({...f, period_from: d ? format(d, 'yyyy-MM-dd') : ''}))}
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                            placeholderText="From date"
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Period To</Form.Label>
                          <AppDatePicker
                            selected={debentureUploadForm.period_to ? new Date(debentureUploadForm.period_to) : null}
                            onChange={(d) => setDebentureUploadForm(f => ({...f, period_to: d ? format(d, 'yyyy-MM-dd') : ''}))}
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                            placeholderText="To date"
                          />
                        </Col>
                      </Row>
                      <Button
                        variant="primary"
                        disabled={
                          uploading.debenture || 
                          !uploadFiles.debenture || 
                          !debentureUploadForm.company_code ||
                          !debentureUploadForm.period_from ||
                          !debentureUploadForm.period_to
                        }
                        onClick={handleDebentureUpload}
                      >
                        {uploading.debenture ? <div className="loading-spinner-modern loading-spinner-sm"></div> : <FaUpload />} Upload & Calculate
                      </Button>
                      <Form.Text className="text-muted d-block mt-2">
                        Data will appear in <strong>Debenture Interest</strong> page.
                      </Form.Text>
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
                          onChange={(e) => setUploadFiles((prev) => ({ ...prev, reconciliation: e.target.files[0] || null }))}
                          disabled={uploading.reconciliation}
                        />
                        {uploadFiles.reconciliation?.name && (
                          <Form.Text className="text-muted">Selected: {uploadFiles.reconciliation.name}</Form.Text>
                        )}
                        <Form.Text className="text-muted">
                          Required columns: txn_date, reference_no, description, debit, credit, balance
                        </Form.Text>
                      </Form.Group>
                      <Row className="g-2 mb-3">
                        <Col md={6}>
                          <Form.Label>Bank Name</Form.Label>
                          <Form.Control
                            value={reconForm.bank_name}
                            onChange={(e) => setReconForm({ ...reconForm, bank_name: e.target.value })}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Account No</Form.Label>
                          <Form.Control
                            value={reconForm.account_no}
                            onChange={(e) => setReconForm({ ...reconForm, account_no: e.target.value })}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Statement From</Form.Label>
                          <AppDatePicker
                            selected={reconForm.statement_from ? parseISO(reconForm.statement_from) : null}
                            onChange={(d) => setReconForm({ ...reconForm, statement_from: d ? format(d, 'yyyy-MM-dd') : '' })}
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                            isClearable
                            placeholderText="Statement From"
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Statement To</Form.Label>
                          <AppDatePicker
                            selected={reconForm.statement_to ? parseISO(reconForm.statement_to) : null}
                            onChange={(d) => setReconForm({ ...reconForm, statement_to: d ? format(d, 'yyyy-MM-dd') : '' })}
                            className="form-control"
                            dateFormat="yyyy-MM-dd"
                            isClearable
                            placeholderText="Statement To"
                          />
                        </Col>
                      </Row>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          disabled={
                            uploading.reconciliation ||
                            !uploadFiles.reconciliation ||
                            !reconForm.bank_name ||
                            !reconForm.account_no ||
                            !reconForm.statement_from ||
                            !reconForm.statement_to
                          }
                          onClick={handleReconciliationUpload}
                        >
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
                            onChange={(e) => setUploadFiles((prev) => ({ ...prev, fiscalYears: e.target.files[0] || null }))}
                            disabled={uploading.fiscalYears}
                          />
                          {uploadFiles.fiscalYears?.name && (
                            <Form.Text className="text-muted">Selected: {uploadFiles.fiscalYears.name}</Form.Text>
                          )}
                          <Form.Text className="text-muted">
                            Required columns: Company Name, Fiscal Year, Interest Rate %, Tax Rate %
                          </Form.Text>
                        </Form.Group>
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            disabled={uploading.fiscalYears || !uploadFiles.fiscalYears}
                            onClick={() => handleFiscalUpload(uploadFiles.fiscalYears)}
                          >
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

        <Modal show={showFiscalModal} onHide={() => setShowFiscalModal(false)} enforceFocus={false}>
          <Modal.Header closeButton>
            <Modal.Title>{editingFiscal ? 'Edit' : 'Add'} Fiscal Year Setting</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Company *</Form.Label>
                <CustomSelect
                  isDisabled={editingFiscal}
                  options={companies.map((c) => ({ value: c.company_id, label: c.company_name }))}
                  value={fiscalForm.company}
                  onChange={(val) => setFiscalForm({ ...fiscalForm, company: val })}
                  placeholder={'Select Company'}
                  isSearchable
                />
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

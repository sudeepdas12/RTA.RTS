/**
 * Companies Management Page - Phase 2 Optimized
 * 
 * Uses React Query hooks and DataTable for efficient data handling
 */

import { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaBuilding } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useQueryClient } from 'react-query';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../components/NavigationBar';
import DataTable from '../components/DataTable';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import { useCompanies } from '../hooks/useQueries';

interface Company {
  company_id?: number;
  id?: number;
  company_code: string;
  company_name: string;
  sector_type: 'Private' | 'Public' | 'Tax-Exempted';
  interest_tax_status?: string;
  pan_no?: string;
  bank_name?: string;
  bank_account_no?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

const DEFAULT_PAGE_SIZE = 50;

export function CompaniesManagement() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company>({
    company_code: '',
    company_name: '',
    sector_type: 'Private',
    pan_no: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active',
  });

  const queryClient = useQueryClient();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // For companies, we'll fetch all at once since it's typically a smaller dataset
  const { data: companiesData, isLoading: isLoadingCompanies, isError: isErrorCompanies } = useCompanies();

  // Filter and paginate locally (companies is usually small)
  const allCompanies = Array.isArray(companiesData) ? companiesData : [];
  
  const filteredCompanies = allCompanies.filter(company => {
    const matchesSearch = searchTerm === '' || 
      company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = sectorFilter === 'All' || company.sector_type === sectorFilter;
    
    return matchesSearch && matchesSector;
  });

  const totalCount = filteredCompanies.length;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const companies = filteredCompanies.slice(startIdx, endIdx);

  // ============================================================================
  // COLUMN DEFINITIONS
  // ============================================================================

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'company_code',
      header: 'Code',
      size: 100,
      cell: (info) => <strong>{info.getValue()}</strong>,
    },
    {
      accessorKey: 'company_name',
      header: 'Company Name',
      size: 250,
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'sector_type',
      header: 'Sector Type',
      size: 150,
      cell: (info) => {
        const sector = info.getValue() as string;
        const variantMap: Record<string, string> = {
          'Private': 'primary',
          'Public': 'info',
          'Tax-Exempted': 'warning',
        };
        return (
          <Badge bg={variantMap[sector] || 'secondary'}>
            {sector}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'pan_no',
      header: 'PAN',
      size: 150,
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'bank_name',
      header: 'Bank',
      size: 150,
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'bank_account_no',
      header: 'Account No.',
      size: 150,
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <Badge bg={status === 'Active' ? 'success' : 'danger'}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 150,
      cell: (info) => (
        <div className="btn-group btn-group-sm">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleShowModal(info.row.original)}
            title="Edit"
          >
            <FaEdit />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDelete(info.row.original.company_id || info.row.original.id || 0)}
            title="Delete"
          >
            <FaTrash />
          </Button>
        </div>
      ),
    },
  ];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleSectorChange = (value: string | null) => {
    setSectorFilter(value || 'All');
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const handlePaginationChange = (state: any) => {
    setPage(state.pageIndex + 1);
    setPageSize(state.pageSize);
  };

  const handleShowModal = (company: Company | null = null) => {
    if (company) {
      setCurrentCompany(company);
      setEditMode(true);
    } else {
      setCurrentCompany({
        company_code: '',
        company_name: '',
        sector_type: 'Private',
        pan_no: '',
        bank_name: '',
        bank_account_no: '',
        status: 'Active',
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
      if (!currentCompany.company_code || String(currentCompany.company_code).trim() === '') {
        toast.error('Company code is required');
        return;
      }
      if (!currentCompany.company_name || String(currentCompany.company_name).trim() === '') {
        toast.error('Company name is required');
        return;
      }

      const payload = {
        company_code: currentCompany.company_code,
        company_name: currentCompany.company_name,
        sector_type: currentCompany.sector_type,
        pan_no: currentCompany.pan_no || null,
        bank_name: currentCompany.bank_name || null,
        bank_account_no: currentCompany.bank_account_no || null,
        status: currentCompany.status || 'Active',
      };

      if (editMode && currentCompany.company_id) {
        await api.put(`/companies/${currentCompany.company_id}/`, payload);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies/', payload);
        toast.success('Company created successfully');
      }

      // Invalidate React Query cache
      queryClient.invalidateQueries('companies');
      handleCloseModal();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save company';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      await api.delete(`/companies/${id}/`);
      toast.success('Company deleted successfully');
      queryClient.invalidateQueries('companies');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to delete company';
      toast.error(msg);
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
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingCompanies) {
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

  if (isErrorCompanies) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>Error Loading Companies</Alert.Heading>
              <p className="mb-0">Failed to load companies. Please try again.</p>
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
          {/* Header */}
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header">
                <FaBuilding style={{ marginRight: '0.5rem' }} /> Companies Management
              </h2>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-4">
            <Col md={4} className="mb-2">
              <Form.Control
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </Col>
            <Col md={3} className="mb-2">
              <Form.Select
                value={sectorFilter}
                onChange={(e) => handleSectorChange(e.target.value)}
              >
                <option value="All">All Sectors</option>
                <option value="Private">Private</option>
                <option value="Public">Public</option>
                <option value="Tax-Exempted">Tax-Exempted</option>
              </Form.Select>
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
              <Button variant="outline-secondary" className="me-2" onClick={handleExport}>
                <FaDownload /> Export
              </Button>
              <Button variant="success" onClick={() => handleShowModal()}>
                + New Company
              </Button>
            </Col>
          </Row>

          {/* Data Table */}
          <Card className="chart-card-modern">
            <Card.Header>
              <FaBuilding style={{ marginRight: '0.5rem' }} /> Companies ({totalCount} total)
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable
                data={companies}
                columns={columns}
                totalRows={totalCount}
                onPaginationChange={handlePaginationChange}
                pageSize={pageSize}
                enableRowSelection={false}
                showColumnToggle={true}
                isLoading={isLoadingCompanies}
                emptyMessage="No companies found"
              />
            </Card.Body>
          </Card>

          {/* Stats Footer */}
          <div className="mt-4 p-3 bg-light rounded">
            <Row>
              <Col>
                <small className="text-muted">Total Companies:</small>
                <p className="mb-0">
                  <strong>{totalCount.toLocaleString()}</strong>
                </p>
              </Col>
              <Col>
                <small className="text-muted">Current Page:</small>
                <p className="mb-0">
                  <strong>{page}</strong>
                </p>
              </Col>
              <Col>
                <small className="text-muted">Page Size:</small>
                <p className="mb-0">
                  <strong>{pageSize}</strong>
                </p>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Company' : 'Create New Company'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Company Code *</Form.Label>
              <Form.Control
                type="text"
                value={currentCompany.company_code}
                onChange={(e) => setCurrentCompany({ ...currentCompany, company_code: e.target.value })}
                placeholder="Enter company code"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Company Name *</Form.Label>
              <Form.Control
                type="text"
                value={currentCompany.company_name}
                onChange={(e) => setCurrentCompany({ ...currentCompany, company_name: e.target.value })}
                placeholder="Enter company name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Sector Type</Form.Label>
              <Form.Select
                value={currentCompany.sector_type}
                onChange={(e) => setCurrentCompany({ ...currentCompany, sector_type: e.target.value as any })}
              >
                <option value="Private">Private</option>
                <option value="Public">Public</option>
                <option value="Tax-Exempted">Tax-Exempted</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={currentCompany.status}
                onChange={(e) => setCurrentCompany({ ...currentCompany, status: e.target.value as any })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>PAN No.</Form.Label>
              <Form.Control
                type="text"
                value={currentCompany.pan_no || ''}
                onChange={(e) => setCurrentCompany({ ...currentCompany, pan_no: e.target.value })}
                placeholder="Enter PAN number"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Bank Name</Form.Label>
              <Form.Control
                type="text"
                value={currentCompany.bank_name || ''}
                onChange={(e) => setCurrentCompany({ ...currentCompany, bank_name: e.target.value })}
                placeholder="Enter bank name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Bank Account No.</Form.Label>
              <Form.Control
                type="text"
                value={currentCompany.bank_account_no || ''}
                onChange={(e) => setCurrentCompany({ ...currentCompany, bank_account_no: e.target.value })}
                placeholder="Enter bank account number"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CompaniesManagement;

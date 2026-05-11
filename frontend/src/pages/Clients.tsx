/**
 * Clients Management Page - Phase 2 Optimized
 * 
 * Uses:
 * - React Query for server state management & caching
 * - DataTable for advanced table features
 * - VirtualList for efficient rendering of large datasets
 */

import { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Badge, Alert, Dropdown } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaUsers, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useQueryClient } from 'react-query';
import type { ColumnDef } from '@tanstack/react-table';

import NavigationBar from '../components/NavigationBar';
import DataTable from '../components/DataTable';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import { useClients, useCompanies } from '../hooks/useQueries';

// Type definitions
interface Client {
  client_id?: number;
  id?: number;
  client_code: string;
  boid: string;
  client_name?: string;
  full_name?: string;
  company?: number |string;
  company_name?: string;
  company_detail?: { company_name: string };
  holder_type: 'Public' | 'Promoter' | 'Institution' | 'Tax-Exempted';
  pan_or_citizenship?: string;
  bank_name?: string;
  bank_account_no?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

const DEFAULT_PAGE_SIZE = 50;

export function ClientsManagement() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [holderTypeFilter, setHolderTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client>({
    client_code: '',
    full_name: '',
    boid: '',
    company: '',
    holder_type: 'Public',
    pan_or_citizenship: '',
    bank_name: '',
    bank_account_no: '',
    status: 'Active',
  });

  const queryClient = useQueryClient();

  // ============================================================================
  // DATA FETCHING - React Query hooks
  // ============================================================================

  // Build filters object
  const filters = {
    search: searchTerm || undefined,
    holder_type: holderTypeFilter !== 'All' ? holderTypeFilter : undefined,
  };

  // Fetch clients with React Query (auto-caching, auto-refresh)
  const { data: clientsData, isLoading: isLoadingClients, isError: isErrorClients } = useClients(page, pageSize, searchTerm);

  // Fetch companies
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();

  const clients = clientsData?.results || [];
  const totalCount = clientsData?.count || 0;
  const companies = Array.isArray(companiesData) ? companiesData : [];

  // ============================================================================
  // COLUMN DEFINITIONS - Type-safe table columns
  // ============================================================================

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'client_code',
      header: 'Code',
      size: 100,
      cell: (info) => <strong>{info.getValue()}</strong>,
    },
    {
      accessorKey: 'boid',
      header: 'BOID',
      size: 120,
      cell: (info) => info.getValue() || '—',
    },
    {
      accessorKey: 'full_name',
      header: 'Client Name',
      size: 200,
      cell: (info) => info.getValue() as string || info.row.original.client_name || '—',
    },
    {
      accessorKey: 'company_name',
      header: 'Company',
      size: 150,
      cell: (info) => {
        const companyName = info.getValue() as string;
        return companyName || info.row.original.company_detail?.company_name || '—';
      },
    },
    {
      accessorKey: 'holder_type',
      header: 'Type',
      size: 120,
      cell: (info) => {
        const type = info.getValue() as string;
        const variantMap: Record<string, string> = {
          'Public': 'info',
          'Promoter': 'primary',
          'Institution': 'success',
          'Tax-Exempted': 'warning',
        };
        return (
          <Badge bg={variantMap[type] || 'secondary'}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'pan_or_citizenship',
      header: 'PAN/Citizenship',
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
            onClick={() => handleDelete(info.row.original.client_id || info.row.original.id || 0)}
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
    setPage(1); // Reset to page 1 when searching
  };

  const handleFilterTypeChange = (value: string | null) => {
    setHolderTypeFilter(value || 'All');
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

  const handleShowModal = (client: Client | null = null) => {
    if (client) {
      setCurrentClient(client);
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
      if (!currentClient.boid || String(currentClient.boid).trim() === '') {
        toast.error('BOID is required');
        return;
      }

      const payload = {
        client_code: currentClient.client_code,
        full_name: currentClient.full_name || currentClient.client_name,
        boid: currentClient.boid,
        company: currentClient.company || null,
        holder_type: currentClient.holder_type,
        pan_or_citizenship: currentClient.pan_or_citizenship || null,
        bank_name: currentClient.bank_name || null,
        bank_account_no: currentClient.bank_account_no || null,
        status: currentClient.status || 'Active',
      };

      if (editMode && currentClient.client_id) {
        await api.put(`/clients/${currentClient.client_id}/`, payload);
        toast.success('Client updated successfully');
      } else {
        await api.post('/clients/', payload);
        toast.success('Client created successfully');
      }

      // Invalidate React Query cache to fetch fresh data
      queryClient.invalidateQueries('clients');
      handleCloseModal();
    } catch (error: any) {
      const msg = error.response?.data?.boid || error.response?.data?.message || 'Failed to save client';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await api.delete(`/clients/${id}/`);
      toast.success('Client deleted successfully');
      // Invalidate cache
      queryClient.invalidateQueries('clients');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete client');
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
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingClients) {
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

  if (isErrorClients) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>Error Loading Clients</Alert.Heading>
              <p className="mb-0">Failed to load clients. Please try again.</p>
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
                <FaUsers style={{ marginRight: '0.5rem' }} /> Clients Management
              </h2>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-4">
            <Col md={4} className="mb-2">
              <Form.Control
                type="text"
                placeholder="Search by name, code, BOID..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </Col>
            <Col md={3} className="mb-2">
              <Dropdown onSelect={handleFilterTypeChange}>
                <Dropdown.Toggle
                  variant="outline-primary"
                  id="type-filter-dropdown"
                  className="w-100 d-flex justify-content-between align-items-center"
                >
                  {holderTypeFilter === 'All' ? 'All Types' : holderTypeFilter}
                  <FaChevronRight style={{ fontSize: '12px' }} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100">
                  {['All', 'Public', 'Promoter', 'Institution', 'Tax-Exempted'].map((type) => (
                    <Dropdown.Item
                      key={type}
                      eventKey={type}
                      active={holderTypeFilter === type}
                    >
                      {type}
                    </Dropdown.Item>
                  ))}
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
              <Button variant="success" className="ms-2" onClick={() => handleShowModal()}>
                + New Client
              </Button>
            </Col>
          </Row>

          {/* Data Table */}
          <Card className="chart-card-modern">
            <Card.Header>
              <FaUsers style={{ marginRight: '0.5rem' }} /> Clients ({totalCount} total)
            </Card.Header>
            <Card.Body className="p-0">
              <DataTable<Client>
                data={clients}
                columns={columns}
                totalRows={totalCount}
                onPaginationChange={handlePaginationChange}
                pageSize={pageSize}
                enableRowSelection={true}
                showColumnToggle={true}
                isLoading={isLoadingClients}
                emptyMessage="No clients found"
              />
            </Card.Body>
          </Card>

          {/* Stats Footer */}
          <div className="mt-4 p-3 bg-light rounded">
            <Row>
              <Col>
                <small className="text-muted">Total Clients:</small>
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
              <Col>
                <small className="text-muted">Data Auto-Cached:</small>
                <p className="mb-0">
                  <strong>5 minutes</strong>
                </p>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Client' : 'Create New Client'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>BOID *</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.boid}
                onChange={(e) => setCurrentClient({ ...currentClient, boid: e.target.value })}
                placeholder="Enter BOID"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Client Code</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.client_code}
                onChange={(e) => setCurrentClient({ ...currentClient, client_code: e.target.value })}
                placeholder="Enter client code"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Client Name</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.full_name || currentClient.client_name || ''}
                onChange={(e) => setCurrentClient({ ...currentClient, full_name: e.target.value })}
                placeholder="Enter client name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Company</Form.Label>
              <Form.Select
                value={currentClient.company || ''}
                onChange={(e) => setCurrentClient({ ...currentClient, company: e.target.value })}
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Holder Type</Form.Label>
              <Form.Select
                value={currentClient.holder_type}
                onChange={(e) => setCurrentClient({ ...currentClient, holder_type: e.target.value as any })}
              >
                <option value="Public">Public</option>
                <option value="Promoter">Promoter</option>
                <option value="Institution">Institution</option>
                <option value="Tax-Exempted">Tax-Exempted</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={currentClient.status}
                onChange={(e) => setCurrentClient({ ...currentClient, status: e.target.value as any })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>PAN/Citizenship</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.pan_or_citizenship || ''}
                onChange={(e) => setCurrentClient({ ...currentClient, pan_or_citizenship: e.target.value })}
                placeholder="Enter PAN or citizenship number"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Bank Name</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.bank_name || ''}
                onChange={(e) => setCurrentClient({ ...currentClient, bank_name: e.target.value })}
                placeholder="Enter bank name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Bank Account No.</Form.Label>
              <Form.Control
                type="text"
                value={currentClient.bank_account_no || ''}
                onChange={(e) => setCurrentClient({ ...currentClient, bank_account_no: e.target.value })}
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

export default ClientsManagement;

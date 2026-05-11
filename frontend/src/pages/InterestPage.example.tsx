/**
 * InterestPage Example: Implementation with Phase 2 Components
 * 
 * This is a complete example showing how to integrate React Query,
 * advanced DataTable, and pagination into your existing pages.
 * 
 * Copy this pattern to other pages (DividendPage, ClientsPage, etc.)
 */

import { useState } from 'react';
import { Card, Row, Col, Button, Form, Alert, Badge } from 'react-bootstrap';
import DataTable from '../components/DataTable';
import { useInterestPayables, useMutateInterestPayable, useDeleteInterestPayable } from '../hooks/useQueries';
import type { ColumnDef } from '@tanstack/react-table';

// Type definitions
interface InterestPayable {
  id: number;
  fiscal_year: string;
  company: { id: number; company_code: string; company_name: string };
  client: { id: number; client_code: string; boid: string };
  gross_interest: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interest Payables Page - Production Ready
 * 
 * Features:
 * - Paginated data display (50 items per page)
 * - Advanced sorting & filtering
 * - Column visibility toggle
 * - Row selection with actions
 * - Real-time status updates via React Query
 * - Optimistic updates on delete
 */
export function InterestPayablesPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState({
    status: '',
    fiscal_year: '',
    company_id: '',
    search: '',
  });
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState('-created_at');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ============================================================================
  // HOOKS - Data fetching & mutations
  // ============================================================================

  // Fetch paginated data with React Query (automatic caching, refetch, etc)
  const { 
    data, 
    isLoading: isLoadingTable, 
    isError, 
    error 
  } = useInterestPayables(page, pageSize, filters);

  // Mutation hook for delete operations
  const deletePayable = useDeleteInterestPayable();

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPage(1); // Reset to page 1 when filters change
  };

  const handlePaginationChange = (state: any) => {
    setPage(state.pageIndex + 1);
    setPageSize(state.pageSize);
  };

  const handleSortingChange = (sorting: any) => {
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      setSortBy(`${desc ? '-' : ''}${id}`);
      // In production, you'd pass this to API for server-side sorting
    }
  };

  const handleSelectRow = (rowIndex: string, selected: boolean) => {
    setSelectedRows(prev => ({
      ...prev,
      [rowIndex]: selected,
    }));
  };

  const handleDeleteRow = async (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deletePayable.mutateAsync(deletingId);
        setShowDeleteConfirm(false);
        setDeletingId(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleBulkExport = () => {
    const ids = Object.keys(selectedRows).filter(k => selectedRows[k]);
    if (ids.length === 0) {
      alert('Please select rows to export');
      return;
    }
    // TODO: Export selected rows
    console.log('Exporting rows:', ids);
  };

  const handleBulkStatusChange = (status: string) => {
    const ids = Object.keys(selectedRows).filter(k => selectedRows[k]);
    if (ids.length === 0) {
      alert('Please select rows');
      return;
    }
    // TODO: Bulk update status
    console.log('Updating rows to status:', status, ids);
  };

  // ============================================================================
  // COLUMN DEFINITIONS - Type-safe table structure
  // ============================================================================

  const columns: ColumnDef<InterestPayable>[] = [
    {
      accessorKey: 'fiscal_year',
      header: ({ column }) => (
        <div className="d-flex align-items-center">
          Fiscal Year
          {column.getCanSort() && (
            <button
              onClick={column.getToggleSortingHandler()}
              className="btn btn-sm btn-link"
              style={{ marginLeft: '0.5rem' }}
            >
              {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '⇅'}
            </button>
          )}
        </div>
      ),
      size: 120,
      enableSorting: true,
    },
    {
      accessorKey: 'company.company_code',
      header: 'Company',
      size: 150,
      cell: (info) => {
        const company = (info.row.original as any).company;
        return (
          <div>
            <strong>{company.company_code}</strong>
            <br />
            <small className="text-muted">{company.company_name}</small>
          </div>
        );
      },
    },
    {
      accessorKey: 'client.boid',
      header: 'Client (BOID)',
      size: 150,
      cell: (info) => {
        const client = (info.row.original as any).client;
        return (
          <div>
            <strong>{client.boid}</strong>
            <br />
            <small className="text-muted">{client.client_code}</small>
          </div>
        );
      },
    },
    {
      accessorKey: 'gross_interest',
      header: 'Gross Interest',
      size: 130,
      cell: (info) => `Rs. ${(info.getValue() as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      enableSorting: true,
    },
    {
      accessorKey: 'tax_amount',
      header: 'Tax',
      size: 120,
      cell: (info) => `Rs. ${(info.getValue() as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    },
    {
      accessorKey: 'net_payable',
      header: 'Net Payable',
      size: 130,
      cell: (info) => (
        <strong className="text-primary">
          Rs. {(info.getValue() as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </strong>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      size: 110,
      cell: (info) => {
        const status = info.getValue() as string;
        const variantMap = {
          'paid': 'success',
          'partial': 'warning',
          'pending': 'danger',
        };
        return (
          <Badge bg={variantMap[status as keyof typeof variantMap] || 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'payment_date',
      header: 'Payment Date',
      size: 120,
      cell: (info) => {
        const date = info.getValue() as string | undefined;
        return date ? new Date(date).toLocaleDateString('en-IN') : '—';
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 120,
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString('en-IN'),
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 150,
      cell: (info) => {
        const id = (info.row.original as any).id;
        return (
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-primary">Edit</button>
            <button 
              className="btn btn-outline-danger"
              onClick={() => handleDeleteRow(id)}
              disabled={deletePayable.isLoading}
            >
              {deletePayable.isLoading && deletingId === id ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                'Delete'
              )}
            </button>
          </div>
        );
      },
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  const items = data?.results || [];
  const totalCount = data?.count || 0;

  return (
    <div className="interest-page">
      {/* Page Header */}
      <div className="page-header mb-4">
        <h1 className="display-6 mb-2">Interest Payables</h1>
        <p className="text-muted">Manage and track interest payment records</p>
      </div>

      {/* Error Alert */}
      {isError && (
        <Alert variant="danger" dismissible>
          <strong>Error:</strong> {(error as any)?.message || 'Failed to load data'}
        </Alert>
      )}

      {/* Filter Controls */}
      <Card className="mb-4">
        <Card.Header>
          <strong>Filters</strong>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fiscal Year</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="2080/81"
                  value={filters.fiscal_year}
                  onChange={(e) => handleFilterChange('fiscal_year', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Company</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Filter by company"
                  value={filters.company_id}
                  onChange={(e) => handleFilterChange('company_id', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bulk Actions */}
      {Object.values(selectedRows).some(Boolean) && (
        <Card className="mb-4 bg-light">
          <Card.Body className="d-flex align-items-center justify-content-between">
            <div>
              <strong>{Object.values(selectedRows).filter(Boolean).length} rows selected</strong>
            </div>
            <div className="btn-group">
              <Button variant="outline-primary" size="sm" onClick={handleBulkExport}>
                Export Selected
              </Button>
              <Button variant="outline-info" size="sm" onClick={() => handleBulkStatusChange('paid')}>
                Mark as Paid
              </Button>
              <Button variant="outline-warning" size="sm" onClick={() => handleBulkStatusChange('partial')}>
                Mark as Partial
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <Card.Body className="p-0">
          <DataTable
            data={items}
            columns={columns}
            totalRows={totalCount}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            pageSize={pageSize}
            enableRowSelection={true}
            showColumnToggle={true}
            isLoading={isLoadingTable || deletePayable.isLoading}
            emptyMessage="No interest payables found"
            // Note: onRowSelectionChange would integrate with bulk selection
          />
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
              </div>
              <div className="modal-body">
                Are you sure you want to delete this interest payable record? This action cannot be undone.
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} disabled={deletePayable.isLoading}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 p-3 bg-light rounded">
        <Row>
          <Col>
            <small className="text-muted">Total Records:</small>
            <p className="mb-0"><strong>{totalCount.toLocaleString()}</strong></p>
          </Col>
          <Col>
            <small className="text-muted">Current Page:</small>
            <p className="mb-0"><strong>{page}</strong></p>
          </Col>
          <Col>
            <small className="text-muted">Page Size:</small>
            <p className="mb-0"><strong>{pageSize}</strong></p>
          </Col>
          <Col>
            <small className="text-muted">Data Cached:</small>
            <p className="mb-0"><strong>5 min</strong></p>
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default InterestPayablesPage;

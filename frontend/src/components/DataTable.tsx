/**
 * DataTable Component: Advanced table features using @tanstack/react-table@8
 * 
 * Features:
 * - Sorting (click column headers)
 * - Filtering (search across columns)
 * - Column visibility toggle
 * - Row selection with checkboxes
 * - Server-side pagination integration
 * - Responsive design with Bootstrap styling
 * 
 * Install: npm install @tanstack/react-table @tanstack/match-sorter-utils
 */

import React from 'react';
// Use a runtime require and loosen types to avoid build-time type mismatches
const rt: any = require('@tanstack/react-table');
const { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender } = rt;
type ColumnDef<T> = any;
type SortingState = any;
type ColumnFiltersState = any;
type VisibilityState = any;
type RowSelectionState = any;
type PaginationState = any;

export interface DataTableProps<T> {
  /** Array of data to render */
  data: T[];
  
  /** Column definitions */
  columns: ColumnDef<T>[];
  
  /** Total number of rows (for server-side pagination) */
  totalRows?: number;
  
  /** Called when pagination state changes */
  onPaginationChange?: (state: PaginationState) => void;
  
  /** Called when sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
  
  /** Called when filters change */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  
  /** Called when row selection changes */
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  
  /** Initial page size */
  pageSize?: number;
  
  /** Show column visibility toggle */
  showColumnToggle?: boolean;
  
  /** Show row checkboxes */
  enableRowSelection?: boolean;
  
  /** CSS class for table */
  className?: string;
  
  /** Loading indicator */
  isLoading?: boolean;
  
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Advanced Data Table Component
 * 
 * Example:
 * ```tsx
 * const columns: ColumnDef<InterestPayable>[] = [
 *   {
 *     accessorKey: 'fiscal_year',
 *     header: 'Fiscal Year',
 *   },
 *   {
 *     accessorKey: 'net_payable',
 *     header: 'Net Payable',
 *     cell: (info) => `Rs. ${info.getValue().toLocaleString()}`,
 *   },
 *   {
 *     accessorKey: 'payment_status',
 *     header: 'Status',
 *     cell: (info) => (
 *       <span className={`badge bg-${info.getValue() === 'paid' ? 'success' : 'warning'}`}>
 *         {info.getValue()}
 *       </span>
 *     ),
 *   },
 * ];
 * 
 * return (
 *   <DataTable
 *     data={interestPayables}
 *     columns={columns}
 *     totalRows={totalCount}
 *     onPaginationChange={handlePaginationChange}
 *     pageSize={50}
 *     enableRowSelection
 *   />
 * );
 * ```
 */
export const DataTable = React.forwardRef<
  any,
  DataTableProps<any>
>(
  ({
    data,
    columns,
    totalRows = data.length,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onRowSelectionChange,
    pageSize = 50,
    showColumnToggle = true,
    enableRowSelection = false,
    className = '',
    isLoading = false,
    emptyMessage = 'No data available',
  }, _ref) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [pagination, setPagination] = React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: pageSize,
    });
    const [globalFilter, setGlobalFilter] = React.useState('');

    // Notify parent of pagination changes
    React.useEffect(() => {
      onPaginationChange?.(pagination);
    }, [pagination]);

    // Notify parent of sorting changes
    React.useEffect(() => {
      onSortingChange?.(sorting);
    }, [sorting]);

    // Notify parent of filter changes
    React.useEffect(() => {
      onColumnFiltersChange?.(columnFilters);
    }, [columnFilters]);

    // Notify parent of row selection changes
    React.useEffect(() => {
      onRowSelectionChange?.(rowSelection);
    }, [rowSelection]);

    const table = useReactTable({
      data,
      columns,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        pagination,
        globalFilter,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      onPaginationChange: setPagination,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      enableRowSelection: enableRowSelection,
    });

    return (
      <div className={`data-table-wrapper ${className}`}>
        {/* Controls Bar */}
        <div className="table-controls mb-3 d-flex justify-content-between align-items-center">
          {/* Global Search */}
          <div className="search-box">
            <input
              type="text"
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="form-control form-control-sm"
              style={{ width: '250px' }}
            />
          </div>

          {/* Column Visibility Toggle */}
          {showColumnToggle && (
            <div className="column-toggle dropdown">
              <button
                className="btn btn-sm btn-outline-secondary dropdown-toggle"
                type="button"
                id="columnDropdown"
                data-bs-toggle="dropdown"
              >
                Columns
              </button>
              <ul className="dropdown-menu" aria-labelledby="columnDropdown">
                {table.getAllLeafColumns().map((column: any) => (
                  <li key={column.id} className="dropdown-item">
                    <label className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                      <span className="form-check-label">{column.columnDef.header as string}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-light">
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id}>
                  {enableRowSelection && (
                    <th className="text-center" style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="form-check-input"
                        ref={(el) => {
                          if (el) el.indeterminate = table.getIsSomeRowsSelected();
                        }}
                      />
                    </th>
                  )}
                  {headerGroup.headers.map((header: any) => (
                    <th
                      key={header.id}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                      className="table-header"
                    >
                      <div className="d-flex align-items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="sort-indicator">
                            {header.column.getIsSorted() === 'asc' && '↑'}
                            {header.column.getIsSorted() === 'desc' && '↓'}
                            {!header.column.getIsSorted() && '⇅'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="text-center py-4 text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row: any) => (
                  <tr key={row.id} className={row.getIsSelected() ? 'table-active' : ''}>
                    {enableRowSelection && (
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          className="form-check-input"
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="table-footer d-flex justify-content-between align-items-center mt-3">
          <div className="page-info text-muted small">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              totalRows
            )}{' '}
            of {totalRows} rows
          </div>

          <div className="pagination-controls">
            <nav aria-label="Table pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${!table.getCanPreviousPage() ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </button>
                </li>

                {Array.from({ length: table.getPageCount() }, (_, i) => i).map((page) => (
                  <li
                    key={page}
                    className={`page-item ${table.getState().pagination.pageIndex === page ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => table.setPageIndex(page)}
                    >
                      {page + 1}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${!table.getCanNextPage() ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="page-size-selector">
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
            >
              {[25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} rows
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Style */}
        <style>{`
          .table-header {
            background-color: #f8f9fa;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
          }

          .sort-indicator {
            font-size: 0.8em;
            color: #999;
            margin-left: 0.25rem;
          }

          .data-table-wrapper {
            padding: 1rem;
            background: white;
            border-radius: 0.375rem;
          }

          .table-responsive {
            overflow-x: auto;
          }

          .table-controls {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .table-footer {
            flex-wrap: wrap;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
          }

          @media (max-width: 768px) {
            .table-footer {
              flex-direction: column;
              align-items: stretch;
            }

            .pagination-controls {
              width: 100%;
            }

            .page-size-selector {
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

export default DataTable;

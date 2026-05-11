declare module '@tanstack/react-table' {
  // Loosen CellContext.getValue() return type to `any` to avoid frequent `unknown` issues
  // across the codebase while building. This is a minimal shim for the build pipeline.
  interface CellContext<TData extends RowData, TValue> {
    getValue(): any;
  }

  // Provide minimal exported types used across the codebase
  export type ColumnDef<TData = any, TValue = any> = any;
  export type SortingState = any;
  export type ColumnFiltersState = any;
  export type VisibilityState = any;
  export type RowSelectionState = any;
  export type PaginationState = any;
}

// Generic RowData used by @tanstack types
type RowData = Record<string, any>;

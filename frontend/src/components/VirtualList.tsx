/**
 * VirtualList Component: Simplified implementation
 * For future optimization, this can be upgraded to use react-window
 */

import React, { CSSProperties } from 'react';

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  
  /** Height of the entire list container in pixels */
  height: number;
  
  /** Width of list container (default: 100%) */
  width?: string | number;
  
  /** Height of each row in pixels */
  rowHeight: number;
  
  /** Number of rows to render outside visible area for buffer */
  overscanCount?: number;
  
  /** Render function for each row */
  itemRenderer: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  
  /** Key extractor for list items */
  keyExtractor?: (item: T, index: number) => string | number;
  
  /** Total item count */
  totalCount?: number;
  
  /** Callback when reaching end of list */
  onLoadMore?: (startIndex: number, stopIndex: number) => Promise<void>;
  
  /** Show loading indicator */
  isLoading?: boolean;
  
  /** CSS class */
  className?: string;
  
  /** Custom style */
  style?: React.CSSProperties;
}

/**
 * Simple Virtual List wrapper
 * Renders all items (suitable for moderate dataset sizes)
 * For very large datasets (1000+), upgrade to react-window implementation
 */
export const VirtualList = React.forwardRef<HTMLDivElement, VirtualListProps<any>>(
  ({
    items,
    height,
    width = '100%',
    rowHeight = 48,
    itemRenderer,
    keyExtractor = (_, index) => index,
    isLoading = false,
    className = '',
    style = {},
  }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          height,
          width,
          overflowY: 'auto',
          overflowX: 'hidden',
          ...style,
        }}
        className={className}
      >
        {items.length === 0 && !isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No items to display
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              height: rowHeight,
              lineHeight: `${rowHeight}px`,
              overflow: 'hidden',
            }}
          >
            {itemRenderer(item, index, {
              height: rowHeight,
              top: index * rowHeight,
            } as CSSProperties)}
          </div>
        ))}
        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Loading more items...
          </div>
        )}
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';

export default VirtualList;

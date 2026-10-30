import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { ArrowUpDown, Boxes, ChevronLeft, ChevronRight, Hourglass } from 'lucide-react';
import type { InventoryItem } from '../types/inventory.types';

interface Props {
  items: InventoryItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewBatches: (item: InventoryItem) => void;
}

type SortField = 'sku' | 'productName' | 'onHand' | 'available' | 'totalValue' | 'status';
type SortDirection = 'asc' | 'desc';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const statusBadge = (status: InventoryItem['status']) => {
  if (status === 'Out') return { label: 'Hết hàng', bg: '#fce8e6', color: '#c5221f' };
  if (status === 'Low') return { label: 'Sắp hết', bg: '#feefc3', color: '#b06000' };
  return { label: 'Đủ hàng', bg: '#e6f4ea', color: '#137333' };
};

const COL_WIDTHS: CSSProperties[] = [
  { width: '3%' },
  { width: '9%' },
  { width: '13%' },
  { width: '6%' },
  { width: '8%' },
  { width: '5%' },
  { width: '7%' },
  { width: '8%' },
  { width: '8%' },
  { width: '7%' },
  { width: '6%' },
  { width: '6%' },
  { width: '6%' },
  { width: '8%' },
];

const tableColGroup = (
  <colgroup>
    {COL_WIDTHS.map((style, i) => (
      <col key={i} style={style} />
    ))}
  </colgroup>
);

const thBaseStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '8px 4px',
  fontSize: 11,
  fontWeight: 700,
  color: '#334155',
  letterSpacing: '0.01em',
  whiteSpace: 'normal',
  lineHeight: 1.25,
  boxSizing: 'border-box',
};

const tdBase: CSSProperties = {
  padding: '8px 6px',
  fontSize: 12.5,
  borderBottom: '1px solid #f1f5f9',
  color: '#1e293b',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const InventoryTable: FC<Props> = ({
  items,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewBatches,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortField) {
        case 'sku':
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
          break;
        case 'productName':
          valA = a.productName.toLowerCase();
          valB = b.productName.toLowerCase();
          break;
        case 'onHand':
          valA = a.onHand;
          valB = b.onHand;
          break;
        case 'available':
          valA = a.available;
          valB = b.available;
          break;
        case 'totalValue':
          valA = a.totalValue;
          valB = b.totalValue;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDir]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [sortedItems, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const renderSortTh = (field: SortField, label: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th
      onClick={() => handleSort(field)}
      style={{
        ...thBaseStyle,
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          gap: 4,
        }}
      >
        <span>{label}</span>
        <ArrowUpDown size={12} color={sortField === field ? '#0f766e' : '#94a3b8'} />
      </div>
    </th>
  );

  const tableStyle: CSSProperties = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'separate',
    borderSpacing: 0,
    textAlign: 'left',
    fontSize: 12.5,
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
      }}
    >
      <div
        ref={headerRef}
        style={{
          width: '100%',
          overflowX: 'hidden',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          flexShrink: 0,
          boxSizing: 'border-box',
          paddingRight: hasScrollY ? 6 : 0,
        }}
      >
        <table style={tableStyle}>
          {tableColGroup}
          <thead>
            <tr>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>#</th>
              {renderSortTh('sku', 'SKU')}
              {renderSortTh('productName', 'Tên sản phẩm')}
              <th style={thBaseStyle}>Nhóm</th>
              <th style={thBaseStyle}>Chi nhánh</th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>ĐVT</th>
              {renderSortTh('onHand', 'OnHand', 'right')}
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Committed</th>
              {renderSortTh('available', 'Available', 'right')}
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>OnOrder</th>
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Giá vốn</th>
              {renderSortTh('totalValue', 'Giá trị', 'right')}
              {renderSortTh('status', 'Trạng thái', 'center')}
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <table style={tableStyle}>
          {tableColGroup}
          <tbody>
            {sortedItems.length > 0 ? (
              sortedItems.map((item, idx) => {
                const badge = statusBadge(item.status);
                const rowNo = startItem + idx;
                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <td style={{ ...tdBase, textAlign: 'center', color: '#64748b' }}>{rowNo}</td>
                    <td style={tdBase}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          color: '#0f766e',
                          backgroundColor: '#f0fdfa',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #ccfbf1',
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.sku}
                      </span>
                    </td>
                    <td
                      style={{ ...tdBase, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}
                      title={item.productName}
                    >
                      {item.productName}
                    </td>
                    <td style={tdBase}>{item.categoryLabel}</td>
                    <td style={tdBase}>{item.branchName}</td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>{item.unit}</td>
                    <td
                      style={{
                        ...tdBase,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: item.onHand === 0 ? '#dc2626' : '#0f172a',
                      }}
                    >
                      {fmt(item.onHand)}
                    </td>
                    <td
                      style={{
                        ...tdBase,
                        textAlign: 'right',
                        color: item.committed > 0 ? '#dc2626' : '#64748b',
                      }}
                    >
                      {fmt(item.committed)}
                    </td>
                    <td
                      style={{
                        ...tdBase,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: item.available <= item.reorderPoint ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {fmt(item.available)}
                    </td>
                    <td
                      style={{
                        ...tdBase,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: item.onOrder > 0 ? '#2563eb' : '#94a3b8',
                      }}
                    >
                      {fmt(item.onOrder)}
                    </td>
                    <td style={{ ...tdBase, textAlign: 'right' }}>{fmt(item.avgCost)}</td>
                    <td style={{ ...tdBase, textAlign: 'right', fontWeight: 600 }}>{fmt(item.totalValue)}</td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...tdBase, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => onViewBatches(item)}
                        title="Mở màn hạn sử dụng để xem từng lô của sản phẩm này"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 28,
                          padding: '0 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: '#ffffff',
                          border: '1px solid #0d9488',
                          color: '#0f766e',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Hourglass size={12} />
                        <span>HSD</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={14}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                    fontSize: 13,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Boxes size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Không tìm thấy dòng tồn kho phù hợp
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Đặt lại&quot; bộ lọc.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          backgroundColor: '#ffffff',
          flexWrap: 'wrap',
          gap: 10,
          flexShrink: 0,
          zIndex: 15,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> dòng tồn kho
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 5,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageIndex <= 1 ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              opacity: pageIndex >= totalPages ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

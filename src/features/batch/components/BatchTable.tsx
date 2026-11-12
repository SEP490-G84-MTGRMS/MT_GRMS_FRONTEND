import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC, CSSProperties } from 'react';
import {
  ArrowUpDown,
  PackageOpen,
  Eye,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import type { BatchItem, BatchStatus } from '../types/batch.types';
import { TablePagination } from '../../../components/common';

interface BatchTableProps {
  batches: BatchItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onQuickStocktake?: (batch: BatchItem) => void;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSelectBatch: (batch: BatchItem) => void;
  onDiscountClick: (batch: BatchItem) => void;
  onWriteOffClick: (batch: BatchItem) => void;
  onResetFilters: () => void;
}

type SortField =
  | 'productName'
  | 'sku'
  | 'batchCode'
  | 'expiryDate'
  | 'daysLeft'
  | 'qtyCurrent'
  | 'costPrice'
  | 'status';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN').format(val) + ' đ';

const thBaseStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: '#334155',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
};

export const BatchTable: FC<BatchTableProps> = ({
  batches,
  totalCount,
  pageIndex,
  pageSize,
  onQuickStocktake,
  onPageChange,
  onPageSizeChange,
  onSelectBatch,
  onDiscountClick: _onDiscountClick,
  onWriteOffClick: _onWriteOffClick,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>('expiryDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedBatches = useMemo(() => {
    if (!sortField) return batches;

    return [...batches].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'productName':
          valA = a.productName.toLowerCase();
          valB = b.productName.toLowerCase();
          break;
        case 'sku':
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
          break;
        case 'batchCode':
          valA = a.batchCode.toLowerCase();
          valB = b.batchCode.toLowerCase();
          break;
        case 'expiryDate':
          valA = a.rawExpiryDate;
          valB = b.rawExpiryDate;
          break;
        case 'daysLeft':
          valA = a.daysLeft;
          valB = b.daysLeft;
          break;
        case 'qtyCurrent':
          valA = a.qtyCurrent;
          valB = b.qtyCurrent;
          break;
        case 'costPrice':
          valA = a.costPrice;
          valB = b.costPrice;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortField, sortOrder]);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };
    updateScrollState();
    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollState);
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [sortedBatches, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableMinWidth = 1600;
  const tableFitStyle: CSSProperties = {
    minWidth: tableMinWidth,
    width: '100%',
    tableLayout: 'fixed',
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: 120 }} />
      <col style={{ width: 200 }} />
      <col style={{ width: 110 }} />
      <col style={{ width: 100 }} />
      <col style={{ width: 80 }} />
      <col style={{ width: 130 }} />
      <col style={{ width: 160 }} />
      <col style={{ width: 90 }} />
      <col style={{ width: 90 }} />
      <col style={{ width: 84 }} />
      <col style={{ width: 72 }} />
      <col style={{ width: 52 }} />
      <col style={{ width: 100 }} />
      <col style={{ width: 92 }} />
      <col style={{ width: 128 }} />
    </colgroup>
  );

  const renderStatusBadge = (status: BatchStatus) => {
    const map: Record<BatchStatus, { bg: string; color: string; border: string; label: string }> = {
      Expired: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Hết hạn' },
      Critical: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Khẩn cấp' },
      Warning: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Cận hạn' },
      Normal: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'An toàn' },
    };
    const s = map[status];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 11.5,
          fontWeight: 600,
          color: s.color,
          backgroundColor: s.bg,
          border: `1px solid ${s.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {s.label}
      </span>
    );
  };

  const renderDaysLeft = (days: number, expiryDate?: string) => {
    if (days >= 9999 || !expiryDate || expiryDate === '—') {
      return (
        <span style={{ color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>—</span>
      );
    }
    if (days < 0) {
      return (
        <span
          style={{
            color: '#e11d48',
            fontWeight: 800,
            fontFamily: 'monospace',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <AlertTriangle size={12} color="#e11d48" />
          {days}
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span style={{ color: '#d97706', fontWeight: 800, fontFamily: 'monospace' }}>{days}</span>
      );
    }
    if (days <= 30) {
      return (
        <span style={{ color: '#2563eb', fontWeight: 700, fontFamily: 'monospace' }}>{days}</span>
      );
    }
    return (
      <span style={{ color: '#334155', fontWeight: 600, fontFamily: 'monospace' }}>{days}</span>
    );
  };

  const SortTh: FC<{
    field: SortField;
    label: string;
    align?: 'left' | 'right' | 'center';
  }> = ({ field, label, align = 'left' }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        ...thBaseStyle,
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          gap: 4,
        }}
      >
        <span>{label}</span>
        <ArrowUpDown size={12} color={sortField === field ? '#0f766e' : '#94a3b8'} />
      </div>
    </th>
  );

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <thead>
            <tr>
              <SortTh field="sku" label="Mã SKU" />
              <SortTh field="productName" label="Tên sản phẩm" />
              <SortTh field="batchCode" label="Mã lô" />
              <th style={thBaseStyle}>Ngành hàng</th>
              <th style={thBaseStyle}>Vị trí kệ</th>
              <th style={thBaseStyle}>Chi nhánh</th>
              <th style={thBaseStyle}>Nhà cung cấp</th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Ngày SX</th>
              <SortTh field="expiryDate" label="Hạn dùng" align="center" />
              <SortTh field="daysLeft" label="Còn (ngày)" align="right" />
              <SortTh field="qtyCurrent" label="Tồn" align="right" />
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>ĐVT</th>
              <SortTh field="costPrice" label="Giá vốn" align="right" />
              <SortTh field="status" label="Trạng thái" align="center" />
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <tbody>
            {sortedBatches.length === 0 ? (
              <tr>
                <td
                  colSpan={15}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <PackageOpen size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Không tìm thấy lô hàng nào phù hợp với bộ lọc
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Thử đổi điều kiện hoặc đặt lại bộ lọc.
                    </span>
                    <button
                      type="button"
                      className="po-btn po-btn-secondary"
                      onClick={onResetFilters}
                      style={{ marginTop: 8, height: 32, padding: '0 14px' }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedBatches.map((row) => {
                return (
                  <tr key={row.id} className="so-list-row">
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#334155' }}>
                      {row.sku}
                    </td>

                    <td className="so-list-td--wrap">
                      <button
                        type="button"
                        onClick={() => onSelectBatch(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        title="Xem chi tiết lô"
                      >
                        <div className="so-list-name" style={{ color: '#0d9488' }}>
                          {row.productName}
                        </div>
                      </button>
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: row.batchCode === '—' ? '#94a3b8' : '#0f172a',
                        }}
                      >
                        {row.batchCode}
                      </span>
                    </td>

                    <td style={{ color: '#475569', fontSize: 12 }}>{row.categoryName}</td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {row.shelfLocation}
                      </span>
                    </td>

                    <td style={{ color: '#475569', fontSize: 12 }} title={row.branchName}>
                      {row.branchName}
                    </td>

                    <td className="so-list-td--wrap">
                      <div className="so-list-name" style={{ fontWeight: 500 }}>
                        {row.supplierName}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 500, color: row.mfgDate === '—' ? '#94a3b8' : '#334155' }}>
                      {row.mfgDate || '—'}
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.expiryDate === '—' ? '#94a3b8' : '#1e293b' }}>
                      {row.expiryDate || '—'}
                    </td>

                    <td style={{ textAlign: 'right' }}>{renderDaysLeft(row.daysLeft, row.expiryDate)}</td>

                    <td
                      style={{
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      <div>{row.qtyCurrent}</div>
                      {((row.qtyQuarantined ?? 0) > 0 || (row.qtyReserved ?? 0) > 0) && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#b45309', lineHeight: 1.2 }}>
                          KD: {row.qtyAvailable ?? row.qtyCurrent}
                          {(row.qtyQuarantined ?? 0) > 0 ? ` · CL:${row.qtyQuarantined}` : ''}
                          {(row.qtyReserved ?? 0) > 0 ? ` · RTV:${row.qtyReserved}` : ''}
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {row.unit}
                    </td>

                    <td
                      style={{
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: '#475569',
                      }}
                    >
                      {formatCurrency(row.costPrice)}
                    </td>

                    <td style={{ textAlign: 'center' }}>{renderStatusBadge(row.status)}</td>

                    <td className="so-list-td--actions" style={{ textAlign: 'right' }}>
                      <div className="so-list-actions">
                        <button
                          type="button"
                          className="so-list-action-btn so-list-action-btn--icon so-list-action-btn--success"
                          onClick={() => onSelectBatch(row)}
                          title="Chi tiết"
                          aria-label="Chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        {onQuickStocktake && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--icon"
                            onClick={() => onQuickStocktake(row)}
                            title={
                              row.status === 'Expired' || row.status === 'Critical'
                                ? 'Kiểm kê / xuất hủy'
                                : 'Kiểm kê lô hàng này'
                            }
                            aria-label="Kiểm kê lô hàng"
                            style={{
                              color: row.status === 'Expired' ? '#dc2626' : '#0f766e',
                              borderColor: row.status === 'Expired' ? '#fecaca' : '#99f6e4',
                            }}
                          >
                            <ClipboardCheck size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[10, 15, 20, 30, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="lô hàng"
      />
    </div>
  );
};

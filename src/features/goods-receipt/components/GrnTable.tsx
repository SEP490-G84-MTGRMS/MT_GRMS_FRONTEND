import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC, CSSProperties } from 'react';
import {
  ArrowUpDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  ArrowRightCircle,
  FileCheck2,
  FileEdit,
  AlertCircle,
  Layers,
  FileText,
} from 'lucide-react';
import type { GoodsReceiptListItem, GrnStatus } from '../types/grn.types';

interface GrnTableProps {
  receipts: GoodsReceiptListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSelectReceipt: (receipt: GoodsReceiptListItem) => void;
  onActionClick: (action: string, receipt: GoodsReceiptListItem) => void;
  onResetFilters: () => void;
}

type SortField = 'code' | 'receiveDate' | 'branchName' | 'supplierName' | 'totalAmount' | 'status';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN').format(val);

export const GrnTable: FC<GrnTableProps> = ({
  receipts,
  totalCount,
  pageIndex,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onSelectReceipt,
  onActionClick,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const sortedReceipts = useMemo(() => {
    if (!sortField) return receipts;

    return [...receipts].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'code':
          valA = a.code;
          valB = b.code;
          break;
        case 'receiveDate':
          valA = a.rawDate;
          valB = b.rawDate;
          break;
        case 'branchName':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
          break;
        case 'supplierName':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'totalAmount':
          valA = a.totalAmount;
          valB = b.totalAmount;
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
  }, [receipts, sortField, sortOrder]);

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
      observer = new ResizeObserver(() => updateScrollState());
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [sortedReceipts, pageSize, isLoading]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '13%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  );

  const tableFitStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    tableLayout: 'fixed',
  };

  const thBaseStyle: CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 8px',
    fontSize: 11.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const cellEllipsis: CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const formatDisplayDate = (rawDate: string, fallback: string) => {
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      const [y, m, d] = rawDate.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return fallback;
  };

  const renderStatusBadge = (status: GrnStatus) => {
    const styles: Record<string, CSSProperties> = {
      TODAY: { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
      DRAFT: { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
      CONFIRMED: { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
      COMPLETED: { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
      MISMATCH: { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' },
      CANCELED: { backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' },
      CANCELLED: { backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' },
    };
    const labels: Record<string, string> = {
      TODAY: 'Scheduled',
      DRAFT: 'Draft',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Confirmed',
      MISMATCH: 'Mismatch',
      CANCELED: 'Cancelled',
      CANCELLED: 'Cancelled',
    };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          ...styles[status],
        }}
      >
        {labels[status] || status}
      </span>
    );
  };

  const actionBtnBase: CSSProperties = {
    height: 26,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
  };

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0, overflowX: 'hidden' }}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <thead>
            <tr>
              {(
                [
                  ['code', 'Mã GRN'],
                  ['receiveDate', 'Ngày nhận'],
                  ['branchName', 'Chi nhánh'],
                  ['supplierName', 'Nhà cung cấp'],
                ] as Array<[SortField, string]>
              ).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{label}</span>
                    <ArrowUpDown size={11} color={sortField === field ? '#0f766e' : '#94a3b8'} />
                  </div>
                </th>
              ))}
              <th style={thBaseStyle}>PO</th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Dòng</th>
              <th
                onClick={() => handleSort('totalAmount')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>Tổng tiền</span>
                  <ArrowUpDown size={11} color={sortField === 'totalAmount' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span>Trạng thái</span>
                  <ArrowUpDown size={11} color={sortField === 'status' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>
              <th style={thBaseStyle}>Người nhận</th>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{ overflowX: 'hidden' }}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                  Đang tải danh sách phiếu nhập kho...
                </td>
              </tr>
            ) : sortedReceipts.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                    fontSize: 13,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <PackageOpen size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Không có phiếu nhập kho phù hợp bộ lọc
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Thử đổi điều kiện lọc hoặc tạo phiếu nhập kho từ PO.
                    </span>
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="po-btn po-btn-secondary"
                      style={{ marginTop: 8, height: 32, padding: '0 14px' }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedReceipts.map((row) => {
                const isMismatch = row.status === 'MISMATCH' || !!row.hasMismatch;
                const isToday = row.status === 'TODAY';

                return (
                  <tr
                    key={row.id}
                    className="so-list-row"
                    style={{
                      backgroundColor: isToday ? '#fcfdff' : isMismatch ? '#fffbfb' : undefined,
                    }}
                  >
                    <td style={cellEllipsis} title={row.code}>
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#0d9488',
                          fontWeight: 700,
                          fontSize: 12.5,
                          fontFamily: 'monospace',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={row.code}
                      >
                        {row.code}
                      </button>
                    </td>

                    <td
                      style={{ ...cellEllipsis, fontSize: 12, fontWeight: 500, color: isToday ? '#0369a1' : '#1e293b' }}
                      title={row.receiveDate}
                    >
                      {formatDisplayDate(row.rawDate, row.receiveDate)}
                    </td>

                    <td style={{ ...cellEllipsis, fontSize: 12.5, fontWeight: 500 }} title={row.branchName}>
                      {row.branchName}
                    </td>

                    <td style={{ ...cellEllipsis, fontSize: 12.5, fontWeight: 600 }} title={row.supplierName}>
                      {row.supplierName}
                    </td>

                    <td style={cellEllipsis} title={row.poReference}>
                      {row.poReference !== '—' && row.poReference !== '-' ? (
                        <span style={{ color: '#0d9488', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                          {row.poReference}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', fontSize: 12.5, color: '#475569' }}>
                      {row.lineCount}
                    </td>

                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 12.5,
                        fontFamily: 'monospace',
                        ...cellEllipsis,
                      }}
                      title={formatCurrency(row.totalAmount)}
                    >
                      {formatCurrency(row.totalAmount)}
                    </td>

                    <td style={{ textAlign: 'center' }}>{renderStatusBadge(row.status)}</td>

                    <td style={{ ...cellEllipsis, fontSize: 12, color: '#475569' }} title={row.receiverName}>
                      {row.receiverName}
                    </td>

                    <td style={{ textAlign: 'center', overflow: 'visible' }}>
                      <div className="so-list-actions" style={{ justifyContent: 'center', flexWrap: 'nowrap', gap: 4 }}>
                        {row.status === 'TODAY' && (
                          <button
                            type="button"
                            className="so-list-action-btn"
                            onClick={() => onActionClick('RECEIVE_NOW', row)}
                            style={{
                              ...actionBtnBase,
                              height: 26,
                              padding: '0 8px',
                              fontWeight: 700,
                              border: 'none',
                              backgroundColor: 'var(--blue-primary, #0f766e)',
                              color: '#ffffff',
                            }}
                            title="Bắt đầu kiểm đếm và nhận hàng ngay"
                          >
                            <ArrowRightCircle size={13} />
                          </button>
                        )}

                        {row.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActionClick('APPROVE_DRAFT', row)}
                              style={{
                                ...actionBtnBase,
                                fontWeight: 700,
                                border: 'none',
                                backgroundColor: '#d97706',
                                color: '#ffffff',
                              }}
                              title="Duyệt hoàn tất phiếu nhập kho"
                            >
                              <FileCheck2 size={12} />
                            </button>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => onActionClick('EDIT_DRAFT', row)}
                              style={actionBtnBase}
                              title="Sửa chi tiết phiếu kiểm đếm"
                            >
                              <FileEdit size={12} />
                            </button>
                          </>
                        )}

                        {(row.status === 'MISMATCH' || (row.hasMismatch && row.status === 'CONFIRMED')) && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActionClick('RESOLVE_MISMATCH', row)}
                              style={{
                                ...actionBtnBase,
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                              }}
                              title="Xử lý lệch"
                            >
                              <AlertCircle size={12} />
                            </button>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => onSelectReceipt(row)}
                              style={actionBtnBase}
                              title="Chi tiết"
                            >
                              <FileText size={12} />
                            </button>
                          </>
                        )}

                        {(row.status === 'CONFIRMED' || row.status === 'COMPLETED') && !row.hasMismatch && (
                          <>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => onActionClick('VIEW_BATCH', row)}
                              style={{ ...actionBtnBase, color: '#0d9488' }}
                              title="Xem lô FEFO"
                            >
                              <Layers size={12} />
                            </button>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => onActionClick('PRINT_RECEIPT', row)}
                              style={actionBtnBase}
                              title="In phiếu nhập kho"
                            >
                              <Printer size={12} />
                            </button>
                          </>
                        )}

                        {(row.status === 'CANCELED' || row.status === 'CANCELLED') && (
                          <button
                            type="button"
                            className="so-list-action-btn"
                            onClick={() => onSelectReceipt(row)}
                            style={{ ...actionBtnBase, color: '#64748b' }}
                            title="Chi tiết"
                          >
                            <FileText size={12} />
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

      <div className="so-list-pager">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trong tổng số <b>{totalCount}</b> phiếu
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
            <select
              className="so-list-pager-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>
          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>
          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

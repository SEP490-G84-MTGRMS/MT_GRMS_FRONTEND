import { useState, useMemo, useRef, useEffect } from 'react';
import type { CSSProperties, FC } from 'react';
import {
  Eye,
  Printer,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import type { SupplierReturnListItem, SupplierReturnStatus } from '../types/supplierReturn.types';
import { TablePagination } from '../../../components/common';
import '../../../styles/so-list-page.css';

interface Props {
  items: SupplierReturnListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (item: SupplierReturnListItem) => void;
  onPrint?: (item: SupplierReturnListItem) => void;
}

type SortField =
  | 'code'
  | 'goodsReceiptCode'
  | 'stocktakeCode'
  | 'supplierCode'
  | 'supplierName'
  | 'branchCode'
  | 'branchName'
  | 'totalRequestedQty'
  | 'totalHandedOverQty'
  | 'totalEstimatedAmount'
  | 'status';

type SortDirection = 'asc' | 'desc';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const wrapMonoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  display: 'inline-block',
  maxWidth: '100%',
  lineHeight: 1.35,
};

const wrapTextStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#334155',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  lineHeight: 1.35,
};

export const returnStatusBadge = (status: SupplierReturnStatus) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    case 'PENDING_SUPPLIER':
      return { label: 'Chờ NCC duyệt', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'APPROVED':
      return { label: 'Đã xác nhận', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'PARTIALLY_HANDED_OVER':
      return { label: 'Giao một phần', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'REJECTED':
      return { label: 'NCC từ chối', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    case 'COMPLETED':
      return { label: 'Đã bàn giao', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
    default:
      return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

export const SupplierReturnTable: FC<Props> = ({
  items,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onPrint,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [hasScrollY, setHasScrollY] = useState(false);

  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = () => {
    if (bodyRef.current && headRef.current) {
      headRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

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
        case 'code':
          valA = (a.code || '').toLowerCase();
          valB = (b.code || '').toLowerCase();
          break;
        case 'goodsReceiptCode':
          valA = (a.goodsReceiptCode || '').toLowerCase();
          valB = (b.goodsReceiptCode || '').toLowerCase();
          break;
        case 'stocktakeCode':
          valA = (a.stocktakeCode || '').toLowerCase();
          valB = (b.stocktakeCode || '').toLowerCase();
          break;
        case 'supplierCode':
          valA = (a.supplierCode || '').toLowerCase();
          valB = (b.supplierCode || '').toLowerCase();
          break;
        case 'supplierName':
          valA = (a.supplierName || '').toLowerCase();
          valB = (b.supplierName || '').toLowerCase();
          break;
        case 'branchCode':
          valA = (a.branchCode || '').toLowerCase();
          valB = (b.branchCode || '').toLowerCase();
          break;
        case 'branchName':
          valA = (a.branchName || '').toLowerCase();
          valB = (b.branchName || '').toLowerCase();
          break;
        case 'totalRequestedQty':
          valA = a.totalRequestedQty;
          valB = b.totalRequestedQty;
          break;
        case 'totalHandedOverQty':
          valA = a.totalHandedOverQty;
          valB = b.totalHandedOverQty;
          break;
        case 'totalEstimatedAmount':
          valA = a.totalEstimatedAmount;
          valB = b.totalEstimatedAmount;
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

  useEffect(() => {
    const updateScroll = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };
    updateScroll();
    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScroll);
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScroll);
    return () => {
      window.removeEventListener('resize', updateScroll);
      observer?.disconnect();
    };
  }, [sortedItems, pageSize]);

  // 14 cột tách riêng từng nhiệm vụ, không gộp cột
  const colGroup = (
    <colgroup>
      <col style={{ width: 44 }} />
      <col style={{ width: 130 }} />
      <col style={{ width: 125 }} />
      <col style={{ width: 115 }} />
      <col style={{ width: 110 }} />
      <col style={{ width: 175 }} />
      <col style={{ width: 90 }} />
      <col style={{ width: 150 }} />
      <col style={{ width: 175 }} />
      <col style={{ width: 84 }} />
      <col style={{ width: 84 }} />
      <col style={{ width: 115 }} />
      <col style={{ width: 115 }} />
      <col style={{ width: 84 }} />
    </colgroup>
  );

  const thBaseStyle: CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '6px 5px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  const sortIcon = (field: SortField) => (
    <ArrowUpDown
      size={11}
      style={{ color: sortField === field ? '#0f766e' : '#94a3b8', flexShrink: 0 }}
    />
  );

  return (
    <div className="so-list-table-card so-list-table-card--dense">
      {/* ── Table Sticky Header ── */}
      <div
        ref={headRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1596, tableLayout: 'fixed' }}>
          {colGroup}
          <thead>
            <tr>
              <th style={{ ...thBaseStyle, textAlign: 'center' }}>STT</th>

              <th
                onClick={() => handleSort('code')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã phiếu trả"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã phiếu trả</span>
                  {sortIcon('code')}
                </div>
              </th>

              <th
                onClick={() => handleSort('goodsReceiptCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã phiếu nhập gốc"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã GRN</span>
                  {sortIcon('goodsReceiptCode')}
                </div>
              </th>

              <th
                onClick={() => handleSort('stocktakeCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã phiếu kiểm kê"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã kiểm kê</span>
                  {sortIcon('stocktakeCode')}
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã NCC</span>
                  {sortIcon('supplierCode')}
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierName')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên nhà cung cấp"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên NCC</span>
                  {sortIcon('supplierName')}
                </div>
              </th>

              <th
                onClick={() => handleSort('branchCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã CH</span>
                  {sortIcon('branchCode')}
                </div>
              </th>

              <th
                onClick={() => handleSort('branchName')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên cửa hàng"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên CH</span>
                  {sortIcon('branchName')}
                </div>
              </th>

              <th style={thBaseStyle}>Lý do trả</th>

              <th
                onClick={() => handleSort('totalRequestedQty')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, width: '100%' }}>
                  <span>SL yêu cầu</span>
                  {sortIcon('totalRequestedQty')}
                </div>
              </th>

              <th
                onClick={() => handleSort('totalHandedOverQty')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, width: '100%', color: '#0369a1' }}>
                  <span>SL đã giao</span>
                  {sortIcon('totalHandedOverQty')}
                </div>
              </th>

              <th
                onClick={() => handleSort('totalEstimatedAmount')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, width: '100%' }}>
                  <span>Giá trị trả</span>
                  {sortIcon('totalEstimatedAmount')}
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%' }}>
                  <span>Trạng thái</span>
                  {sortIcon('status')}
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Scrollable Body ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={{ minWidth: 1596, tableLayout: 'fixed' }}>
          {colGroup}
          <tbody>
            {sortedItems.length > 0 ? (
              sortedItems.map((item, idx) => {
                const st = returnStatusBadge(item.status);

                return (
                  <tr
                    key={item.id}
                    className="so-list-row"
                    style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* 1. STT */}
                    <td style={{ textAlign: 'center', color: '#94a3b8', verticalAlign: 'middle' }}>
                      {(pageIndex - 1) * pageSize + idx + 1}
                    </td>

                    {/* 2. Mã phiếu trả */}
                    <td>
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        style={{
                          ...wrapMonoStyle,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: '#0f766e',
                        }}
                        title={item.code}
                      >
                        {item.code}
                      </button>
                    </td>

                    {/* 3. Mã GRN (tách riêng khỏi Mã kiểm kê) */}
                    <td>
                      <span style={{ ...wrapMonoStyle, color: '#2563eb' }} title={item.goodsReceiptCode}>
                        {item.goodsReceiptCode || '—'}
                      </span>
                    </td>

                    {/* 4. Mã kiểm kê (cột độc lập) */}
                    <td>
                      <span
                        style={{
                          ...wrapMonoStyle,
                          color: item.stocktakeCode ? '#0f766e' : '#94a3b8',
                          fontWeight: item.stocktakeCode ? 600 : 400,
                        }}
                        title={item.stocktakeCode || undefined}
                      >
                        {item.stocktakeCode || '—'}
                      </span>
                    </td>

                    {/* 5. Mã NCC (tách riêng khỏi Tên NCC) */}
                    <td>
                      <span style={{ ...wrapMonoStyle, color: '#334155' }} title={item.supplierCode}>
                        {item.supplierCode || '—'}
                      </span>
                    </td>

                    {/* 6. Tên NCC (xuống dòng đầy đủ, không ...) */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={item.supplierName}>
                        {item.supplierName || '—'}
                      </div>
                    </td>

                    {/* 7. Mã CH (tách riêng khỏi Tên CH) */}
                    <td>
                      <span style={{ ...wrapMonoStyle, color: '#334155' }} title={item.branchCode}>
                        {item.branchCode || '—'}
                      </span>
                    </td>

                    {/* 8. Tên CH (xuống dòng đầy đủ, không ...) */}
                    <td className="so-list-td--wrap">
                      <div className="so-list-name" title={item.branchName}>
                        {item.branchName || '—'}
                      </div>
                    </td>

                    {/* 9. Lý do trả (1 nhiệm vụ duy nhất, xuống dòng đầy đủ, không ...) */}
                    <td className="so-list-td--wrap">
                      {item.reason === 'Từ chối nhận hàng' ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            whiteSpace: 'normal',
                            lineHeight: 1.3,
                          }}
                        >
                          Từ chối nhận hàng
                        </span>
                      ) : (
                        <div style={wrapTextStyle} title={item.reason}>
                          {item.reason || '—'}
                        </div>
                      )}
                    </td>

                    {/* 10. SL yêu cầu */}
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ ...wrapMonoStyle, fontWeight: 700, color: '#0f172a' }}>
                        {fmt(item.totalRequestedQty)}
                      </span>
                    </td>

                    {/* 11. SL đã giao */}
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ ...wrapMonoStyle, fontWeight: 700, color: '#0369a1' }}>
                        {fmt(item.totalHandedOverQty)}
                      </span>
                    </td>

                    {/* 12. Giá trị trả */}
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ ...wrapMonoStyle, fontWeight: 700, color: '#0f172a' }}>
                        {fmt(item.totalEstimatedAmount)} đ
                      </span>
                    </td>

                    {/* 13. Trạng thái */}
                    <td className="so-list-td--status" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {st.label}
                      </span>
                    </td>

                    {/* 14. Thao tác */}
                    <td className="so-list-td--actions" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div className="so-list-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="so-list-action-btn so-list-action-btn--icon"
                          onClick={() => onViewDetail(item)}
                          title="Xem chi tiết phiếu trả hàng"
                        >
                          <Eye size={13} />
                        </button>

                        {onPrint && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--icon"
                            onClick={() => onPrint(item)}
                            title="In biên bản trả hàng (A4)"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                      </div>
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
                    <RotateCcw size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Không tìm thấy phiếu trả hàng nào phù hợp
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Vui lòng thử thay đổi tiêu chí tìm kiếm hoặc bấm &quot;Đặt lại&quot; bộ lọc.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn 1, 2, 3... ── */}
      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[10, 20, 36, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="phiếu trả hàng"
      />
    </div>
  );
};

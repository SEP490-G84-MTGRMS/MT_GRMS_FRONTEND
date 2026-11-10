import { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import {
  Eye,
  CheckCircle2,
  Printer,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import type { SupplierReturnListItem, SupplierReturnStatus } from '../types/supplierReturn.types';
import '../../../styles/so-list-page.css';

interface Props {
  items: SupplierReturnListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (item: SupplierReturnListItem) => void;
  onQuickHandover?: (item: SupplierReturnListItem) => void;
  onPrint?: (item: SupplierReturnListItem) => void;
}

type SortField =
  | 'code'
  | 'goodsReceiptCode'
  | 'supplierName'
  | 'branchName'
  | 'totalRequestedQty'
  | 'totalApprovedQty'
  | 'totalHandedOverQty'
  | 'totalEstimatedAmount'
  | 'status'
  | 'createdAt';

type SortDirection = 'asc' | 'desc';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const returnStatusBadge = (status: SupplierReturnStatus) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    case 'PENDING_SUPPLIER':
      return { label: 'Chờ NCC duyệt', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'APPROVED':
      return { label: 'Đã duyệt (Chờ giao)', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'PARTIALLY_HANDED_OVER':
      return { label: 'Đã giao một phần', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
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
  onQuickHandover,
  onPrint,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

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
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case 'goodsReceiptCode':
          valA = a.goodsReceiptCode.toLowerCase();
          valB = b.goodsReceiptCode.toLowerCase();
          break;
        case 'supplierName':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'branchName':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
          break;
        case 'totalRequestedQty':
          valA = a.totalRequestedQty;
          valB = b.totalRequestedQty;
          break;
        case 'totalApprovedQty':
          valA = a.totalApprovedQty;
          valB = b.totalApprovedQty;
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
        case 'createdAt':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const colGroup = (
    <colgroup>
      <col style={{ width: '4%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '17%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '9%' }} />
    </colgroup>
  );

  return (
    <div className="so-list-table-card">
      {/* ── Table Sticky Header ── */}
      <div ref={headRef} className="so-list-table-head">
        <table className="so-list-table" style={{ minWidth: 1280 }}>
          {colGroup}
          <thead>
            <tr>
              <th className="so-list-th" style={{ textAlign: 'center' }}>
                #
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('code')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã phiếu trả</span>
                  <ArrowUpDown size={12} color={sortField === 'code' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('goodsReceiptCode')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Phiếu nhập (GRN)</span>
                  <ArrowUpDown size={12} color={sortField === 'goodsReceiptCode' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('supplierName')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Nhà cung cấp</span>
                  <ArrowUpDown size={12} color={sortField === 'supplierName' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('branchName')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Chi nhánh</span>
                  <ArrowUpDown size={12} color={sortField === 'branchName' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th className="so-list-th">Lý do trả</th>

              <th
                className="so-list-th"
                onClick={() => handleSort('totalRequestedQty')}
                style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>SL Y/C</span>
                  <ArrowUpDown size={12} color={sortField === 'totalRequestedQty' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('totalApprovedQty')}
                style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, color: '#15803d' }}>
                  <span>SL Duyệt</span>
                  <ArrowUpDown size={12} color={sortField === 'totalApprovedQty' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('totalHandedOverQty')}
                style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, color: '#0369a1' }}>
                  <span>SL Đã giao</span>
                  <ArrowUpDown size={12} color={sortField === 'totalHandedOverQty' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('totalEstimatedAmount')}
                style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>Giá trị trả</span>
                  <ArrowUpDown size={12} color={sortField === 'totalEstimatedAmount' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                className="so-list-th"
                onClick={() => handleSort('status')}
                style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span>Trạng thái</span>
                  <ArrowUpDown size={12} color={sortField === 'status' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th className="so-list-th" style={{ textAlign: 'right' }}>
                Hành động
              </th>
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
        <table className="so-list-table" style={{ minWidth: 1280 }}>
          {colGroup}
          <tbody>
            {sortedItems.length > 0 ? (
              sortedItems.map((item, idx) => {
                const st = returnStatusBadge(item.status);
                const isApprovedWaitingHandover =
                  item.status === 'APPROVED' || item.status === 'PARTIALLY_HANDED_OVER';

                return (
                  <tr key={item.id} className="so-list-row">
                    {/* Index */}
                    <td className="so-list-td" style={{ textAlign: 'center', color: '#64748b' }}>
                      {(pageIndex - 1) * pageSize + idx + 1}
                    </td>

                    {/* Mã phiếu trả */}
                    <td className="so-list-td">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="so-list-code" style={{ cursor: 'pointer' }}>
                          {item.code}
                        </span>
                      </button>
                    </td>

                    {/* Phiếu nhập gốc & Phiếu kiểm kê */}
                    <td className="so-list-td">
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 12,
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        {item.goodsReceiptCode}
                      </span>
                      {item.stocktakeCode && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#0f766e',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          KK: {item.stocktakeCode}
                        </div>
                      )}
                    </td>

                    {/* Nhà cung cấp */}
                    <td className="so-list-td so-list-td--wrap">
                      <div className="so-list-name" title={item.supplierName}>
                        {item.supplierName}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
                        {item.supplierCode}
                      </div>
                    </td>

                    {/* Chi nhánh */}
                    <td className="so-list-td">
                      <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                        {item.branchName}
                      </span>
                    </td>

                    {/* Lý do trả */}
                    <td className="so-list-td so-list-td--wrap" style={{ maxWidth: 180 }}>
                      {item.reason === 'Từ chối nhận hàng' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 'fit-content',
                              padding: '2px 7px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                            }}
                          >
                            Từ chối nhận hàng
                          </span>
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>
                            Tài xế chở về ngay (GRN)
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#475569' }} title={item.reason}>
                          {item.reason}
                        </span>
                      )}
                    </td>

                    {/* SL Y/C */}
                    <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmt(item.totalRequestedQty)}
                    </td>

                    {/* SL Duyệt */}
                    <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                      {fmt(item.totalApprovedQty)}
                    </td>

                    {/* SL Đã giao */}
                    <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                      {fmt(item.totalHandedOverQty)}
                    </td>

                    {/* Giá trị ước tính */}
                    <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {fmt(item.totalEstimatedAmount)} đ
                    </td>

                    {/* Trạng thái */}
                    <td className="so-list-td" style={{ textAlign: 'center' }}>
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

                    {/* Hành động */}
                    <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right' }}>
                      <div className="so-list-actions">
                        <button
                          type="button"
                          className="so-list-action-btn so-list-action-btn--icon"
                          onClick={() => onViewDetail(item)}
                          title="Xem chi tiết phiếu trả hàng"
                        >
                          <Eye size={13} />
                        </button>

                        {isApprovedWaitingHandover && onQuickHandover && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--success"
                            onClick={() => onQuickHandover(item)}
                            title="Xác nhận bàn giao hàng thực tế cho NCC"
                          >
                            <CheckCircle2 size={13} />
                            <span>Bàn giao</span>
                          </button>
                        )}

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
                  colSpan={12}
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
                      Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Đặt lại&quot; bộ lọc.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang (Paging) chuẩn so-list-pager ── */}
      <div className="so-list-pager">
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> phiếu trả hàng
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
            <select
              className="so-list-pager-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={24}>24</option>
              <option value={36}>36</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Bên phải: Nút Trước / Trang x / y / Sau */}
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

import type { CSSProperties, FC } from 'react';
import { Eye, CheckCircle2, Printer } from 'lucide-react';
import type { SupplierReturnListItem, SupplierReturnStatus } from '../types/supplierReturn.types';

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

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const th: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '8px 10px',
  fontSize: 12.5,
  borderBottom: '1px solid #f1f5f9',
  color: '#1e293b',
};

export const returnStatusBadge = (status: SupplierReturnStatus) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    case 'PENDING_SUPPLIER':
      return { label: 'Chờ NCC duyệt', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'APPROVED':
      return { label: 'Đã duyệt (Chờ giao)', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
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
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const end = Math.min(pageIndex * pageSize, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        style={{
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', width: 45 }}>#</th>
              <th style={th}>Mã phiếu trả</th>
              <th style={th}>Phiếu nhập gốc (GRN)</th>
              <th style={th}>Nhà cung cấp</th>
              <th style={th}>Chi nhánh</th>
              <th style={th}>Lý do trả</th>
              <th style={{ ...th, textAlign: 'right' }}>SL yêu cầu</th>
              <th style={{ ...th, textAlign: 'right' }}>SL duyệt</th>
              <th style={{ ...th, textAlign: 'right' }}>SL đã giao</th>
              <th style={{ ...th, textAlign: 'right' }}>Giá trị ước tính</th>
              <th style={{ ...th, textAlign: 'center' }}>Trạng thái</th>
              <th style={{ ...th, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ ...td, textAlign: 'center', padding: 36, color: '#64748b' }}>
                  Không có phiếu trả hàng nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const badge = returnStatusBadge(item.status);
                const rowNo = start + idx;
                return (
                  <tr key={item.id} style={{ transition: 'background-color 0.15s' }}>
                    <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{rowNo}</td>
                    <td style={td}>
                      <span
                        onClick={() => onViewDetail(item)}
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          color: '#0f766e',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        {item.code}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#2563eb' }}>
                        {item.goodsReceiptCode}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{item.supplierName}</td>
                    <td style={td}>{item.branchName}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                      {item.reason}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                      {fmt(item.totalRequestedQty)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: item.totalApprovedQty > 0 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                      {item.status === 'DRAFT' || item.status === 'PENDING_SUPPLIER' ? '-' : fmt(item.totalApprovedQty)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: item.totalHandedOverQty > 0 ? '#0284c7' : '#94a3b8' }}>
                      {item.status === 'COMPLETED' ? fmt(item.totalHandedOverQty) : '-'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {fmt(item.totalEstimatedAmount)} đ
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => onViewDetail(item)}
                          title="Xem chi tiết phiếu trả hàng"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {item.status === 'APPROVED' && onQuickHandover && (
                          <button
                            type="button"
                            onClick={() => onQuickHandover(item)}
                            title="Xác nhận bàn giao thực tế"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 28,
                              padding: '0 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              color: '#15803d',
                              cursor: 'pointer',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Bàn giao</span>
                          </button>
                        )}

                        {onPrint && (
                          <button
                            type="button"
                            onClick={() => onPrint(item)}
                            title="In biên bản trả hàng"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            <Printer size={12} />
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

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 2px 0',
          flexShrink: 0,
          fontSize: 12,
          color: '#475569',
        }}
      >
        <div>
          {totalCount === 0 ? 'Không có dữ liệu' : `Dòng ${start}–${end} / ${totalCount}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 30 }}
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            Trước
          </button>
          <span style={{ fontWeight: 700 }}>
            {pageIndex}/{totalPages}
          </span>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 30 }}
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};

import type { FC } from 'react';
import type { BranchListItem } from '../../types/po.types';
import {
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface BranchOrderTableProps {
  branches: BranchListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onViewDetail: (branch: BranchListItem) => void;
  onOrder: (branchId: string) => void;
}

export const BranchOrderTable: FC<BranchOrderTableProps> = ({
  branches,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onOrder,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const renderStatusBadge = (status: BranchListItem['status']) => {
    if (status === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 11.5,
            fontWeight: 600,
            backgroundColor: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={11} />
          Đang hoạt động
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 99,
          fontSize: 11.5,
          fontWeight: 600,
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          border: '1px solid #cbd5e1',
          whiteSpace: 'nowrap',
        }}
      >
        <XCircle size={11} />
        Ngừng hoạt động
      </span>
    );
  };

  return (
    <div className="po-branch-container">
      {/* ── Scrollable Table Wrapper (Single table with sticky header) ── */}
      <div className="po-branch-table-wrapper">
        <table className="po-branch-table">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: 204 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Mã chi nhánh</th>
              <th>Tên chi nhánh</th>
              <th>Người phụ trách</th>
              <th style={{ textAlign: 'right' }}>Tồn kho thực tế</th>
              <th style={{ textAlign: 'right' }}>SL đặt hàng</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Cập nhật gần nhất</th>
              <th style={{ textAlign: 'right', paddingRight: 14 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {branches.length > 0 ? (
              branches.map((branch) => {
                const isInactive = branch.status === 'inactive';
                return (
                  <tr key={branch.id}>
                    {/* 1. Mã chi nhánh */}
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {branch.code}
                      </span>
                    </td>

                    {/* 2. Tên chi nhánh (Name on line 1, Address on line 2) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span
                          title={branch.name}
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {branch.name}
                        </span>
                        <div
                          title={branch.address}
                          style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <MapPin size={11} style={{ flexShrink: 0, color: '#94a3b8' }} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {branch.address}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Người phụ trách (Name on line 1, Phone on line 2) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#1e293b',
                            fontSize: 12.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {branch.managerName || '—'}
                        </span>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Phone size={11} style={{ flexShrink: 0, color: '#94a3b8' }} />
                          <span>{branch.managerPhone || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Tồn kho thực tế (Pure numeric, right aligned, tabular) */}
                    <td className="po-branch-num-cell" style={{ color: '#0f172a' }}>
                      {fmt(branch.stockQty)}
                    </td>

                    {/* 5. SL đặt hàng (Pure numeric, right aligned, tabular) */}
                    <td
                      className="po-branch-num-cell"
                      style={{
                        color: branch.orderQty > 0 ? 'var(--blue-primary, #0f766e)' : '#94a3b8',
                      }}
                    >
                      {fmt(branch.orderQty)}
                    </td>

                    {/* 6. Trạng thái */}
                    <td style={{ textAlign: 'center' }}>
                      {renderStatusBadge(branch.status)}
                    </td>

                    {/* 7. Cập nhật gần nhất */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {branch.lastUpdated || '—'}
                      </span>
                    </td>

                    {/* 8. Thao tác */}
                    <td className="po-branch-action-cell">
                      <div className="po-branch-action-btn-group">
                        <button
                          type="button"
                          onClick={() => onViewDetail(branch)}
                          className="po-branch-btn-view"
                          title="Xem chi tiết số lượng đặt hàng theo bảng grid"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          disabled={isInactive}
                          onClick={() => onOrder(branch.id)}
                          className="po-branch-btn-order"
                          title={
                            isInactive
                              ? 'Chi nhánh đã ngừng hoạt động, không thể tạo đơn đặt hàng'
                              : `Tạo đơn mua hàng ma trận cho ${branch.name}`
                          }
                        >
                          <ShoppingCart size={12} />
                          <span>Đặt hàng</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  🔍 Không tìm thấy chi nhánh nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Footer (luôn hiển thị khi có dữ liệu) ── */}
      {totalCount > 0 && (
        <div
          style={{
            padding: '9px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#64748b',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              Hiển thị <b>{(pageIndex - 1) * pageSize + 1}</b> -{' '}
              <b>{Math.min(pageIndex * pageSize, totalCount)}</b> trên <b>{totalCount}</b> chi nhánh
            </div>

            {onPageSizeChange && (
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
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>

          {/* Bên phải: Nút Trước / Trang x / y / Sau */}
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
                cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
                opacity: pageIndex <= 1 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
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
                cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
                opacity: pageIndex >= totalPages ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Sau</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


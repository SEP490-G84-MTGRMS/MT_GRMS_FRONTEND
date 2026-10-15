import { useState } from 'react';
import type { FC } from 'react';
import { Eye, Edit2, History, QrCode, AlertCircle } from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { CustomerDto, MembershipTier } from '../types/customer.types';

export interface CustomerTableProps {
  customers: CustomerDto[];
  isLoading: boolean;
  onSelect: (customer: CustomerDto) => void;
  onEdit: (customer: CustomerDto) => void;
  onCollect: (customer: CustomerDto) => void;
  onViewLedger?: (customer: CustomerDto) => void;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

const renderTierBadge = (tier: MembershipTier) => {
  switch (tier) {
    case 'VIP':
      return (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-primary, #0f766e)' }}>
          VIP
        </span>
      );
    case 'Gold':
      return (
        <span style={{ fontSize: 13, fontWeight: 500, color: '#d97706' }}>
          Gold
        </span>
      );
    case 'Silver':
      return (
        <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>
          Silver
        </span>
      );
    default:
      return (
        <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>
          Standard
        </span>
      );
  }
};

export const CustomerTable: FC<CustomerTableProps> = ({
  customers,
  isLoading,
  onSelect,
  onEdit,
  onCollect,
  onViewLedger,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) => {
  const displayedCustomers = onPageChange
    ? customers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : customers;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedCustomers.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="customer-table-container" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Đang tải danh sách khách hàng...</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="customer-table-container" style={{ padding: '56px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--blue-subtle, #CCFBF1)',
            color: 'var(--blue-primary, #0F766E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertCircle className="w-8 h-8" />
        </div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #111827)', margin: '0 0 8px' }}>
          Không tìm thấy khách hàng nào
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '460px', margin: '0 auto' }}>
          Không có kết quả nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại. Vui lòng thử tìm từ khóa khác hoặc xóa bộ lọc.
        </p>
      </div>
    );
  }

  return (
    <div className="customer-table-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="customer-table">
          <thead>
            <tr>
              <th style={{ width: 30, textAlign: 'center', padding: '10px 4px' }}>
                <input
                  type="checkbox"
                  checked={displayedCustomers.length > 0 && selectedIds.length === displayedCustomers.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Hạng thẻ</th>
              <th style={{ textAlign: 'right' }}>Công nợ AR</th>
              <th style={{ textAlign: 'right' }}>Hạn mức nợ</th>
              <th style={{ textAlign: 'left' }}>Tình trạng nợ</th>
              <th style={{ textAlign: 'right' }}>Điểm thưởng</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedCustomers.map((c) => {
              const debtPercent =
                c.debtLimit > 0 ? Math.min(100, Math.round((c.currentDebtAR / c.debtLimit) * 100)) : 0;
              const isOverLimit = c.currentDebtAR > c.debtLimit && c.debtLimit > 0;
              const hasDebt = c.currentDebtAR > 0;

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                >
                  {/* Checkbox */}
                  <td
                    style={{ textAlign: 'center', padding: '10px 4px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelectOne(c.id)}
                    />
                  </td>

                  {/* Họ tên */}
                  <td>
                    <div className="customer-name">
                      {c.fullName}
                    </div>
                    {c.companyName && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                        {c.companyName}
                      </div>
                    )}
                  </td>

                  {/* SĐT */}
                  <td>
                    <span className="customer-phone">{c.phoneNumber}</span>
                  </td>

                  {/* Tier */}
                  <td>{renderTierBadge(c.membershipTier)}</td>

                  {/* Công nợ */}
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        color: isOverLimit ? '#DC2626' : hasDebt ? '#D97706' : '#94A3B8',
                      }}
                    >
                      {formatCurrency(c.currentDebtAR)}
                    </div>
                    {hasDebt && c.debtLimit > 0 && (
                      <div className="debt-progress-box" style={{ marginLeft: 'auto', marginTop: '4px' }}>
                        <div className="debt-progress-bar">
                          <div
                            className={`debt-progress-fill ${
                              isOverLimit
                                ? 'debt-fill-danger'
                                : debtPercent > 80
                                ? 'debt-fill-warning'
                                : 'debt-fill-safe'
                            }`}
                            style={{ width: `${debtPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Hạn mức nợ */}
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: '#475569' }}>
                    {formatCurrency(c.debtLimit)}
                  </td>

                  {/* Trạng thái nợ */}
                  <td style={{ textAlign: 'left' }}>
                    {isOverLimit ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                        Quá hạn mức
                      </span>
                    ) : hasDebt ? (
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#d97706' }}>
                        Đang nợ ({debtPercent}%)
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#16a34a' }}>
                        Không nợ
                      </span>
                    )}
                  </td>

                  {/* Điểm thưởng */}
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      color: 'var(--blue-primary, #0F766E)',
                    }}
                  >
                    {c.loyaltyPoints.toLocaleString('vi-VN')}
                  </td>

                  {/* Thao tác */}
                  <td
                    style={{ textAlign: 'right' }}
                    onClick={(e) => e.stopPropagation()} // Prevent row click
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {/* Nút Thu nợ */}
                      {hasDebt && (
                        <button
                          type="button"
                          onClick={() => onCollect(c)}
                          title="Lập phiếu thu nợ & Tạo VietQR"
                          className="admin-table-btn admin-table-btn-primary"
                        >
                          <QrCode size={12} />
                          <span>Thu nợ</span>
                        </button>
                      )}

{/* Nút Xem Sổ Biến Động Công Nợ */}
                      {onViewLedger && (
                        <button
                          onClick={() => onViewLedger(c)}
                          title="Xem sổ biến động công nợ"
                          className="action-icon-btn"
                          style={{ color: '#0F766E' }}
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}

                      {/* Nút Xem Drawer */}
                      <button
                        onClick={() => onSelect(c)}
                        title="Xem chi tiết hồ sơ"
                        className="action-icon-btn"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Nút Sửa */}
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        title="Chỉnh sửa thông tin"
                        className="admin-table-btn"
                      >
                        <Edit2 size={12} />
                        <span>Sửa</span>
                      </button>

                      {/* Nút Xem Chi tiết */}
                      <button
                        type="button"
                        onClick={() => onSelect(c)}
                        title="Xem chi tiết hồ sơ"
                        className="admin-table-btn"
                      >
                        <Eye size={12} />
                        <span>Chi tiết</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Shared Pagination Footer */}
      {onPageChange && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={customers.length}
          itemLabel="khách hàng"
          isLoading={isLoading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

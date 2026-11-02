import { useState } from 'react';
import type { FC } from 'react';
import { Edit2, History, QrCode, AlertCircle } from 'lucide-react';
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
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F766E', background: '#CCFBF1', padding: '2px 8px', borderRadius: 9999 }}>
          VIP
        </span>
      );
    case 'Gold':
      return (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 9999 }}>
          Gold
        </span>
      );
    case 'Silver':
      return (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: 9999 }}>
          Silver
        </span>
      );
    default:
      return (
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', background: '#F8FAFC', padding: '2px 8px', borderRadius: 9999 }}>
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
          Không có kết quả nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
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
              <th style={{ textAlign: 'right' }}>Công nợ phải thu (AR)</th>
              <th style={{ textAlign: 'right' }}>Hạn mức nợ</th>
              <th style={{ textAlign: 'left' }}>Tình trạng nợ</th>
              <th style={{ textAlign: 'right' }}>Điểm tích lũy</th>
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
                  style={{ cursor: 'pointer' }}
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
                    <div className="customer-name" style={{ fontWeight: 700 }}>
                      {c.fullName}
                    </div>
                    {c.companyName && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                        {c.companyName}
                      </div>
                    )}
                  </td>

                  {/* SDT */}
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
                        fontWeight: 800,
                        fontSize: '0.95rem',
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 9999 }}>
                        Vượt hạn mức
                      </span>
                    ) : hasDebt ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 9999 }}>
                        Đang nợ ({debtPercent}%)
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 9999 }}>
                        Đã thanh toán
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

                  {/* Thao tác tinh giản */}
                  <td
                    style={{ textAlign: 'right' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {/* Nút Thu nợ 1 chạm nổi bật */}
                      {hasDebt ? (
                        <button
                          type="button"
                          onClick={() => onCollect(c)}
                          title="Lập phiếu thu nợ 1 chạm & Tạo mã VietQR"
                          style={{
                            background: '#16A34A',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          <QrCode size={14} />
                          <span>Thu nợ</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', marginRight: 4 }}>
                          Hết nợ
                        </span>
                      )}

                      {/* Nút Sổ công nợ */}
                      {onViewLedger && (
                        <button
                          type="button"
                          onClick={() => onViewLedger(c)}
                          title="Xem sổ chi tiết biến động công nợ"
                          style={{
                            background: '#F0FDFA',
                            border: '1px solid #99F6E4',
                            color: '#0F766E',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <History size={13} />
                          <span>Sổ nợ</span>
                        </button>
                      )}

                      {/* Nút Sửa */}
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        title="Chỉnh sửa thông tin khách hàng"
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Sửa</span>
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
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

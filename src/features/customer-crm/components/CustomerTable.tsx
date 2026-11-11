import type { FC } from 'react';
import { AlertCircle } from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { CustomerDto } from '../types/customer.types';
import { formatMoney } from '../../finance/utils/formatters';
import { sanitizeCustomerText, normalizeDebtLimit } from '../utils/customerValidation';

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

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Đang tải danh sách khách hàng...</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--teal-light, #f0fdfa)',
            color: 'var(--teal-primary, #0f766e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertCircle className="w-8 h-8" />
        </div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 8px' }}>
          Không tìm thấy khách hàng nào
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #475569)', maxWidth: '460px', margin: '0 auto' }}>
          Không có kết quả nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Mã số thuế</th>
              <th>Khách nợ / Hạn mức tín dụng</th>
              <th className="text-right">Điểm tích lũy</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody id="crm-cust-tbody">
            {displayedCustomers.map((c) => {
              const debt = Math.max(0, Number(c.currentDebtAR) || 0);
              const limit = normalizeDebtLimit(c.debtLimit);
              const pct = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;
              const isOverLimit = limit > 0 && debt > limit;
              const hasDebt = debt > 0;
              const fillCls = isOverLimit ? 'red' : pct >= 80 ? 'amber' : 'green';
              const code = c.customerCode || c.id.slice(0, 8).toUpperCase();
              const safeFullName = sanitizeCustomerText(c.fullName, 'Khách hàng');
              const safeCompanyName = sanitizeCustomerText(c.companyName);

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="row-clickable"
                >
                  {/* Cột 1: Khách hàng */}
                  <td>
                    <div className="fw-700">
                      {safeFullName}
                      {isOverLimit && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>
                          Vượt hạn mức
                        </span>
                      )}
                    </div>
                    <div className="text-faint" style={{ fontSize: '11.5px', marginTop: 2 }}>
                      <span className="font-mono">{code}</span> • {c.phoneNumber || ''} • {c.membershipTier || 'Thành viên'}
                      {safeCompanyName ? ` (${safeCompanyName})` : ''}
                    </div>
                  </td>

                  {/* Cột 2: Mã số thuế */}
                  <td className="font-mono">{c.taxCode || '—'}</td>

                  {/* Cột 3: Khách nợ / Hạn mức tín dụng */}
                  <td style={{ minWidth: '210px' }}>
                    <div className="flex-between" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      <span className={`num fw-700 ${isOverLimit ? 'text-red' : hasDebt ? 'text-amber' : ''}`}>
                        {formatMoney(debt)}
                      </span>
                      <span className="num text-faint">/ {formatMoney(limit)}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${fillCls}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>

                  {/* Cột 4: Điểm tích lũy */}
                  <td className="text-right num fw-600">
                    {(c.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm
                  </td>

                  {/* Cột 5: Thao tác */}
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-gap" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                      {hasDebt && (
                        <button
                          type="button"
                          className="btn btn-warning btn-sm btn-collect-debt"
                          data-action="collect-debt"
                          onClick={() => onCollect(c)}
                          title="Lập phiếu thu nợ & tạo mã VietQR SePay"
                        >
                          Thu nợ
                        </button>
                      )}
                      {onViewLedger && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onViewLedger(c)}
                          title="Xem sổ chi tiết biến động công nợ"
                        >
                          Sổ nợ
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onEdit(c)}
                        title="Chỉnh sửa thông tin khách hàng"
                      >
                        Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
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

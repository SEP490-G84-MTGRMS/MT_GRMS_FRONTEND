import { useState, useRef, useEffect, type FC } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TablePagination } from '../../../components/common';
import type { CustomerDto } from '../types/customer.types';
import { formatMoney } from '../../finance/utils/formatters';
import { sanitizeCustomerText } from '../utils/customerValidation';

export interface CustomerTableProps {
  customers: CustomerDto[];
  isLoading: boolean;
  onSelect: (customer: CustomerDto) => void;
  onEdit: (customer: CustomerDto) => void;
  onCollect?: (customer: CustomerDto) => void;
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
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
}) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  const displayedCustomers = onPageChange
    ? customers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : customers;

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
  }, [displayedCustomers, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '34%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '22%' }} />
    </colgroup>
  );

  return (
    <div className="so-list-table-card">
      {/* ── Fixed Table Header ── */}
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 880, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th className="so-list-th">Khách hàng</th>
              <th className="so-list-th">Liên hệ / Địa chỉ</th>
              <th className="so-list-th" style={{ textAlign: 'right' }}>Công nợ hiện tại</th>
              <th className="so-list-th" style={{ textAlign: 'right' }}>Điểm tích lũy</th>
              <th className="so-list-th" style={{ textAlign: 'right', paddingRight: '16px' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable Table Body ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body"
        onScroll={handleBodyScroll}
      >
        {isLoading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#0f766e' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Đang tải danh sách khách hàng &amp; công nợ...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#f0fdfa',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Không tìm thấy khách hàng nào
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
              Không có kết quả nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <table className="so-list-table" style={{ minWidth: 880, tableLayout: 'fixed' }}>
            {tableColGroup}
            <tbody id="crm-cust-tbody">
              {displayedCustomers.map((c) => {
                const debt = Math.max(0, Number(c.currentDebtAR) || 0);
                const hasDebt = debt > 0;
                const code = c.customerCode || c.id.slice(0, 8).toUpperCase();
                const safeFullName = sanitizeCustomerText(c.fullName, 'Khách hàng');
                const safeCompanyName = sanitizeCustomerText(c.companyName);

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="so-list-row row-clickable"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Cột 1: Khách hàng */}
                    <td className="so-list-td">
                      <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <span>{safeFullName}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{code}</span>
                        {c.phoneNumber ? ` • ${c.phoneNumber}` : ''}
                        {safeCompanyName ? ` (${safeCompanyName})` : ''}
                      </div>
                    </td>

                    {/* Cột 2: Liên hệ / Địa chỉ */}
                    <td className="so-list-td" style={{ color: '#475569', fontSize: '12.5px' }}>
                      {c.email || sanitizeCustomerText(c.address) || '—'}
                    </td>

                    {/* Cột 3: Công nợ hiện tại */}
                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: hasDebt ? '#b45309' : '#0f766e',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '13px',
                        }}
                      >
                        {formatMoney(debt)}
                      </span>
                    </td>

                    {/* Cột 4: Điểm tích lũy */}
                    <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                      {(c.loyaltyPoints || 0).toLocaleString('vi-VN')} điểm
                    </td>

                    {/* Cột 5: Thao tác */}
                    <td className="so-list-td" style={{ textAlign: 'right', paddingRight: '14px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="so-list-actions">
                        {hasDebt && onCollect && (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--warning"
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
                            className="so-list-action-btn"
                            onClick={() => onViewLedger(c)}
                            title="Xem sổ chi tiết biến động công nợ"
                          >
                            Sổ nợ
                          </button>
                        )}
                        <button
                          type="button"
                          className="so-list-action-btn"
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
        )}
      </div>

      {/* ── Pinned Pagination Footer ── */}
      {onPageChange && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={customers.length}
          itemLabel="khách hàng"
          pageSizeOptions={[15, 25, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default CustomerTable;


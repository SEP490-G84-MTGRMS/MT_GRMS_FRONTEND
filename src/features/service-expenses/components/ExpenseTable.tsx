import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { createPortal } from 'react-dom';
import {
  EyeIcon,
  CloseIcon,
  AuditIcon,
  CheckCircleIcon,
} from '../../admin/components';
import { TablePagination } from '../../../components/common';
import {
  EXPENSE_CATEGORY_LABELS,
  type ServiceExpenseDto,
} from '../types/expense.types';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';
import { formatMoney } from '../../finance/utils/formatters';
import { MoreHorizontal, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ExpenseTableProps {
  data?: ServiceExpenseDto[];
  isLoading?: boolean;
  totalItems?: number;
  page?: number;
  pageSize?: number;
  canManageExpenses?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  onViewBill: (url: string, title: string) => void;
  onPay: (item: ServiceExpenseDto) => void;
  onApprove?: (item: ServiceExpenseDto) => void;
  onReject?: (item: ServiceExpenseDto) => void;
  onCancel: (item: ServiceExpenseDto) => void;
}

export const ExpenseTable: FC<ExpenseTableProps> = ({
  data = [],
  isLoading = false,
  totalItems = 0,
  page = 1,
  pageSize = 10,
  canManageExpenses = true,
  onPageChange,
  onPageSizeChange,
  onViewBill,
  onPay,
  onApprove,
  onReject,
  onCancel,
}) => {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<{ id: string; anchor: HTMLButtonElement } | null>(null);
  const menuAnchor = openMenu?.anchor.getBoundingClientRect();

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest('.expense-row-menu')) close();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        openMenu.anchor.focus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [openMenu]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
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
      observer = new ResizeObserver(updateScrollState);
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [data, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '12%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '8%' }} />
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
        <table className="so-list-table so-list-table--readable expense-responsive-table">
          {tableColGroup}
          <thead>
            <tr>
              <th className="so-list-th">Mã phiếu chi</th>
              <th className="so-list-th">Danh mục chi phí</th>
              <th className="so-list-th">Chi nhánh</th>
              <th className="so-list-th">Nhà cung cấp / Diễn giải</th>
              <th className="so-list-th">Hạn thanh toán</th>
              <th className="so-list-th" style={{ textAlign: 'right' }}>Số tiền (VNĐ)</th>
              <th className="so-list-th" style={{ textAlign: 'left' }}>Trạng thái</th>
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
            <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Đang tải danh sách chi phí vận hành...</p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#f0fdfa',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: '#0f766e',
              }}
            >
              <AuditIcon size={24} color="#0f766e" />
            </div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 6px',
              }}
            >
              Không có khoản phải trả nào
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
              Chưa có khoản chi nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <table className="so-list-table so-list-table--readable expense-responsive-table">
            {tableColGroup}
            <tbody>
              {data.map((item) => (
                <tr key={item.expenseId} className="so-list-row">
                  {/* Mã phiếu */}
                  <td className="so-list-td">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        fontSize: 12,
                        backgroundColor: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: 4,
                        color: '#0f172a',
                      }}
                    >
                      {item.voucherCode || item.expenseId}
                    </span>
                  </td>

                  {/* Danh mục chi phí */}
                  <td className="so-list-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12.5px' }}>
                        {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      {item.isFlaggedAsSuspiciousSplit && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#b91c1c',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                          }}
                          title={item.suspiciousReason || 'Cảnh báo xé nhỏ hạn mức chi (Anti-Splitting)'}
                        >
                          ⚠️ Nghi vấn
                        </span>
                      )}
                      {item.isRecurring && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#2563eb',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                          }}
                          title={'Chi phí lặp lại định kỳ hàng tháng (ngày ' + (item.recurringDayOfMonth || 1) + ')'}
                        >
                          Định kỳ
                        </span>
                      )}
                      {item.isTaxDeductible === false ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#b45309',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                          }}
                          title="Khoản chi nằm trong danh sách loại trừ thuế (Blacklist)"
                        >
                          Loại trừ thuế
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#0f766e',
                            background: '#f0fdfa',
                            border: '1px solid #ccfbf1',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                          }}
                          title="Chi phí hợp lệ phục vụ sản xuất kinh doanh"
                        >
                          Hợp lệ thuế
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Chi nhánh */}
                  <td className="so-list-td" style={{ color: '#475569' }}>
                    {item.branchName || 'Không xác định'}
                  </td>

                  {/* NCC / Diễn giải */}
                  <td className="so-list-td">
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.vendorName}</div>
                    {item.note && (
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: '#94a3b8',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.note}
                      >
                        {item.note}
                      </div>
                    )}
                  </td>

                  {/* Hạn thanh toán */}
                  <td className="so-list-td" style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {item.dueDate
                      ? (/^\d{4}-\d{2}-\d{2}/.test(item.dueDate)
                          ? item.dueDate.slice(0, 10).split('-').reverse().join('/')
                          : item.dueDate)
                      : '—'}
                  </td>

                  {/* Số tiền */}
                  <td className="so-list-td" style={{ fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>
                    {formatMoney(item.amount)}
                  </td>

                  {/* Trạng thái */}
                  <td className="so-list-td" style={{ textAlign: 'left' }}>
                    <ExpenseStatusBadge status={item.status} dueDate={item.dueDate} approvalStatus={item.approvalStatus} />
                  </td>

                  {/* Thao tác */}
                  <td className="so-list-td" style={{ textAlign: 'right', paddingRight: '14px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', position: 'relative' }}>
                      {item.attachedBillUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onViewBill(
                              item.attachedBillUrl!,
                              `Chứng từ ${item.expenseId}`
                            )
                          }
                          title="Xem hóa đơn đính kèm"
                          className="po-btn po-btn-secondary"
                          style={{ height: 28, padding: '0 8px', fontSize: 11.5 }}
                        >
                          <EyeIcon size={12} color="currentColor" />
                          <span>Hóa đơn</span>
                        </button>
                      )}

                      {item.status === 'Pending' && canManageExpenses && (
                        <button
                          type="button"
                          onClick={() => onPay(item)}
                          title="Chi tiền thanh toán khoản này"
                          className="po-btn po-btn-primary"
                          style={{
                            height: 28,
                            padding: '0 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: '#0f766e',
                          }}
                        >
                          <span>Chi tiền</span>
                        </button>
                      )}

                      {item.status === 'Paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetSearch = item.voucherCode || item.invoiceNumber || item.expenseId;
                            navigate('/store-owner/cashbook?search=' + encodeURIComponent(targetSearch));
                          }}
                          title="Xem phiếu chi dòng tiền trong Sổ quỹ Cashbook"
                          className="po-btn po-btn-secondary"
                          style={{
                            height: 28,
                            padding: '0 8px',
                            fontSize: 11.5,
                            backgroundColor: '#f0fdfa',
                            borderColor: '#ccfbf1',
                            color: '#0f766e',
                            fontWeight: 600,
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Sổ quỹ</span>
                        </button>
                      )}

                      {/* Danger / lifecycle actions (Approve, Reject, Cancel/Reverse) in ⋯ menu */}
                      {(item.status === 'Pending' || item.status === 'Paid') && canManageExpenses && (
                        <div className="expense-row-menu" style={{ position: 'relative' }}>
                          <button
                            type="button"
                            aria-expanded={openMenu?.id === item.expenseId}
                            onClick={(event) => setOpenMenu(openMenu?.id === item.expenseId
                              ? null : { id: item.expenseId, anchor: event.currentTarget })}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#64748b',
                            }}
                            title={item.status === 'Paid' ? 'Thao tác phiếu đã chi' : 'Tùy chọn khác'}
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {openMenu?.id === item.expenseId && menuAnchor && createPortal(
                            <div className="expense-row-menu"
                              style={{
                                position: 'fixed',
                                right: Math.max(8, window.innerWidth - menuAnchor.right),
                                ...(window.innerHeight - menuAnchor.bottom >= 140
                                  ? { top: menuAnchor.bottom + 4 }
                                  : { bottom: window.innerHeight - menuAnchor.top + 4 }),
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 30,
                                minWidth: '170px',
                                padding: '4px',
                              }}
                            >
                              {item.status === 'Pending' && item.approvalStatus !== 'Approved' && onApprove && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    onApprove(item);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#0f766e',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    borderRadius: '4px',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdfa')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <CheckCircleIcon size={12} color="#0f766e" />
                                  <span>Phê duyệt</span>
                                </button>
                              )}

                              {item.status === 'Pending' && item.approvalStatus !== 'Approved' && onReject && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    onReject(item);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#c2410c',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    borderRadius: '4px',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fff7ed')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <CloseIcon size={12} color="#c2410c" />
                                  <span>Từ chối duyệt</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  onCancel(item);
                                }}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#b91c1c',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  borderRadius: '4px',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <CloseIcon size={12} color="#b91c1c" />
                                <span>{item.status === 'Paid' ? 'Đảo bút toán / Hủy' : 'Hủy khoản chi'}</span>
                              </button>
                            </div>, document.body
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pinned Pagination Footer ── */}
      {totalItems > 0 && (
        <TablePagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={totalItems}
          itemLabel="khoản chi"
          pageSizeOptions={[10, 20, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default ExpenseTable;


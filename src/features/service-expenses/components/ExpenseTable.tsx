import { useState } from 'react';
import type { FC } from 'react';
import {
  EyeIcon,
  CloseIcon,
  AuditIcon,
} from '../../admin/components';
import { TablePagination } from '../../../components/common';
import {
  EXPENSE_CATEGORY_LABELS,
  type ServiceExpenseDto,
} from '../types/expense.types';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';
import { formatMoney } from '../../finance/utils/formatters';
import { MoreHorizontal } from 'lucide-react';

export interface ExpenseTableProps {
  data?: ServiceExpenseDto[];
  isLoading?: boolean;
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  onViewBill: (url: string, title: string) => void;
  onPay: (item: ServiceExpenseDto) => void;
  onCancel: (item: ServiceExpenseDto) => void;
}

export const ExpenseTable: FC<ExpenseTableProps> = ({
  data = [],
  isLoading = false,
  totalItems = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onViewBill,
  onPay,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.expenseId));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="expense-table-container" style={{ padding: '24px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="skeleton-line"
            style={{ height: '36px', marginBottom: '12px' }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="expense-table-container"
        style={{ padding: '64px 24px', textAlign: 'center' }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            background: 'var(--brand-50, #F0FDFA)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--brand-700, #115E59)',
          }}
        >
          <AuditIcon size={28} color="#115E59" />
        </div>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-main, #111827)',
            margin: '0 0 8px',
          }}
        >
          Không có khoản phải trả nào
        </h4>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
          Bấm "+ Ghi nhận chi phí" để thêm hóa đơn phụ tùng hoặc chi phí mới.
        </p>
      </div>
    );
  }

  return (
    <div className="expense-table-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="expense-table">
          <thead>
            <tr>
              <th style={{ width: 32, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Mã phiếu chi</th>
              <th>Danh mục chi phí</th>
              <th>Chi nhánh</th>
              <th>Nhà cung cấp / Diễn giải</th>
              <th>Hạn thanh toán</th>
              <th style={{ textAlign: 'right' }}>Số tiền (VNĐ)</th>
              <th style={{ textAlign: 'left' }}>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.expenseId}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.expenseId)}
                    onChange={() => toggleSelectOne(item.expenseId)}
                  />
                </td>
                <td className="expense-table-id">
                  <span className="mono-badge">{item.expenseId}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="expense-table-category">
                      {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.isRecurring && (
                      <span
                        className="badge-recurring"
                        title={'Chi phí lặp lại định kỳ hàng tháng (ngày ' + (item.recurringDayOfMonth || 1) + ')'}
                      >
                        Định kỳ
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: '#475569' }}>
                  {item.branchName || item.branchId}
                </td>
                <td>
                  <div className="expense-table-vendor" style={{ fontWeight: 600 }}>{item.vendorName}</div>
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
                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {item.dueDate}
                </td>
                <td className="expense-table-amount" style={{ fontWeight: 800, textAlign: 'right' }}>
                  {formatMoney(item.amount)}
                </td>
                <td style={{ textAlign: 'left' }}>
                  <ExpenseStatusBadge status={item.status} dueDate={item.dueDate} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', position: 'relative' }}>
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
                        className="admin-table-btn"
                      >
                        <EyeIcon size={12} color="currentColor" />
                        <span>Hóa đơn</span>
                      </button>
                    )}

                    {item.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => onPay(item)}
                        title="Chi tiền thanh toán khoản này"
                        style={{
                          background: 'var(--brand-700, #115E59)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <span>Chi tiền</span>
                      </button>
                    )}

                    {/* Poka-yoke: Danger action (Cancel) hidden in ⋯ menu */}
                    {item.status === 'Pending' && (
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === item.expenseId ? null : item.expenseId)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#64748B',
                          }}
                          title="Tùy chọn khác"
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {openMenuId === item.expenseId && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: 4,
                              background: '#ffffff',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 20,
                              minWidth: '140px',
                              padding: '4px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onCancel(item);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger-700, #B91C1C)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <CloseIcon size={12} color="#B91C1C" />
                              <span>Hủy khoản chi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <TablePagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

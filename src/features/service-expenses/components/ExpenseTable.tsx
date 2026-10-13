import type { FC } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CloseIcon,
  AuditIcon,
} from '../../admin/components';
import {
  EXPENSE_CATEGORY_LABELS,
  type ServiceExpenseDto,
} from '../types/expense.types';
import { ExpenseStatusBadge } from './ExpenseStatusBadge';

interface ExpenseTableProps {
  data?: ServiceExpenseDto[];
  isLoading?: boolean;
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onViewBill: (url: string, title: string) => void;
  onPay: (item: ServiceExpenseDto) => void;
  onCancel: (item: ServiceExpenseDto) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const ExpenseTable: FC<ExpenseTableProps> = ({
  data = [],
  isLoading = false,
  totalItems = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onViewBill,
  onPay,
  onCancel,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

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
            background: 'var(--blue-light, #f0f6ff)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--blue-primary, #0066ff)',
          }}
        >
          <AuditIcon size={28} color="#0066ff" />
        </div>
        <h4
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: 'var(--text-main, #111827)',
            margin: '0 0 6px 0',
          }}
        >
          Chưa có khoản chi phí nào phù hợp
        </h4>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted, #4b5563)',
            maxWidth: '400px',
            margin: '0 auto',
          }}
        >
          Không tìm thấy dữ liệu khớp với bộ lọc tìm kiếm hiện tại. Thử thay đổi bộ
          lọc hoặc ghi nhận khoản chi mới.
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
              <th style={{ width: '15%' }}>Mã & Ngày</th>
              <th style={{ width: '13%' }}>Danh mục</th>
              <th style={{ width: '15%' }}>Chi nhánh</th>
              <th style={{ width: '21%' }}>Nhà cung cấp / Nội dung</th>
              <th style={{ width: '11%' }}>Hạn thanh toán</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Số tiền</th>
              <th style={{ width: '13%', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.expenseId}>
                <td>
                  <div className="expense-table-code">{item.expenseId}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    {item.expenseDate}
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                  </span>
                </td>
                <td style={{ color: '#475569' }}>
                  {item.branchName || item.branchId}
                </td>
                <td>
                  <div className="expense-table-vendor">{item.vendorName}</div>
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
                <td className="expense-table-amount">
                  {formatCurrency(item.amount)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <ExpenseStatusBadge status={item.status} dueDate={item.dueDate} />
                </td>
                <td>
                  <div className="table-action-group" style={{ justifyContent: 'flex-end' }}>
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
                        className="action-icon-btn"
                      >
                        <EyeIcon size={14} color="currentColor" />
                      </button>
                    )}

                    {item.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onPay(item)}
                          className="action-btn-pay"
                          title="Xác nhận thanh toán khoản chi này"
                        >
                          Thanh toán
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancel(item)}
                          title="Hủy khoản chi"
                          className="action-icon-btn danger"
                        >
                          <CloseIcon size={13} color="currentColor" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="expense-pagination">
        <div>
          Hiển thị{' '}
          <strong>
            {Math.min(totalItems, (page - 1) * pageSize + 1)} -{' '}
            {Math.min(totalItems, page * pageSize)}
          </strong>{' '}
          trên tổng số <strong>{totalItems}</strong> khoản chi
        </div>
        <div className="expense-page-btns">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="page-btn"
          >
            <ChevronLeftIcon size={14} color="currentColor" />
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0 8px' }}>
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="page-btn"
          >
            <ChevronRightIcon size={14} color="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

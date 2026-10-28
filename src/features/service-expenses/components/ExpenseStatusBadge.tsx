import type { FC } from 'react';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  CloseIcon,
} from '../../admin/components';
import type { ExpenseStatus } from '../types/expense.types';
import { calculateDaysOverdue } from '../../finance/services/financeClock';

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  dueDate?: string;
}

export const ExpenseStatusBadge: FC<ExpenseStatusBadgeProps> = ({
  status,
  dueDate,
}) => {
  if (status === 'Paid') {
    return (
      <span className="expense-badge badge-paid">
        <CheckCircleIcon size={13} color="#047857" />
        Đã thanh toán
      </span>
    );
  }

  if (status === 'Cancelled') {
    return (
      <span className="expense-badge badge-cancelled">
        <CloseIcon size={12} color="#64748b" />
        Đã hủy
      </span>
    );
  }

  const overdueDays = dueDate ? calculateDaysOverdue(dueDate) : 0;

  if (overdueDays > 0) {
    return (
      <span
        className="expense-badge badge-overdue"
        style={{
          background: 'var(--danger-50, #FEF2F2)',
          color: 'var(--danger-700, #B91C1C)',
          borderColor: 'var(--danger-200, #FECACA)',
          fontWeight: 700,
        }}
      >
        <AlertTriangleIcon size={13} color="#B91C1C" />
        Quá hạn {overdueDays} ngày
      </span>
    );
  }

  if (overdueDays === 0 && dueDate) {
    return (
      <span
        className="expense-badge"
        style={{
          background: '#FFFBEB',
          color: '#B45309',
          borderColor: '#FDE68A',
          fontWeight: 700,
        }}
      >
        <ClockIcon size={13} color="#B45309" />
        Hạn hôm nay
      </span>
    );
  }

  return (
    <span className="expense-badge badge-pending">
      <ClockIcon size={13} color="#b45309" />
      {dueDate ? `Còn ${Math.abs(overdueDays)} ngày` : 'Chờ thanh toán'}
    </span>
  );
};

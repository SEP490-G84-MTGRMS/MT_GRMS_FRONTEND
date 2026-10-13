import type { FC } from 'react';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  CloseIcon,
} from '../../admin/components';
import type { ExpenseStatus } from '../types/expense.types';

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  dueDate?: string;
}

export const ExpenseStatusBadge: FC<ExpenseStatusBadgeProps> = ({
  status,
  dueDate,
}) => {
  const isOverdue =
    status === 'Pending' && dueDate ? new Date(dueDate) < new Date('2026-10-12') : false;

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

  if (isOverdue) {
    return (
      <span className="expense-badge badge-overdue">
        <AlertTriangleIcon size={13} color="#b91c1c" />
        Quá hạn trả
      </span>
    );
  }

  return (
    <span className="expense-badge badge-pending">
      <ClockIcon size={13} color="#b45309" />
      Chờ thanh toán
    </span>
  );
};

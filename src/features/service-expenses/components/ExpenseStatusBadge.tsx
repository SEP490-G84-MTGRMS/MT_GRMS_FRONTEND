import type { FC } from 'react';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  CloseIcon,
} from '../../admin/components';
import type { ExpenseStatus } from '../types/expense.types';

/**
 * Tính toán chênh lệch ngày so với hạn thanh toán theo thời gian thực tế hệ thống (new Date()),
 * loại bỏ hoàn toàn việc phụ thuộc vào đồng hồ demo đóng băng (frozen clock).
 * > 0: Quá hạn X ngày
 * = 0: Hạn hôm nay
 * < 0: Còn |X| ngày đến hạn
 */
const calculateRealDaysDiff = (dueDate: string | Date): number => {
  const now = new Date();
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const diffTime = utcNow - utcDue;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

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

  const daysDiff = dueDate ? calculateRealDaysDiff(dueDate) : 0;

  if (daysDiff > 0) {
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
        Quá hạn {daysDiff} ngày
      </span>
    );
  }

  if (daysDiff === 0 && dueDate) {
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
      {dueDate ? `Còn ${Math.abs(daysDiff)} ngày` : 'Chờ thanh toán'}
    </span>
  );
};

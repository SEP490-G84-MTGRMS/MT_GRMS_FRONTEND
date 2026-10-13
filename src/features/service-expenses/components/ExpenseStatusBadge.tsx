import type { FC } from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
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
      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Đã thanh toán
      </span>
    );
  }

  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
        <XCircle className="w-3.5 h-3.5" />
        Đã hủy
      </span>
    );
  }

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5" />
        Quá hạn trả
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5" />
      Chờ thanh toán
    </span>
  );
};

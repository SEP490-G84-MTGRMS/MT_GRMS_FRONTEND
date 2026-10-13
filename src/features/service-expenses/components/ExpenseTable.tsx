import type { FC } from 'react';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileX,
  ReceiptText,
} from 'lucide-react';
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
      <div className="bg-white border border-gray-100 rounded-[24px] shadow-sm overflow-hidden p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[24px] shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 text-[#0066ff] rounded-full flex items-center justify-center mx-auto mb-4">
          <ReceiptText className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-gray-800">
          Chưa có khoản chi phí nào phù hợp
        </h4>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Không tìm thấy dữ liệu khớp với bộ lọc tìm kiếm hiện tại. Thử thay đổi
          bộ lọc hoặc ghi nhận chi phí mới.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7faff] text-gray-600 font-semibold border-b border-gray-100">
            <tr>
              <th className="py-4 px-5">Mã & Ngày</th>
              <th className="py-4 px-4">Danh mục</th>
              <th className="py-4 px-4">Chi nhánh</th>
              <th className="py-4 px-4">Nhà cung cấp</th>
              <th className="py-4 px-4">Hạn thanh toán</th>
              <th className="py-4 px-4 text-right">Số tiền</th>
              <th className="py-4 px-4 text-center">Trạng thái</th>
              <th className="py-4 px-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.expenseId}
                className="hover:bg-blue-50/40 transition-colors"
              >
                <td className="py-3.5 px-5">
                  <div className="font-semibold text-gray-900">
                    {item.expenseId}
                  </div>
                  <div className="text-xs text-gray-400">{item.expenseDate}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-medium text-gray-700">
                    {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-gray-600">
                  {item.branchName || item.branchId}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium text-gray-800 max-w-[200px] truncate">
                    {item.vendorName}
                  </div>
                  {item.note && (
                    <div className="text-xs text-gray-400 max-w-[200px] truncate">
                      {item.note}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-gray-600">{item.dueDate}</td>
                <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                  {formatCurrency(item.amount)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <ExpenseStatusBadge
                    status={item.status}
                    dueDate={item.dueDate}
                  />
                </td>
                <td className="py-3.5 px-5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
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
                        className="p-1.5 text-gray-500 hover:text-[#0066ff] hover:bg-blue-50 rounded-full transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {item.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onPay(item)}
                          className="px-3 py-1 text-xs font-medium text-white bg-[#0066ff] hover:bg-[#0052cc] rounded-full transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Banknote className="w-3 h-3" />
                          Thanh toán
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancel(item)}
                          title="Hủy khoản chi"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <FileX className="w-4 h-4" />
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
      <div className="py-3.5 px-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div>
          Hiển thị{' '}
          <span className="font-semibold text-gray-700">
            {Math.min(totalItems, (page - 1) * pageSize + 1)} -{' '}
            {Math.min(totalItems, page * pageSize)}
          </span>{' '}
          trên tổng số{' '}
          <span className="font-semibold text-gray-700">{totalItems}</span> khoản
          chi
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-gray-700">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

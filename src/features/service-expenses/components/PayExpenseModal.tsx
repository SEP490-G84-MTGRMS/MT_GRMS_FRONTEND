import { type FC, useState } from 'react';
import { Banknote, CheckCircle, Loader2, X } from 'lucide-react';
import {
  EXPENSE_CATEGORY_LABELS,
  type PayExpenseRequest,
  type ServiceExpenseDto,
} from '../types/expense.types';

interface PayExpenseModalProps {
  item: ServiceExpenseDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseId: string, data: PayExpenseRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const PayExpenseModal: FC<PayExpenseModalProps> = ({
  item,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'BankTransfer'>(
    'Cash'
  );
  const [createCashBookEntry, setCreateCashBookEntry] = useState(true);
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      await onSubmit(item.expenseId, {
        paymentMethod,
        createCashBookEntry,
        paymentDate,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Pay expense failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f7faff]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">
              Xác nhận thanh toán chi phí
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Mã chi phí:</span>
              <span className="font-semibold text-gray-700">{item.expenseId}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Danh mục:</span>
              <span className="font-medium text-gray-700">
                {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Nhà cung cấp:</span>
              <span className="font-medium text-gray-700">{item.vendorName}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">
                Số tiền thanh toán:
              </span>
              <span className="text-xl font-extrabold text-[#0066ff]">
                {formatCurrency(item.amount)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Phương thức thanh toán <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2 px-3 text-sm font-medium rounded-full border transition-all ${
                  paymentMethod === 'Cash'
                    ? 'bg-blue-50 border-[#0066ff] text-[#0066ff]'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tiền mặt (Quỹ)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BankTransfer')}
                className={`py-2 px-3 text-sm font-medium rounded-full border transition-all ${
                  paymentMethod === 'BankTransfer'
                    ? 'bg-blue-50 border-[#0066ff] text-[#0066ff]'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Chuyển khoản NH
              </button>
            </div>
          </div>

          {/* Cashbook Integration Checkbox */}
          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="cashbook-check"
              checked={createCashBookEntry}
              onChange={(e) => setCreateCashBookEntry(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#0066ff] focus:ring-[#0066ff] border-gray-300"
            />
            <label
              htmlFor="cashbook-check"
              className="text-xs text-gray-700 cursor-pointer select-none"
            >
              <span className="font-semibold block text-gray-800">
                Tự động tạo phiếu chi trong Sổ quỹ (FE-17)
              </span>
              Hạch toán ngay số tiền này vào dòng tiền chi nhánh để bảo đảm tính
              chính xác của báo cáo tài chính.
            </label>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ngày ghi nhận thanh toán
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ghi chú thanh toán
            </label>
            <input
              type="text"
              placeholder="VD: Đã chi tiền mặt từ két ca sáng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-[#0066ff] hover:bg-[#0052cc] rounded-full transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Xác nhận thanh toán</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

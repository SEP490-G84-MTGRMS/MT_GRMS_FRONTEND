import { type FC, useState } from 'react';
import { Loader2, PlusCircle, X } from 'lucide-react';
import {
  EXPENSE_CATEGORY_LABELS,
  type CreateExpenseRequest,
  type ExpenseCategory,
  createExpenseSchema,
} from '../types/expense.types';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export const CreateExpenseModal: FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => ({
    branchId: 'BR-01',
    category: 'Electricity' as ExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    vendorName: '',
    attachedBillUrl: '',
    note: '',
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(formData.amount);
    const result = createExpenseSchema.safeParse({
      ...formData,
      amount: parsedAmount,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit({
        branchId: formData.branchId,
        category: formData.category,
        amount: parsedAmount,
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate,
        vendorName: formData.vendorName.trim(),
        attachedBillUrl: formData.attachedBillUrl.trim() || undefined,
        note: formData.note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Submit expense failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f7faff]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-50 text-[#0066ff]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">
              Ghi nhận chi phí vận hành mới
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Branch & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Chi nhánh áp dụng <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => handleChange('branchId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
              >
                <option value="BR-01">Quận 1 (Trụ sở)</option>
                <option value="BR-02">Bình Thạnh</option>
                <option value="BR-03">Thủ Đức</option>
              </select>
              {errors.branchId && (
                <p className="text-xs text-red-500 mt-1">{errors.branchId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Danh mục chi phí <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
              >
                {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {EXPENSE_CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category}</p>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Số tiền chi phí (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="VD: 1500000"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ngày phát sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => handleChange('expenseDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
              />
              {errors.expenseDate && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.expenseDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Hạn thanh toán <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
              />
              {errors.dueDate && (
                <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nhà cung cấp / Đơn vị cung ứng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Điện lực TP.HCM, SAWACO, VNPT..."
              value={formData.vendorName}
              onChange={(e) => handleChange('vendorName', e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
            />
            {errors.vendorName && (
              <p className="text-xs text-red-500 mt-1">{errors.vendorName}</p>
            )}
          </div>

          {/* Bill URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Link ảnh chứng từ / Hóa đơn đính kèm
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.attachedBillUrl}
              onChange={(e) => handleChange('attachedBillUrl', e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff]"
            />
            {errors.attachedBillUrl && (
              <p className="text-xs text-red-500 mt-1">
                {errors.attachedBillUrl}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú chi tiết cho khoản chi này..."
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
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
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu chi phí</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

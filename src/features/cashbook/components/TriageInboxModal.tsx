import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { X, Inbox, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import type { TriageItem } from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { formatMoney } from '../../finance/utils/formatters';

interface TriageInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  onSuccess: (message: string) => void;
}

export const TriageInboxModal: FC<TriageInboxModalProps> = ({
  isOpen,
  onClose,
  branchId,
  onSuccess,
}) => {
  const [items, setItems] = useState<TriageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);

  // Resolution form state (Backend FinancialNature: 1 = OperatingExpense, 5 = OwnerDraw)
  const [nature, setNature] = useState<number>(1);
  const [isTaxDeductible, setIsTaxDeductible] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTriageItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await cashbookService.getPendingTriage(branchId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load triage inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (isOpen) {
      loadTriageItems();
      setSelectedItem(null);
      setError(null);
    }
  }, [isOpen, loadTriageItems]);

  const handleSelectItem = (item: TriageItem) => {
    setSelectedItem(item);
    setCategory(item.category || 'Chi phí vận hành');
    setNature(1); // Default FinancialNature.OperatingExpense = 1
    setIsTaxDeductible(false);
    setResolutionNote(`Chủ cửa hàng duyệt mục ${item.voucherCode}`);
    setError(null);
  };

  const handleResolve = async () => {
    if (!selectedItem) return;
    if (!resolutionNote.trim()) {
      setError('Bắt buộc phải nhập ghi chú giải trình khi phê duyệt.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await cashbookService.resolveTriage(selectedItem.id, {
        nature,
        isTaxDeductible,
        category: category.trim(),
        resolutionNote: resolutionNote.trim(),
      });

      onSuccess(`Đã xử lý và phân loại thành công mục ${selectedItem.voucherCode}`);
      setSelectedItem(null);
      await loadTriageItems();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi khi xử lý mục trong Triage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 font-finance">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Inbox size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Triage Inbox · Xử lý các khoản cần Chủ duyệt
              </h3>
              <p className="text-xs text-gray-500">
                Bao gồm các khoản chi vượt trần ca 500k, chi mục không rõ, chờ phân loại chính thức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading && (
            <div className="py-12 text-center text-gray-400 text-sm">
              Đang tải danh sách chờ xử lý...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
              <ShieldCheck className="mx-auto text-emerald-500" size={36} />
              <p className="font-bold text-gray-800 text-sm">Triage Inbox trống!</p>
              <p className="text-xs text-gray-400">
                Không có khoản chi nào bị treo hoặc vượt hạn mức cần chủ duyệt.
              </p>
            </div>
          )}

          {/* Selected Item Resolution Box */}
          {selectedItem && (
            <div className="p-5 rounded-2xl border-2 border-amber-500 bg-amber-50/40 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Phê duyệt phân loại mục
                  </span>
                  <h4 className="text-base font-bold text-gray-900 mt-1">
                    {selectedItem.voucherCode} · {formatMoney(selectedItem.amount)}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Người nhận: {selectedItem.beneficiaryName} · Lý do cờ: {selectedItem.suspiciousReason || 'Chờ phân loại'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Đóng
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-amber-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    1. Chọn bản chất tài chính chính thức *
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setNature(1);
                        setIsTaxDeductible(true);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        nature === 1
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      🏢 Chi phí vận hành (OPEX)
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        Tính vào chi phí trừ thuế P&L
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNature(5);
                        setIsTaxDeductible(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        nature === 5
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      👤 Vốn chủ sở hữu (Rút vốn)
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        0% thuế & 0% chi phí P&L
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    2. Hạng mục chi phí *
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    3. Ghi chú giải trình của Chủ *
                  </label>
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="VD: Chủ đồng ý duyệt chi khẩn cấp..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  {isSubmitting ? 'Đang duyệt...' : '✅ Phê duyệt & Phân loại chính thức'}
                </button>
              </div>
            </div>
          )}

          {/* List of triage items */}
          {!isLoading && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-amber-500 bg-amber-50/30 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{item.voucherCode}</span>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium mt-1">
                        Người nhận: {item.beneficiaryName} · Hạng mục tạm: {item.category}
                      </p>
                      {item.suspiciousReason && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                          <AlertTriangle size={14} className="shrink-0" />
                          {item.suspiciousReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-gray-900 block">
                        {formatMoney(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                      >
                        ⚡ Xử lý ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

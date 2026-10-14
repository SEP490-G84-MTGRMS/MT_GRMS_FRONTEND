import { useState } from 'react';
import type { FC } from 'react';
import { X, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTaxSnapshotPreview } from '../hooks/useTaxSnapshotPreview';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { year: number; quarter: number; note?: string; asFinalized?: boolean }) => Promise<void>;
}

const DEFAULT_YEAR = new Date().getFullYear();
const DEFAULT_QUARTER = Math.floor((new Date().getMonth() + 3) / 3);

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const CreateTaxSnapshotModal: FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  const [quarter, setQuarter] = useState<number>(DEFAULT_QUARTER);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: preview, isLoading: isPreviewLoading } = useTaxSnapshotPreview(year, quarter, isOpen);

  if (!isOpen) return null;

  const handleSave = async (asFinalized: boolean) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ year, quarter, note, asFinalized });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Tạo kỳ tính thuế mới</h3>
              <p className="text-xs text-gray-500">Chốt doanh thu và tính thuế Quý theo Thông tư 40/2021</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Select Year & Quarter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Năm tính thuế</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                {[DEFAULT_YEAR, DEFAULT_YEAR - 1, DEFAULT_YEAR - 2].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Quý kê khai</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                <option value={1}>Quý 1 (Tháng 1 - 3)</option>
                <option value={2}>Quý 2 (Tháng 4 - 6)</option>
                <option value={3}>Quý 3 (Tháng 7 - 9)</option>
                <option value={4}>Quý 4 (Tháng 10 - 12)</option>
              </select>
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-teal-50/40 rounded-2xl p-4 border border-teal-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-teal-900 uppercase tracking-wider">
                Kết quả tính toán xem trước
              </span>
              {isPreviewLoading ? (
                <span className="text-xs text-teal-600 animate-pulse">Đang quét đơn hàng POS...</span>
              ) : (
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Khớp số liệu POS
                </span>
              )}
            </div>

            {preview?.warningMessage && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{preview.warningMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                <div className="text-xs text-gray-500">Doanh thu chịu thuế</div>
                <div className="text-base font-bold text-gray-900 mt-0.5">
                  {formatVND(preview?.taxableRevenue || 0)}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Tổng từ {preview?.ordersCount || 0} đơn hàng Paid
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                <div className="text-xs text-gray-500">Tổng thuế phải nộp (1.5%)</div>
                <div className="text-base font-bold text-teal-700 mt-0.5">
                  {formatVND(preview?.totalTaxAmount || 0)}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  VAT: {formatVND(preview?.vatAmount || 0)} (1%) + PIT: {formatVND(preview?.pitAmount || 0)} (0.5%)
                </div>
              </div>
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Ghi chú kỳ thuế</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Số liệu doanh thu quý đã đối chiếu với sổ quỹ tiền mặt..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/75 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-pill"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isSubmitting || !preview?.canCreate}
            onClick={() => handleSave(false)}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-full shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={isSubmitting || !preview?.canCreate}
            onClick={() => handleSave(true)}
            className="btn-primary-pill disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Chốt số liệu ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

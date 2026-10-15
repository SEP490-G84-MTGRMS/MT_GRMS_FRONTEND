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
    <div className="tax-modal-backdrop" onClick={onClose}>
      <div className="tax-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tax-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(15, 118, 110, 0.1)', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Tạo kỳ tính thuế mới
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Chốt doanh thu & tính thuế theo Thông tư 40/2021/TT-BTC
              </p>
            </div>
          </div>
          <button onClick={onClose} className="tax-drawer-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="tax-modal-body">
          {/* Select Year & Quarter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="tax-form-group">
              <label className="tax-form-label">Năm tính thuế</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="tax-form-select"
              >
                {[DEFAULT_YEAR, DEFAULT_YEAR - 1, DEFAULT_YEAR - 2].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="tax-form-group">
              <label className="tax-form-label">Quý kê khai</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="tax-form-select"
              >
                <option value={1}>Quý 1 (Tháng 1 - 3)</option>
                <option value={2}>Quý 2 (Tháng 4 - 6)</option>
                <option value={3}>Quý 3 (Tháng 7 - 9)</option>
                <option value={4}>Quý 4 (Tháng 10 - 12)</option>
              </select>
            </div>
          </div>

          {/* Preview Calculation Box */}
          <div className="tax-info-box-teal" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kết quả tính toán xem trước
              </span>
              {isPreviewLoading ? (
                <span style={{ fontSize: '0.76rem', color: '#0F766E', fontStyle: 'italic' }}>
                  Đang quét đơn hàng POS...
                </span>
              ) : (
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> Khớp số liệu POS
                </span>
              )}
            </div>

            {preview?.warningMessage && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                <span>{preview.warningMessage}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 12, border: '1px solid #CCFBF1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Doanh thu chịu thuế</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {formatVND(preview?.taxableRevenue || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                  Từ {preview?.ordersCount || 0} đơn hàng Paid
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 12, border: '1px solid #CCFBF1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Tổng thuế phải nộp (1.5%)</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F766E', marginTop: 2 }}>
                  {formatVND(preview?.totalTaxAmount || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                  VAT 1% + PIT 0.5%
                </div>
              </div>
            </div>
          </div>

          {/* Note Input */}
          <div className="tax-form-group">
            <label className="tax-form-label">Ghi chú kỳ thuế</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Số liệu doanh thu quý đã đối chiếu với sổ quỹ tiền mặt..."
              className="tax-form-textarea"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="tax-modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary-pill">
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isSubmitting || !preview?.canCreate}
            onClick={() => handleSave(false)}
            className="btn-secondary-pill"
            style={{ border: '1px solid #CBD5E1' }}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={isSubmitting || !preview?.canCreate}
            onClick={() => handleSave(true)}
            className="btn-primary-pill"
          >
            {isSubmitting ? 'Đang lưu...' : 'Chốt số liệu ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

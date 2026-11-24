import { useState, type FC } from 'react';
import { X, PlusCircle } from 'lucide-react';
import type { VoucherBatchItem } from '../../types/promotion.types';

interface GenerateCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: VoucherBatchItem | null;
  onGenerate: (batchId: string, quantity: number) => Promise<void> | void;
}

export const GenerateCodesModal: FC<GenerateCodesModalProps> = ({
  isOpen,
  onClose,
  batch,
  onGenerate,
}) => {
  const [qty, setQty] = useState(20);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(qty) || qty < 1 || qty > 10000) {
      setErrorMsg('Số lượng mã phải là số nguyên từ 1 đến 10.000.');
      return;
    }
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await onGenerate(batch.id, qty);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          'Không thể sinh thêm mã voucher.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="promo-modal-overlay">
      <div className="promo-modal-dialog" style={{ maxWidth: 480 }}>
        <div className="promo-modal-header">
          <h3>
            <PlusCircle className="w-5 h-5 text-teal-700" />
            <span>Phát hành thêm mã Voucher</span>
          </h3>
          <button onClick={onClose} className="promo-modal-close" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="promo-modal-body">
            <div className="promo-info-alert">
              <div>Đợt phát hành: <strong>{batch.name}</strong></div>
              <div>Mã đợt: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{batch.batchCode}</span> | Tiền tố: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{batch.prefix}</span></div>
              <div>Đã phát hành: <strong>{batch.totalQuantity}</strong> mã (Đã dùng: {batch.usedQuantity})</div>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Số lượng mã muốn tạo thêm</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                min={1}
                max={10000}
                className="form-input font-bold text-center text-lg"
                required
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Hệ thống sẽ tự động ghép tiền tố {batch.prefix} cùng chuỗi ngẫu nhiên bảo mật không trùng lặp.
              </span>
              {errorMsg && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          </div>

          <div className="promo-modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary-pill" disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn-primary-pill" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo mã...' : 'Xác nhận tạo thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import { useState, type FC } from 'react';
import { X, PlusCircle } from 'lucide-react';
import type { VoucherBatchItem, VoucherCodeItem } from '../../types/promotion.types';

interface GenerateCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: VoucherBatchItem | null;
  onGenerate: (batchId: string, additionalCodes: VoucherCodeItem[]) => void;
}

export const GenerateCodesModal: FC<GenerateCodesModalProps> = ({
  isOpen,
  onClose,
  batch,
  onGenerate,
}) => {
  const [qty, setQty] = useState(20);

  if (!isOpen || !batch) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) return;

    const newCodes: VoucherCodeItem[] = Array.from({ length: Math.min(qty, 5) }).map((_, i) => ({
      id: `gen-code-${Date.now()}-${i}`,
      code: `${batch.prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(10 + Math.random() * 89)}`,
      status: 'UNUSED',
      createdAt: new Date().toISOString().slice(0, 10),
    }));

    onGenerate(batch.id, newCodes);
    onClose();
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
                max={500}
                className="form-input font-bold text-center text-lg"
                required
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Hệ thống sẽ tự động ghép tiền tố {batch.prefix} cùng chuỗi ngẫu nhiên bảo mật không trùng lặp.
              </span>
            </div>
          </div>

          <div className="promo-modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary-pill">
              Hủy
            </button>
            <button type="submit" className="btn-primary-pill">
              Xác nhận tạo thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

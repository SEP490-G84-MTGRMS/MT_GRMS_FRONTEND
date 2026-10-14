import { useState, useEffect, type FC } from 'react';
import { X, Ticket } from 'lucide-react';
import type {
  VoucherBatchItem,
  VoucherDiscountType,
  VoucherCodeItem,
} from '../../types/promotion.types';

interface VoucherBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batch: VoucherBatchItem) => void;
  editingBatch?: VoucherBatchItem | null;
}

export const VoucherBatchModal: FC<VoucherBatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBatch,
}) => {
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [prefix, setPrefix] = useState('VOUCHER');
  const [discountType, setDiscountType] = useState<VoucherDiscountType>('FIXED_AMOUNT');
  const [discountValue, setDiscountValue] = useState(20000);
  const [minOrderValue, setMinOrderValue] = useState(150000);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(undefined);
  const [totalQuantity, setTotalQuantity] = useState(50);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingBatch) {
      setName(editingBatch.name);
      setBatchCode(editingBatch.batchCode);
      setPrefix(editingBatch.prefix);
      setDiscountType(editingBatch.discountType);
      setDiscountValue(editingBatch.discountValue);
      setMinOrderValue(editingBatch.minOrderValue);
      setMaxDiscount(editingBatch.maxDiscount);
      setTotalQuantity(editingBatch.totalQuantity);
      setStartDate(editingBatch.startDate);
      setEndDate(editingBatch.endDate);
      setDescription(editingBatch.description || '');
    } else {
      setName('');
      setBatchCode('');
      setPrefix('VOUCHER');
      setDiscountType('FIXED_AMOUNT');
      setDiscountValue(20000);
      setMinOrderValue(150000);
      setMaxDiscount(undefined);
      setTotalQuantity(50);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setDescription('');
    }
  }, [editingBatch, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên đợt voucher!');
      return;
    }

    if (editingBatch) {
      const updatedBatch: VoucherBatchItem = {
        ...editingBatch,
        name: name.trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        totalQuantity: Number(totalQuantity),
        startDate,
        endDate,
        description: description.trim(),
      };
      onSave(updatedBatch);
      onClose();
      return;
    }

    const effectiveBatchCode =
      batchCode.trim() ||
      `DOT-${prefix.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Generate sample codes based on initial quantity (up to 8 for UI mock preview)
    const initialCodesCount = Math.min(totalQuantity, 8);
    const codes: VoucherCodeItem[] = Array.from({ length: initialCodesCount }).map((_, i) => ({
      id: `code-${Date.now()}-${i}`,
      code: `${prefix.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${i + 1}`,
      status: 'UNUSED',
      createdAt: new Date().toISOString().slice(0, 10),
    }));

    const newBatch: VoucherBatchItem = {
      id: `batch-${Date.now()}`,
      batchCode: effectiveBatchCode,
      name: name.trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      totalQuantity: Number(totalQuantity),
      usedQuantity: 0,
      startDate,
      endDate,
      status: 'ACTIVE',
      prefix: prefix.toUpperCase().trim(),
      description: description.trim(),
      codes,
    };

    onSave(newBatch);
    onClose();
  };

  return (
    <div className="promo-modal-overlay">
      <div className="promo-modal-dialog">
        <div className="promo-modal-header">
          <h3>
            <Ticket className="w-5 h-5 text-teal-700" />
            <span>
              {editingBatch
                ? 'Chỉnh sửa đợt Voucher / Coupon'
                : 'Tạo mới đợt phát hành Voucher / Coupon'}
            </span>
          </h3>
          <button onClick={onClose} className="promo-modal-close" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="promo-modal-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Tên đợt Voucher</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Tri ân khách hàng tháng 10..."
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mã đợt (tùy chọn)</label>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  placeholder="Tự sinh nếu để trống"
                  className="form-input font-mono"
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label form-label-required">Tiền tố mã (Prefix)</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="VD: SALE, CHAO, VIP"
                  className="form-input font-mono font-bold"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Hình thức giảm</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as VoucherDiscountType)}
                  className="form-select-control"
                >
                  <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                  <option value="PERCENT">Phần trăm đơn hàng (%)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  {discountType === 'PERCENT' ? 'Tỷ lệ giảm (%)' : 'Giá trị giảm (VNĐ)'}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="form-input font-bold"
                  required
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label form-label-required">Đơn tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(Number(e.target.value))}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giảm tối đa (VNĐ)</label>
                <input
                  type="number"
                  value={maxDiscount || ''}
                  onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Không giới hạn"
                  className="form-input"
                  disabled={discountType !== 'PERCENT'}
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Số lượng mã cần tạo</label>
                <input
                  type="number"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(Number(e.target.value))}
                  min={1}
                  className="form-input font-bold"
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Ngày hết hạn</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú / Mục đích phát hành</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Voucher tặng qua Zalo OA nhân dịp sinh nhật cửa hàng..."
                rows={2}
                className="form-textarea"
              />
            </div>
          </div>

          <div className="promo-modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary-pill">
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary-pill">
              {editingBatch ? 'Lưu thay đổi' : 'Phát hành đợt Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

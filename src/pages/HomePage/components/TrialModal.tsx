import { useState } from 'react';
import type { FC, FormEvent } from 'react';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storeName: string) => void;
}

export const TrialModal: FC<TrialModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [storeName, setStoreName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerProvince, setOwnerProvince] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('goi-chuan');
  const [needImportHelp, setNeedImportHelp] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerPhone.trim()) return;

    onSuccess(storeName);
    onClose();
  };

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true">
      <div className="modal-dialog-box">
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          &times;
        </button>
        <div className="modal-head">
          <h3 className="modal-title">Đăng ký dùng thử MT-GRMS 14 ngày</h3>
          <p className="modal-sub">
            Không mất phí. Kỹ thuật viên hỗ trợ cài đặt và nạp hàng mẫu qua Zalo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label htmlFor="storeName" className="form-label">
              Tên Tiệm Tạp Hóa / Cửa Hàng <span className="req">*</span>
            </label>
            <input
              type="text"
              id="storeName"
              className="input-rounded"
              placeholder="VD: Tạp Hóa Bà Bảy, Bách Hóa Tân An..."
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="ownerPhone" className="form-label">
              Số Điện Thoại (Nhận tài khoản qua Zalo) <span className="req">*</span>
            </label>
            <input
              type="tel"
              id="ownerPhone"
              className="input-rounded"
              placeholder="VD: 0912 345 678"
              value={ownerPhone}
              onChange={e => setOwnerPhone(e.target.value)}
              pattern="[0-9]{10,11}"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="ownerProvince" className="form-label">
              Tỉnh / Thành Phố
            </label>
            <input
              type="text"
              id="ownerProvince"
              className="input-rounded"
              placeholder="VD: Hà Nội, TP.HCM, Nam Định..."
              value={ownerProvince}
              onChange={e => setOwnerProvince(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="selectedPlan" className="form-label">
              Gói muốn trải nghiệm
            </label>
            <select
              id="selectedPlan"
              className="input-rounded"
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
            >
              <option value="goi-chuan">
                Gói Bách Hóa Chuẩn (189k/tháng - Đầy đủ FEFO & VietQR)
              </option>
              <option value="goi-nho">Gói Tạp Hóa Nhỏ Gia Đình (99k/tháng)</option>
              <option value="goi-chuoi">Gói Chuỗi 2-3 Cửa Hàng (299k/tháng)</option>
            </select>
          </div>

          <div className="form-check-line">
            <input
              type="checkbox"
              id="needImportHelp"
              checked={needImportHelp}
              onChange={e => setNeedImportHelp(e.target.checked)}
            />
            <label htmlFor="needImportHelp">
              Nhờ đội ngũ MT-GRMS hỗ trợ nạp sẵn danh mục hàng hóa mẫu vào tiệm
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-pill btn-block btn-lg btn-glow">
            Kích hoạt tài khoản dùng thử
          </button>
        </form>
      </div>
    </div>
  );
};

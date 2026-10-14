import React, { useState } from 'react';
import type { AllowanceItem } from '../types';

interface CreateAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (allowance: AllowanceItem) => void;
}

export const CreateAllowanceModal: React.FC<CreateAllowanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Cố định hàng tháng');
  const [amount, setAmount] = useState<number>(200000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên loại phụ cấp!');
      return;
    }
    const newAllowance: AllowanceItem = {
      id: `al_${Date.now()}`,
      name: name.trim(),
      type,
      amount,
      enabled: true,
    };
    onSuccess(newAllowance);
    onClose();
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 500 }}>
        <div className="emp-modal-header">
          <h3>Thêm mới loại phụ cấp</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div className="emp-form-group">
              <label className="emp-form-label">
                Tên loại phụ cấp <span className="required">*</span>
              </label>
              <input
                type="text"
                className="emp-form-input"
                placeholder="VD: Phụ cấp thâm niên, Phụ cấp xăng xe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">Hình thức tính</label>
              <select
                className="emp-form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Cố định hàng tháng">Cố định hàng tháng</option>
                <option value="Theo ngày công thực tế">Theo ngày công thực tế</option>
                <option value="Theo giờ làm việc">Theo giờ làm việc</option>
              </select>
            </div>

            <div className="emp-form-group">
              <label className="emp-form-label">Mức phụ cấp mặc định (VNĐ)</label>
              <input
                type="number"
                step="10000"
                className="emp-form-input"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary">
              Lưu phụ cấp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

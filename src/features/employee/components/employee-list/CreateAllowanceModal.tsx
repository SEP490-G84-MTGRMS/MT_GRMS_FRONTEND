import React, { useState, useEffect, useMemo } from 'react';
import type { AllowanceItem } from '../../types';
import { normalizeVietnameseComparison } from '../../lib/vietnamTime';

interface CreateAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAllowances?: AllowanceItem[];
  onSuccess: (allowance: AllowanceItem) => void;
}

export const CreateAllowanceModal: React.FC<CreateAllowanceModalProps> = ({
  isOpen,
  onClose,
  existingAllowances = [],
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Cố định hàng tháng');
  const [amount, setAmount] = useState<number | ''>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('Cố định hàng tháng');
      setAmount('');
      setTouched({});
      setHasSubmitted(false);
    }
  }, [isOpen]);

  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return 'Tên loại phụ cấp không được để trống.';
    if (trimmed.length > 100) return 'Tên loại phụ cấp không vượt quá 100 ký tự.';
    const normalized = normalizeVietnameseComparison(trimmed);
    const duplicate = existingAllowances.find(
      (al) => normalizeVietnameseComparison(al.name) === normalized
    );
    if (duplicate) {
      return `Tên khoản phụ cấp "${trimmed}" bị trùng với "${duplicate.name}" đã có (so sánh không phân biệt dấu và hoa/thường).`;
    }
    return null;
  }, [name, existingAllowances]);

  const amountError = useMemo(() => {
    if (amount === '') return null;
    const num = Number(amount);
    if (isNaN(num) || num < 0) return 'Mức phụ cấp không được âm.';
    if (num > 500000000) return 'Mức phụ cấp không được vượt quá 500.000.000 đ.';
    return null;
  }, [amount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    if (nameError || amountError) {
      return;
    }
    const newAllowance: AllowanceItem = {
      id: `al_${Date.now()}`,
      name: name.trim(),
      type,
      amount: Number(amount) || 0,
      enabled: true,
    };
    onSuccess(newAllowance);
    onClose();
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card">
        <div className="emp-modal-header">
          <h3>Thêm mới loại phụ cấp</h3>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            <div className="emp-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="emp-form-label" style={{ marginBottom: 0 }}>
                  Tên loại phụ cấp <span className="required">*</span>
                </label>
                <span style={{ fontSize: 11, color: name.length > 100 ? '#EF4444' : '#94A3B8' }}>
                  {name.length}/100
                </span>
              </div>
              <input
                type="text"
                className="emp-form-input"
                placeholder="VD: Phụ cấp thâm niên, Phụ cấp xăng xe"
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!touched.name) setTouched((prev) => ({ ...prev, name: true }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                style={{
                  borderColor: (touched.name || hasSubmitted) && nameError ? '#EF4444' : undefined,
                }}
                required
              />
              {(touched.name || hasSubmitted) && nameError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {nameError}
                </div>
              )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="emp-form-label" style={{ marginBottom: 0 }}>Mức phụ cấp mặc định (VNĐ)</label>
                {amount !== '' && !isNaN(Number(amount)) && (
                  <span style={{ fontSize: 11, color: '#0F766E', fontWeight: 600 }}>
                    {Number(amount).toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
              <input
                type="number"
                step="10000"
                min="0"
                max="500000000"
                className="emp-form-input"
                placeholder="VD: 500,000"
                value={amount === '' ? '' : amount}
                onChange={(e) => {
                  setAmount(e.target.value === '' ? '' : Number(e.target.value));
                  if (!touched.amount) setTouched((prev) => ({ ...prev, amount: true }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
                style={{
                  borderColor: (touched.amount || hasSubmitted) && amountError ? '#EF4444' : undefined,
                }}
              />
              {(touched.amount || hasSubmitted) && amountError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>•</span> {amountError}
                </div>
              )}
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

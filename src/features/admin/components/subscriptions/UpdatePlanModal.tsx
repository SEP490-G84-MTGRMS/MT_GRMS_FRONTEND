import React, { useState, useEffect } from 'react';
import type { SubscriptionPlan, PlanQuotaConfig, PlanFeatureConfig, BackupFrequency } from '../../types/plan.types';
import { Layers, Database, ShieldCheck, AlertCircle } from 'lucide-react';

interface UpdatePlanModalProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPlan: SubscriptionPlan) => void;
}

export const UpdatePlanModal: React.FC<UpdatePlanModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [yearlyPrice, setYearlyPrice] = useState<number>(0);

  // Quotas
  const [unlimitedBranches, setUnlimitedBranches] = useState(false);
  const [maxBranches, setMaxBranches] = useState<number>(1);
  const [unlimitedEmployees, setUnlimitedEmployees] = useState(false);
  const [maxEmployees, setMaxEmployees] = useState<number>(1);
  const [maxStorageGb, setMaxStorageGb] = useState<number>(5);
  const [backupFrequency, setBackupFrequency] = useState<BackupFrequency>('Daily');

  // Feature Flags
  const [features, setFeatures] = useState<PlanFeatureConfig>({
    fefoExpiryAlert: true,
    multiUnitConversion: true,
    vietQrDynamic: true,
    debtZaloBook: false,
    barcodeScanning: true,
    financialReporting: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description);
      setMonthlyPrice(plan.monthlyPrice);
      setYearlyPrice(plan.yearlyPrice);

      setUnlimitedBranches(plan.quotas.maxBranches === -1);
      setMaxBranches(plan.quotas.maxBranches === -1 ? 5 : plan.quotas.maxBranches);

      setUnlimitedEmployees(plan.quotas.maxEmployees === -1);
      setMaxEmployees(plan.quotas.maxEmployees === -1 ? 20 : plan.quotas.maxEmployees);

      setMaxStorageGb(plan.quotas.maxStorageGb);
      setBackupFrequency(plan.quotas.backupFrequency);
      setFeatures({ ...plan.features });
      setErrors({});
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const handleToggleFeature = (key: keyof PlanFeatureConfig) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};

    if (!name.trim()) {
      err.name = 'Tên gói dịch vụ không được để trống';
    }

    if (monthlyPrice < 0) {
      err.monthlyPrice = 'Giá tháng phải lớn hơn hoặc bằng 0';
    }

    if (yearlyPrice < 0) {
      err.yearlyPrice = 'Giá năm phải lớn hơn hoặc bằng 0';
    }

    if (!unlimitedBranches && maxBranches < 1) {
      err.maxBranches = 'Số chi nhánh tối thiểu là 1';
    }

    if (!unlimitedEmployees && maxEmployees < 1) {
      err.maxEmployees = 'Số nhân viên tối thiểu là 1';
    }

    if (maxStorageGb < 1) {
      err.maxStorageGb = 'Dung lượng lưu trữ tối thiểu 1 GB';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const quotas: PlanQuotaConfig = {
      maxBranches: unlimitedBranches ? -1 : maxBranches,
      maxEmployees: unlimitedEmployees ? -1 : maxEmployees,
      maxStorageGb,
      backupFrequency,
    };

    onSave({
      ...plan,
      name: name.trim(),
      description: description.trim(),
      monthlyPrice: Number(monthlyPrice),
      yearlyPrice: Number(yearlyPrice),
      quotas,
      features,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    onClose();
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="admin-modal-box"
        style={{ maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: 'var(--blue-light)',
                color: 'var(--blue-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <div className="admin-modal-title">Cập Nhật Gói: {plan.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Mã định danh hệ thống: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--blue-primary)' }}>{plan.code}</span>
              </div>
            </div>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {plan.activeTenantCount > 0 && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #fef3c7',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: '#b45309',
            }}
          >
            <AlertCircle size={16} />
            <span>
              Lưu ý: Đang có <b>{plan.activeTenantCount} khách hàng/cửa hàng</b> sử dụng gói này. Mọi thay đổi về Quota và tính năng sẽ được đồng bộ ngay lập tức.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* PHẦN 1: THÔNG TIN GÓI & GIÁ CƯỚC */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color="var(--blue-primary)" /> Thông tin định danh & Biểu phí
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="admin-form-label">Mã Gói (Cố định)</label>
                  <input
                    type="text"
                    className="admin-input-control"
                    value={plan.code}
                    disabled
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label">
                    Tên Gói Dịch Vụ <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <div className="admin-form-error">{errors.name}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="admin-form-label">Giá Theo Tháng (VNĐ)</label>
                  <input
                    type="number"
                    step={10000}
                    className="admin-input-control"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                  {errors.monthlyPrice && <div className="admin-form-error">{errors.monthlyPrice}</div>}
                </div>

                <div>
                  <label className="admin-form-label">Giá Theo Năm (VNĐ)</label>
                  <input
                    type="number"
                    step={50000}
                    className="admin-input-control"
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                  {errors.yearlyPrice && <div className="admin-form-error">{errors.yearlyPrice}</div>}
                </div>
              </div>

              <div>
                <label className="admin-form-label">Mô tả tóm tắt tính năng</label>
                <textarea
                  rows={2}
                  className="admin-input-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* PHẦN 2: ĐỊNH NGẠCH TÀI NGUYÊN (QUOTAS) */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={16} color="var(--blue-primary)" /> Hạn mức Quota & Hạ tầng
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="admin-form-label" style={{ marginBottom: 0 }}>Số Chi Nhánh</label>
                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={unlimitedBranches}
                        onChange={(e) => setUnlimitedBranches(e.target.checked)}
                      />
                      Vô hạn (Unlimited)
                    </label>
                  </div>
                  <input
                    type="number"
                    disabled={unlimitedBranches}
                    className="admin-input-control"
                    value={unlimitedBranches ? '' : maxBranches}
                    placeholder={unlimitedBranches ? 'Không giới hạn (~)' : 'VD: 3'}
                    onChange={(e) => setMaxBranches(Number(e.target.value))}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {errors.maxBranches && <div className="admin-form-error">{errors.maxBranches}</div>}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="admin-form-label" style={{ marginBottom: 0 }}>Số Nhân Viên</label>
                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={unlimitedEmployees}
                        onChange={(e) => setUnlimitedEmployees(e.target.checked)}
                      />
                      Vô hạn (Unlimited)
                    </label>
                  </div>
                  <input
                    type="number"
                    disabled={unlimitedEmployees}
                    className="admin-input-control"
                    value={unlimitedEmployees ? '' : maxEmployees}
                    placeholder={unlimitedEmployees ? 'Không giới hạn (~)' : 'VD: 10'}
                    onChange={(e) => setMaxEmployees(Number(e.target.value))}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {errors.maxEmployees && <div className="admin-form-error">{errors.maxEmployees}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="admin-form-label">Dung lượng Database/Media (GB)</label>
                  <input
                    type="number"
                    min={1}
                    className="admin-input-control"
                    value={maxStorageGb}
                    onChange={(e) => setMaxStorageGb(Number(e.target.value))}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {errors.maxStorageGb && <div className="admin-form-error">{errors.maxStorageGb}</div>}
                </div>

                <div>
                  <label className="admin-form-label">Tần suất Sao lưu Tự động</label>
                  <select
                    className="admin-input-control"
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value as BackupFrequency)}
                  >
                    <option value="Daily">Hàng ngày (Daily - Khuyến nghị)</option>
                    <option value="Weekly">Hàng tuần (Weekly - Cơ bản)</option>
                    <option value="Hourly">Hàng giờ (Hourly - Cao cấp)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PHẦN 3: TÍNH NĂNG MỞ KHÓA (FEATURE FLAGS) */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="var(--blue-primary)" /> 6 Tính Năng Nghiệp Vụ Bán Lẻ
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.fefoExpiryAlert}
                    onChange={() => handleToggleFeature('fefoExpiryAlert')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Quản lý Date FEFO 3 mức màu</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cảnh báo hạn cận date đỏ / cam / xanh</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.multiUnitConversion}
                    onChange={() => handleToggleFeature('multiUnitConversion')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Quy đổi Đa đơn vị tính</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thùng / Lon / Lốc / Chai linh hoạt</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.vietQrDynamic}
                    onChange={() => handleToggleFeature('vietQrDynamic')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>VietQR Động Khớp Tiền Tự Động</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sinh mã QR theo số tiền hóa đơn POS</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.debtZaloBook}
                    onChange={() => handleToggleFeature('debtZaloBook')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Sổ Ghi Nợ Zalo & Bán Ghi Nợ</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gửi nhắc nợ tự động qua mạng Zalo</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.barcodeScanning}
                    onChange={() => handleToggleFeature('barcodeScanning')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Quét Mã Vạch Barcode Siêu Tốc</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tương thích đầu đọc USB và Camera POS</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3 }}
                    checked={features.financialReporting}
                    onChange={() => handleToggleFeature('financialReporting')}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Báo Cáo Tài Chính & Sổ Quỹ</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thu chi, dòng tiền, bảng cân đối kế toán</div>
                  </div>
                </label>
              </div>
            </div>

          </div>

          <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Hủy Bỏ
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

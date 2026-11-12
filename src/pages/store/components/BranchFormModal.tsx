// src/pages/store/components/BranchFormModal.tsx
import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  User,
  Mail,
  Store,
  Lock,
  AlertCircle,
} from 'lucide-react';
import {
  branchManagementApi,
  emitBranchesUpdated,
  type BranchItemResponse,
  type BranchQuotaResponse,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from '../api/branchManagementApi';

interface BranchFormModalProps {
  branch: BranchItemResponse | null;
  onClose: () => void;
  onSuccess: () => void;
  quota?: BranchQuotaResponse | null;
  existingBranches?: BranchItemResponse[];
  onUpgrade?: () => void;
}

export const BranchFormModal: FC<BranchFormModalProps> = ({
  branch,
  onClose,
  onSuccess,
  quota,
  existingBranches = [],
  onUpgrade,
}) => {
  const isEdit = !!branch;

  // Function to calculate next auto-suggested branch code
  const getSuggestedCode = (): string => {
    if (isEdit && branch) return branch.code || 'BR-01';
    if (!existingBranches || existingBranches.length === 0) return 'BR-01';

    let maxNum = 0;
    let foundPrefix = 'BR';

    existingBranches.forEach((b) => {
      const match = (b.code || '').trim().match(/^([A-Za-z]+)-?(\d+)$/);
      if (match) {
        foundPrefix = match[1].toUpperCase();
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    if (maxNum > 0) {
      return `${foundPrefix}-${String(maxNum + 1).padStart(2, '0')}`;
    }

    return `BR-${String(existingBranches.length + 1).padStart(2, '0')}`;
  };

  // 1. Basic Information (Branch Code is auto-assigned by system)
  const [branchCode, setBranchCode] = useState(isEdit ? (branch?.code || 'BR-01') : getSuggestedCode());
  const [name, setName] = useState(branch?.name || '');

  // 2. Location & Contact
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState(branch?.managerName || '');

  // 3. Operational Settings
  const [isHeadquarter, setIsHeadquarter] = useState(
    isEdit
      ? Boolean(branch?.isHeadquarter ?? branch?.name?.toLowerCase().includes('chính'))
      : false
  );
  const [syncCatalog, setSyncCatalog] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep state in sync with props
  useEffect(() => {
    if (isEdit && branch) {
      setBranchCode(branch.code || 'BR-01');
      setName(branch.name || '');
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setEmail(branch.email || '');
      setManagerName(branch.managerName || '');
      setIsHeadquarter(Boolean(branch.isHeadquarter ?? branch.name?.toLowerCase().includes('chính')));
    } else if (!isEdit) {
      setBranchCode(getSuggestedCode());
    }
  }, [isEdit, branch, existingBranches]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên chi nhánh.');
      return;
    }
    if (!isEdit && !branchCode.trim()) {
      setErrorMessage('Vui lòng nhập mã chi nhánh.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ chi nhánh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEdit && branch) {
        const payload: UpdateBranchPayload = {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          managerName: managerName.trim() || undefined,
          isHeadquarter: isHeadquarter,
        };
        const res = await branchManagementApi.updateBranch(branch.id, payload);
        if (res.success) {
          if (res.data) {
            emitBranchesUpdated({
              action: 'update',
              branch: res.data,
              branchId: branch.id,
            });
          }
          onSuccess();
        } else {
          setErrorMessage(res.message || 'Cập nhật chi nhánh thất bại.');
        }
      } else {
        const payload: CreateBranchPayload = {
          branchCode: branchCode.trim().toUpperCase(),
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          managerName: managerName.trim() || undefined,
          isHeadquarter: isHeadquarter,
        };
        const res = await branchManagementApi.createBranch(payload);
        if (res.success) {
          if (res.data) {
            emitBranchesUpdated({
              action: 'create',
              branch: res.data,
              selectCreated: true,
            });
          }
          onSuccess();
        } else {
          setErrorMessage(res.message || 'Tạo chi nhánh thất bại.');
        }
      }
    } catch (err: any) {
      console.error('Save branch error:', err);
      const backendMsg = err.response?.data?.message || err.message;
      setErrorMessage(backendMsg || 'Đã có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuotaFull = !isEdit && quota && !quota.canAddMore;

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 600, borderRadius: 20, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          className="store-modal-header"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '18px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#E6F4F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F766E',
              }}
            >
              <Store size={22} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                {isEdit ? `Chỉnh sửa: ${branch.name}` : 'Thêm chi nhánh mới'}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                {isEdit
                  ? 'Cập nhật thông tin chi nhánh và địa điểm kinh doanh'
                  : 'Khởi tạo địa điểm bán lẻ hoặc kho hàng mới trong chuỗi cửa hàng'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quota Banner */}
        {quota && !isEdit && (
          <div
            style={{
              padding: '10px 24px',
              background: isQuotaFull ? '#FFFBEB' : '#F0FDFA',
              borderBottom: `1px solid ${isQuotaFull ? '#FDE68A' : '#CCFBF1'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isQuotaFull ? '#B45309' : '#0F766E' }}>
              <Building2 size={16} />
              <span>
                <strong>Hạn mức chi nhánh:</strong> Đang dùng <strong>{quota.usedBranches}/{quota.maxBranches}</strong> ({quota.currentPlanName})
                {quota.canAddMore ? ` • Còn trống ${quota.maxBranches - quota.usedBranches}` : ' • Đã đạt tối đa'}
              </span>
            </div>
            {isQuotaFull && onUpgrade && (
              <button
                type="button"
                onClick={onUpgrade}
                style={{
                  background: '#0F766E',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Nâng cấp gói
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div
            className="store-modal-body"
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: 'calc(85vh - 140px)',
              overflowY: 'auto',
            }}
          >
            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#B91C1C',
                  fontSize: 13.5,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Mã chi nhánh (Hệ thống tự tạo) & Tên chi nhánh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    Mã chi nhánh
                  </label>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#0F766E',
                      background: '#E6F4F1',
                      padding: '2px 7px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Lock size={10} />
                    Tự động tạo
                  </span>
                </div>
                <input
                  type="text"
                  value={branchCode}
                  readOnly
                  disabled
                  tabIndex={-1}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    background: '#F1F5F9',
                    color: '#0F766E',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    cursor: 'not-allowed',
                    userSelect: 'none',
                  }}
                />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Hệ thống tự động cấp mã theo chuỗi
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tên chi nhánh *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  placeholder="VD: MT-Mart Cầu Giấy"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* 2. Địa chỉ */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Địa chỉ chi nhánh *
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={16}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: 12, top: 12 }}
                />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* 3. Hotline & Email chi nhánh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Hotline / SĐT
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={16}
                    color="#94A3B8"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 024.3768.9999"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Email nhận thông báo
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="#94A3B8"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: chinhanh@mt-grms.vn"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Quản lý phụ trách */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Quản lý phụ trách
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: 12, top: 12 }}
                />
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* 5. Tùy chọn vận hành (Hiển thị cả khi Thêm mới và Chỉnh sửa) */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Đặt làm cơ sở chính */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isHeadquarter}
                  onChange={(e) => setIsHeadquarter(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#0F766E', width: 16, height: 16 }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      Đặt làm cơ sở chính (Trụ sở chính)
                    </span>
                    {isHeadquarter && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#0F766E',
                          background: '#E6F4F1',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        Cơ sở chính
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Cơ sở mặc định được chọn khi đăng nhập và xuất báo cáo tài chính toàn chuỗi.
                  </div>
                </div>
              </label>

              {/* Tự động đồng bộ sản phẩm (Chỉ khi Thêm mới) */}
              {!isEdit && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    borderTop: '1px dashed #E2E8F0',
                    paddingTop: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={syncCatalog}
                    onChange={(e) => setSyncCatalog(e.target.checked)}
                    style={{ marginTop: 2, accentColor: '#0F766E', width: 16, height: 16 }}
                  />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      Tự động đồng bộ danh mục sản phẩm từ Chi nhánh chính (Khuyên dùng)
                    </span>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Áp dụng toàn bộ danh mục hàng hóa và bảng giá sang chi nhánh mới để có thể bán hàng ngay.
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="store-modal-footer"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              background: '#F8FAFC',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(isQuotaFull)}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                background: isQuotaFull ? '#94A3B8' : '#0F766E',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting || isQuotaFull ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: isQuotaFull ? 'none' : '0 4px 14px rgba(15, 118, 110, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo chi nhánh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

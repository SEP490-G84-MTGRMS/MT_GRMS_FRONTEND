// src/pages/store/components/BranchFormModal.tsx
import { useState, type FC, type FormEvent } from 'react';
import { X, Building2, MapPin, Phone, User, AlertCircle } from 'lucide-react';
import {
  branchManagementApi,
  type BranchItemResponse,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from '../api/branchManagementApi';

interface BranchFormModalProps {
  branch: BranchItemResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BranchFormModal: FC<BranchFormModalProps> = ({
  branch,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!branch;

  const [branchCode, setBranchCode] = useState(branch?.code || '');
  const [name, setName] = useState(branch?.name || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [managerName, setManagerName] = useState(branch?.managerName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEdit && branch) {
        const payload: UpdateBranchPayload = {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim() || undefined,
          managerName: managerName.trim() || undefined,
        };
        const res = await branchManagementApi.updateBranch(branch.id, payload);
        if (res.success) {
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
          managerName: managerName.trim() || undefined,
        };
        const res = await branchManagementApi.createBranch(payload);
        if (res.success) {
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

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        {/* Header */}
        <div className="store-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#EBF5FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0066FF',
              }}
            >
              <Building2 size={18} />
            </div>
            <div className="store-modal-title">
              {isEdit ? `Chỉnh sửa: ${branch.name}` : 'Thêm chi nhánh mới'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="store-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMessage && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 10,
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

            {/* Mã chi nhánh & Tên chi nhánh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mã chi nhánh *
                </label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  disabled={isEdit}
                  placeholder="VD: CN-01"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    background: isEdit ? '#F1F5F9' : '#FFFFFF',
                    color: isEdit ? '#64748B' : '#0F172A',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tên chi nhánh *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

            {/* Địa chỉ */}
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

            {/* Hotline & Quản lý phụ trách */}
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
            </div>
          </div>

          {/* Footer */}
          <div className="store-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-pill)',
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
              disabled={isSubmitting}
              style={{
                padding: '9px 24px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--blue-primary)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(0, 102, 255, 0.28)',
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


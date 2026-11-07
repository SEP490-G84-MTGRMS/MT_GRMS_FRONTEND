// src/pages/store/components/EditStoreInfoModal.tsx
import { useState, type FC, type FormEvent } from 'react';
import {
  X,
  Store,
  Globe,
  Building,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  Lock,
} from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface EditStoreInfoModalProps {
  storeInfo: StoreInfo;
  onClose: () => void;
  onSave: (updated: Partial<StoreInfo>) => Promise<boolean>;
}

export const EditStoreInfoModal: FC<EditStoreInfoModalProps> = ({
  storeInfo,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: storeInfo.name,
    taxCode: storeInfo.taxCode,
    hotline: storeInfo.hotline,
    address: storeInfo.address,
    city: storeInfo.city,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Vui lòng nhập tên chuỗi cửa hàng / gian hàng.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Không thể lưu thông tin gian hàng vào hệ thống. Vui lòng thử lại.');
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="store-modal-header">
          <div>
            <div className="store-modal-title">Cập nhật thông tin gian hàng</div>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Cập nhật tên chuỗi cửa hàng, mã số thuế, hotline và địa chỉ trụ sở chính.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              color: '#64748B',
              padding: 4,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="store-modal-body">
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Tên chuỗi cửa hàng */}
            <div>
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <Store size={15} color="var(--blue-primary)" />
                <span>Tên chuỗi cửa hàng / Gian hàng *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Chuỗi Siêu thị Mini Minh Đức"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* MST & Hotline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Building size={15} color="var(--blue-primary)" />
                  <span>Mã số thuế (MST)</span>
                </label>
                <input
                  type="text"
                  value={formData.taxCode}
                  onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                  placeholder="VD: 0109887766"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Phone size={15} color="var(--blue-primary)" />
                  <span>Hotline liên hệ / CSKH</span>
                </label>
                <input
                  type="text"
                  value={formData.hotline}
                  onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                  placeholder="VD: 0369880798"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>

            {/* Tỉnh / Thành phố */}
            <div>
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <MapPin size={15} color="var(--blue-primary)" />
                <span>Tỉnh / Thành phố</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Địa chỉ trụ sở chính */}
            <div>
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <MapPin size={15} color="var(--blue-primary)" />
                <span>Địa chỉ trụ sở chính</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="VD: Số 186 Đường Cầu Giấy, Phường Quan Hoa, Cầu Giấy"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Thông tin cố định bởi hệ thống (Readonly) */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                border: '1px dashed #CBD5E1',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                <Lock size={13} color="#94A3B8" />
                <span>THÔNG TIN ĐỊNH DANH HỆ THỐNG (CỐ ĐỊNH)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Globe size={13} /> Tên miền con (Subdomain)
                  </span>
                  <div
                    style={{
                      padding: '7px 12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #E2E8F0',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                      color: '#475569',
                    }}
                  >
                    {storeInfo.subdomain}.mt-grms.vn
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Mail size={13} /> Email nhận thông báo
                  </span>
                  <div
                    style={{
                      padding: '7px 12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #E2E8F0',
                      fontSize: 13,
                      color: '#475569',
                    }}
                  >
                    {storeInfo.email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="store-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 24px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--blue-primary)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


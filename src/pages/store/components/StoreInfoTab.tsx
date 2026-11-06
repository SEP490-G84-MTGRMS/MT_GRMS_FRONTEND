// src/pages/store/components/StoreInfoTab.tsx
import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  Store,
  Globe,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  Save,
  FileEdit,
  Loader2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import type { StoreInfo } from '../storeData';
import { EditStoreInfoModal } from './EditStoreInfoModal';

interface StoreInfoTabProps {
  storeInfo: StoreInfo;
  onUpdateStoreInfo: (updated: Partial<StoreInfo>) => Promise<boolean>;
}

export const StoreInfoTab: FC<StoreInfoTabProps> = ({
  storeInfo,
  onUpdateStoreInfo,
}) => {
  const [formData, setFormData] = useState({
    name: storeInfo.name,
    taxCode: storeInfo.taxCode,
    hotline: storeInfo.hotline,
    address: storeInfo.address,
    city: storeInfo.city,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setFormData({
      name: storeInfo.name,
      taxCode: storeInfo.taxCode,
      hotline: storeInfo.hotline,
      address: storeInfo.address,
      city: storeInfo.city,
    });
  }, [storeInfo]);

  const handleSubmitInline = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên chuỗi cửa hàng / gian hàng.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onUpdateStoreInfo(formData);
      if (success) {
        showToast('Cập nhật thông tin gian hàng thành công!');
      } else {
        showToast('Không thể lưu thông tin vào hệ thống. Vui lòng thử lại!', 'error');
      }
    } catch {
      showToast('Đã xảy ra lỗi khi kết nối máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalSave = async (updated: Partial<StoreInfo>): Promise<boolean> => {
    const success = await onUpdateStoreInfo(updated);
    if (success) {
      showToast('Cập nhật thông tin gian hàng thành công!');
      return true;
    } else {
      showToast('Không thể lưu thông tin vào hệ thống. Vui lòng thử lại!', 'error');
      return false;
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: toastMessage.type === 'success' ? '#0F172A' : '#7F1D1D',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 'var(--radius-pill)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#00C853" />
          ) : (
            <AlertCircle size={18} color="#F87171" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Thông tin gian hàng
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
            Quản lý tên thương hiệu, tên miền con, mã số thuế và thông tin liên hệ pháp lý của chuỗi cửa hàng.
          </p>
        </div>

        {/* Nút Cập nhật thông tin mở Modal */}
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--blue-primary)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
          }}
        >
          <FileEdit size={16} />
          <span>Cập nhật thông tin</span>
        </button>
      </div>

      <form onSubmit={handleSubmitInline} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Card 1: Hồ sơ định danh chuỗi */}
        <div className="profile-card">
          <div className="profile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="profile-card-title">Hồ sơ định danh chuỗi</div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = 'var(--blue-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <FileEdit size={14} color="var(--blue-primary)" />
              <span>Chỉnh sửa</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 14,
            }}
          >
            {/* Tên chuỗi */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Store size={15} color="var(--blue-primary)" />
                <span>Tên chuỗi cửa hàng / Gian hàng *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên chuỗi cửa hàng..."
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Subdomain (Readonly định danh) */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Globe size={15} color="var(--blue-primary)" />
                <span>Tên miền con (Subdomain) *</span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={11} /> Cố định
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={storeInfo.subdomain}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderTopLeftRadius: 'var(--radius-pill)',
                    borderBottomLeftRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    cursor: 'not-allowed',
                  }}
                />
                <span
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderLeft: 'none',
                    padding: '9px 14px',
                    borderTopRightRadius: 'var(--radius-pill)',
                    borderBottomRightRadius: 'var(--radius-pill)',
                    fontSize: 13,
                    color: '#64748B',
                    fontWeight: 600,
                  }}
                >
                  .mt-grms.vn
                </span>
              </div>
            </div>

            {/* Mã số thuế */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Building size={15} color="var(--blue-primary)" />
                <span>Mã số thuế (MST)</span>
              </label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                placeholder="VD: 0109887766 (Để trống nếu hộ kinh doanh cá thể)"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Hotline */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Phone size={15} color="var(--blue-primary)" />
                <span>Hotline liên hệ / Chăm sóc khách hàng</span>
              </label>
              <input
                type="text"
                value={formData.hotline}
                onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                placeholder="VD: 0369880798"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Email hóa đơn & thông báo (Readonly hệ thống) */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Mail size={15} color="var(--blue-primary)" />
                <span>Email tiếp nhận thông báo & hóa đơn điện tử</span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={11} /> Hệ thống
                </span>
              </label>
              <input
                type="email"
                readOnly
                disabled
                value={storeInfo.email}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Tỉnh / Thành phố */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Địa chỉ trụ sở chính */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MapPin size={15} color="var(--blue-primary)" />
                <span>Địa chỉ trụ sở chính</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="VD: Số 186 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Trạng thái hợp đồng & Gói dịch vụ */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-title">Hợp đồng & Trạng thái dịch vụ</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            <div className="profile-info-item">
              <span className="profile-info-label">Trạng thái gian hàng</span>
              <div className="profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#008738' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00C853' }} />
                <span>Đang hoạt động (Active)</span>
              </div>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Gói thuê bao hiện tại</span>
              <div className="profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color="var(--blue-primary)" />
                <span>{storeInfo.currentPlan}</span>
              </div>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Ngày hết hạn thuê bao</span>
              <div className="profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color="#FF3B30" />
                <span>{storeInfo.subscriptionExpiresAt} ({storeInfo.daysRemaining} ngày còn lại)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 26px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--blue-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
              transition: 'all 0.15s ease',
              opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
            }}
            onMouseLeave={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
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

      {/* Modal Chỉnh sửa thông tin gian hàng */}
      {showEditModal && (
        <EditStoreInfoModal
          storeInfo={storeInfo}
          onClose={() => setShowEditModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

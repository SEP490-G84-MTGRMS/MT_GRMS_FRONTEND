// src/pages/store/components/StoreInfoTab.tsx
import { useState, type FC, type FormEvent } from 'react';
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
} from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface StoreInfoTabProps {
  storeInfo: StoreInfo;
  onUpdateStoreInfo: (updated: Partial<StoreInfo>) => void;
}

export const StoreInfoTab: FC<StoreInfoTabProps> = ({
  storeInfo,
  onUpdateStoreInfo,
}) => {
  const [formData, setFormData] = useState({
    name: storeInfo.name,
    subdomain: storeInfo.subdomain,
    taxCode: storeInfo.taxCode,
    hotline: storeInfo.hotline,
    email: storeInfo.email,
    address: storeInfo.address,
    city: storeInfo.city,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdateStoreInfo(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

        {savedSuccess && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: '#E8F9EE',
              color: '#008738',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={16} />
            <span>Đã lưu thành công!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Card 1: Thông tin pháp lý & Nhận diện */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-title">Hồ sơ định danh chuỗi</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
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
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Subdomain */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Globe size={15} color="var(--blue-primary)" />
                <span>Tên miền con (Subdomain) *</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderTopLeftRadius: 'var(--radius-pill)',
                    borderBottomLeftRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    fontSize: 13.5,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderLeft: 'none',
                    padding: '8px 14px',
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
                style={{
                  width: '100%',
                  padding: '8px 14px',
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
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Email hóa đơn */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Mail size={15} color="var(--blue-primary)" />
                <span>Email tiếp nhận thông báo & hóa đơn điện tử</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
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
                style={{
                  width: '100%',
                  padding: '8px 14px',
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
                style={{
                  width: '100%',
                  padding: '8px 14px',
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

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--blue-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
            }}
          >
            <Save size={16} />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
};

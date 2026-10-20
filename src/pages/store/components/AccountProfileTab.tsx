// src/pages/store/components/AccountProfileTab.tsx
import { useState, type FC } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Laptop,
  Smartphone,
  Trash2,
  FileEdit,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile, UserSessionItem } from '../storeData';
import { EditProfileModal } from './EditProfileModal';
import { ChangePasswordModal } from './ChangePasswordModal';

interface AccountProfileTabProps {
  userProfile: UserProfile;
  sessions: UserSessionItem[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onTerminateSession: (sessionId: string) => void;
}

export const AccountProfileTab: FC<AccountProfileTabProps> = ({
  userProfile,
  sessions,
  onUpdateProfile,
  onTerminateSession,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggle2FA = () => {
    const newVal = !userProfile.isTwoFactorEnabled;
    onUpdateProfile({ isTwoFactorEnabled: newVal });
    showToast(
      newVal
        ? 'Đã bật xác thực 2 lớp (2FA). Mã OTP sẽ được yêu cầu khi đăng nhập trên thiết bị lạ.'
        : 'Đã tắt xác thực 2 lớp (2FA).'
    );
  };

  return (
    <div className="profile-screen-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#0F172A',
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
          }}
        >
          <CheckCircle2 size={18} color="#00C853" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Tài khoản
        </h1>
      </div>

      {/* Card 1: Thông tin người dùng */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-card-title">Thông tin người dùng</div>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Chỉnh sửa
          </button>
        </div>

        <div className="profile-info-grid">
          {/* Row 1 */}
          <div className="profile-info-item">
            <span className="profile-info-label">Tên hiển thị</span>
            <span className="profile-info-value">{userProfile.fullName}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Tên đăng nhập</span>
            <span className="profile-info-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {userProfile.userName}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Vai trò</span>
            <span className="profile-info-value">{userProfile.role}</span>
          </div>

          {/* Row 2 */}
          <div className="profile-info-item">
            <span className="profile-info-label">Điện thoại</span>
            <span className="profile-info-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {userProfile.phone}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Email</span>
            <span
              className={`profile-info-value ${!userProfile.email ? 'muted' : ''}`}
            >
              {userProfile.email || 'Chưa có'}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Sinh nhật</span>
            <span
              className={`profile-info-value ${!userProfile.dateOfBirth ? 'muted' : ''}`}
            >
              {userProfile.dateOfBirth || 'Chưa có'}
            </span>
          </div>

          {/* Row 3: Địa chỉ */}
          <div className="profile-info-item full-width">
            <span className="profile-info-label">Địa chỉ</span>
            <span
              className={`profile-info-value ${!userProfile.address ? 'muted' : ''}`}
            >
              {userProfile.address || 'Chưa có'}
            </span>
          </div>

          {/* Row 4: Ghi chú */}
          <div
            className="profile-info-item full-width"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderBottom: 'none',
              paddingTop: 4,
            }}
          >
            <FileEdit size={16} color="#64748B" />
            <span
              style={{
                fontSize: 13.5,
                color: userProfile.note ? '#475569' : '#94A3B8',
              }}
            >
              {userProfile.note || 'Chưa có ghi chú'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Đăng nhập và bảo mật */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-card-title">Đăng nhập và bảo mật</div>
        </div>

        {/* Row 1: Mật khẩu */}
        <div className="security-row">
          <div className="security-row-left">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <KeyRound size={18} color="#334155" strokeWidth={2} />
            </div>
            <div>
              <div className="security-row-title">Mật khẩu</div>
              <div className="security-row-desc">
                Để bảo mật tài khoản tốt hơn, hãy sử dụng mật khẩu mạnh và thay đổi định kỳ 6 tháng/lần.
                MT-GRMS sẽ tự động đăng xuất tài khoản khỏi tất cả thiết bị trước khi đổi mật khẩu thành công.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* Row 2: Xác thực 2 lớp */}
        <div className="security-row">
          <div className="security-row-left">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} color="#334155" strokeWidth={2} />
            </div>
            <div>
              <div className="security-row-title">
                <span>Xác thực 2 lớp cho tài khoản của bạn</span>
                <span
                  title="Khi kích hoạt, mỗi lần đăng nhập từ trình duyệt hoặc thiết bị lạ sẽ yêu cầu nhập mã OTP bảo mật gửi về số điện thoại."
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#E2E8F0',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#64748B',
                    cursor: 'help',
                  }}
                >
                  i
                </span>
              </div>
              <div className="security-row-desc">
                Yêu cầu mã xác thực khi bạn đăng nhập trên thiết bị lạ.
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={userProfile.isTwoFactorEnabled}
            onClick={handleToggle2FA}
            style={{
              width: 48,
              height: 26,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: userProfile.isTwoFactorEnabled ? '#0066FF' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: userProfile.isTwoFactorEnabled ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Card 3: Các thiết bị đã đăng nhập */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-card-title">Các thiết bị đã đăng nhập</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 14,
                backgroundColor: '#F8FAFC',
                border: '1px solid #EDF2F9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {session.deviceName.toLowerCase().includes('phone') ? (
                    <Smartphone size={18} color="#475569" />
                  ) : (
                    <Laptop size={18} color="#475569" />
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{session.deviceName}</span>
                    <span style={{ color: '#94A3B8' }}>·</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: session.status === 'unverified' ? '#DC2626' : '#64748B',
                        fontWeight: 600,
                      }}
                    >
                      {session.status === 'unverified' ? 'Chưa kiểm tra' : 'Đã xác thực'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748B',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{session.browser}</span>
                    <span>·</span>
                    <span>{session.lastActive}</span>
                    <span>·</span>
                    <span style={{ color: '#008738', fontWeight: 600 }}>
                      {session.isCurrent ? 'Đang hoạt động (Hiện tại)' : 'Đã đăng nhập'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => showToast(`Đã kiểm tra an toàn cho ${session.deviceName}`)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Kiểm tra
                </button>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      onTerminateSession(session.id);
                      showToast(`Đã đăng xuất ${session.deviceName}`);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Đăng xuất thiết bị này"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditProfileModal
          userProfile={userProfile}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            onUpdateProfile(updated);
            showToast('Đã cập nhật thông tin cá nhân thành công!');
          }}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            showToast('Đổi mật khẩu thành công!');
          }}
        />
      )}
    </div>
  );
};

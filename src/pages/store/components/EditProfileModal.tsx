// src/pages/store/components/EditProfileModal.tsx
import { useState, type FC, type FormEvent } from 'react';
import { X, User, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react';
import type { UserProfile } from '../storeData';

interface EditProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => Promise<void> | void;
}

function normalizeVnPhone(raw: string): string {
  const digits = raw.trim().replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export const EditProfileModal: FC<EditProfileModalProps> = ({
  userProfile,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [phone, setPhone] = useState(userProfile.phone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = fullName.trim();
    const normalizedPhone = normalizeVnPhone(phone);

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMessage('Tên hiển thị phải có từ 2 đến 100 ký tự.');
      return;
    }

    if (normalizedPhone && !/^(03|05|07|08|09)\d{8}$/.test(normalizedPhone)) {
      setErrorMessage('Số điện thoại phải gồm 10 chữ số hợp lệ tại Việt Nam.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave({
        fullName: trimmedName,
        phone: normalizedPhone,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể lưu thông tin cá nhân. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="store-modal-backdrop" onClick={isSubmitting ? undefined : onClose}>
      <div
        className="store-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Chỉnh sửa thông tin cá nhân"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="store-modal-header">
          <div className="store-modal-title">Chỉnh sửa thông tin cá nhân</div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="store-modal-body">
            {errorMessage && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="edit-profile-fullname"
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
                <User size={15} color="#0066FF" />
                <span>Tên hiển thị *</span>
              </label>
              <input
                id="edit-profile-fullname"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label
                  htmlFor="edit-profile-phone"
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
                  <Phone size={15} color="#0066FF" />
                  <span>Số điện thoại *</span>
                </label>
                <input
                  id="edit-profile-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-email"
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
                  <Mail size={15} color="#64748B" />
                  <span>Email (đã xác thực)</span>
                </label>
                <input
                  id="edit-profile-email"
                  type="email"
                  value={userProfile.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="store-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 22px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

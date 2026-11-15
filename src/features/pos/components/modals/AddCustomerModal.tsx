import { useState } from 'react';
import type { FC } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Customer } from '../../types/pos.types';
import { customerApi } from '../../../customer-crm/api/customerApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export const AddCustomerModal: FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [ward, setWard] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    const trimmedName = name.trim();
    const normalizedPhone = phone.trim().replace(/[\s().-]/g, '');
    const trimmedEmail = email.trim();

    if (!trimmedName || !normalizedPhone) {
      setErrorMessage('Vui lòng nhập Tên KH (*) và Số điện thoại (*)!');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMessage('Tên khách hàng phải có từ 2 đến 100 ký tự.');
      return;
    }

    if (!/^\+?\d{9,15}$/.test(normalizedPhone)) {
      setErrorMessage('Số điện thoại phải gồm 9–15 chữ số; có thể bắt đầu bằng mã quốc gia +.');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Email không đúng định dạng.');
      return;
    }

    if (dob && new Date(`${dob}T00:00:00`).getTime() > Date.now()) {
      setErrorMessage('Ngày sinh không thể ở tương lai.');
      return;
    }

    if (address.trim().length > 250 || area.trim().length > 120 || ward.trim().length > 120 || note.trim().length > 500) {
      setErrorMessage('Địa chỉ/khu vực/phường xã tối đa 120–250 ký tự; ghi chú tối đa 500 ký tự.');
      return;
    }

    const fullAddress = [address.trim(), ward.trim(), area.trim()].filter(Boolean).join(', ');
    if (fullAddress.length > 250) {
      setErrorMessage('Địa chỉ sau khi ghép tối đa 250 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await customerApi.createCustomer({
        fullName: trimmedName,
        phoneNumber: normalizedPhone,
        email: trimmedEmail || undefined,
        address: fullAddress || undefined,
        debtLimit: 0,
        membershipTier: 'Standard',
      });

      const cAny = created as any;
      const newCust: Customer = {
        id: created.id,
        code: cAny.code || cAny.customerCode || `KH${Math.floor(100000 + Math.random() * 900000)}`,
        name: created.fullName || trimmedName,
        phone: created.phoneNumber || normalizedPhone,
        email: created.email || trimmedEmail || undefined,
        group: created.membershipTier || 'Khách lẻ',
        dob: dob || undefined,
        gender,
        address: created.address || fullAddress || undefined,
        area: area.trim() || undefined,
        ward: ward.trim() || undefined,
        note: note.trim() || undefined,
        loyaltyPoints: created.loyaltyPoints ?? 0,
        membershipTier: created.membershipTier || 'Standard',
        debtLimit: created.debtLimit ?? 0,
        debtCount: 0,
        totalDebtPurchased: 0,
        currentDebt: created.currentDebtAR ?? 0,
        allowDebt: Boolean((created.debtLimit ?? 0) > 0 || cAny.allowDebt),
      };

      onSave(newCust);
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      setAddress('');
      setArea('');
      setWard('');
      setNote('');
      setErrorMessage(null);
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu khách hàng vào CSDL:', err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể lưu khách hàng vào cơ sở dữ liệu. Vui lòng kiểm tra kết nối!';
      setErrorMessage(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 660, padding: 0 }}>
        {/* Header với tiêu đề và nút đóng (1) */}
        <div className="pos-modal-header" style={{ padding: '10px 18px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1' }}>
          <b style={{ fontSize: 14, color: '#0f172a' }}>Thêm khách hàng mới</b>
          <button
            type="button"
            className="pos-modal-close-btn"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body chuẩn khung bảng lưới 100% giống Ảnh 2 */}
        <div className="pos-modal-body" style={{ padding: '16px' }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: 4,
                color: '#b91c1c',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
          <div
            style={{
              border: '2px solid #cbd5e1',
              padding: '6px',
              backgroundColor: '#ffffff',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #94a3b8',
                fontSize: 13,
                color: '#1e293b',
              }}
            >
              <tbody>
                {/* Hàng 1: Tên KH & Ngày sinh + Giới tính */}
                <tr>
                  <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Tên KH (*):
                  </td>
                  <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Nhập họ và tên..."
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 700,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #94a3b8', verticalAlign: 'top' }}>
                    Ngày sinh:
                  </td>
                  <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '3px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        marginBottom: 4,
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="gender_select"
                          checked={gender === 'Nam'}
                          onChange={() => setGender('Nam')}
                        />
                        Nam
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="gender_select"
                          checked={gender === 'Nữ'}
                          onChange={() => setGender('Nữ')}
                        />
                        Nữ
                      </label>
                    </div>
                  </td>
                </tr>

                {/* Hàng 3: Điện thoại & Email */}
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Điện thoại (*):
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      autoComplete="tel"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Email:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={254}
                      placeholder="email@gmail.com"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                </tr>

                {/* Hàng 4: Địa chỉ & Khu vực (ô nhập text tự do + datalist gợi ý hợp lý) */}
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Địa chỉ:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      maxLength={250}
                      placeholder="Số nhà, đường..."
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Khu vực:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      list="area-suggestions"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      maxLength={120}
                      placeholder="Tỉnh/Thành - Quận/Huyện"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                    <datalist id="area-suggestions">
                      <option value="Hà Nội - Hoàn Kiếm" />
                      <option value="Hà Nội - Cầu Giấy" />
                      <option value="Hà Nội - Đống Đa" />
                      <option value="Hà Nội - Thanh Xuân" />
                      <option value="TP. Hồ Chí Minh - Quận 1" />
                      <option value="TP. Hồ Chí Minh - Bình Thạnh" />
                      <option value="Đà Nẵng - Hải Châu" />
                    </datalist>
                  </td>
                </tr>

                {/* Hàng 5: Phường xã & Ghi chú */}
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Phường xã:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      maxLength={120}
                      placeholder="Phường/Xã"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Ghi chú:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                      placeholder="Ghi chú thêm..."
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer chứa nút (3) Bỏ qua và (4) Lưu khách hàng đúng như Ảnh 2 */}
        <div
          className="pos-modal-footer"
          style={{
            padding: '10px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#e2e8f0',
              color: '#1e293b',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '6px 16px',
              border: '1px solid #1e293b',
              backgroundColor: isSubmitting ? '#64748b' : '#334155',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              borderRadius: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang lưu vào CSDL...</span>
              </>
            ) : (
              <span>✓ Lưu khách hàng</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

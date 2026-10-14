import { useState } from 'react';
import type { FC } from 'react';
import type { Customer } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export const AddCustomerModal: FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('Hoàng Sơn');
  const [phone, setPhone] = useState('0912.345.678');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Hà Nội - Hoàn Kiếm');
  const [ward, setWard] = useState('Phường Tràng Tiền');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Vui lòng nhập Tên KH (*) và Số điện thoại (*)!');
      return;
    }

    const newCust: Customer = {
      id: `kh-${Date.now()}`,
      code: `KH${Math.floor(100000 + Math.random() * 900000)}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      group: group.trim() || 'Khách lẻ',
      dob: dob || undefined,
      gender,
      address: address.trim() || undefined,
      area: area.trim() || undefined,
      ward: ward.trim() || undefined,
      note: note.trim() || undefined,
      loyaltyPoints: 0,
      membershipTier: 'Standard',
      debtLimit: 0,
      currentDebt: 0,
      allowDebt: false,
    };

    onSave(newCust);
    onClose();
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
                {/* Hàng 1: Mã KH & Nhóm */}
                <tr>
                  <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Mã KH:
                  </td>
                  <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      placeholder="Mã tự động"
                      disabled
                      value=""
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        color: '#94a3b8',
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Nhóm:
                  </td>
                  <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      placeholder="Nhóm khách"
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

                {/* Hàng 2: Tên KH & Ngày sinh + Giới tính */}
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    Tên KH (*):
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8', verticalAlign: 'top' }}>
                    Ngày sinh:
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #94a3b8' }}>
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
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
            style={{
              padding: '6px 16px',
              border: '1px solid #1e293b',
              backgroundColor: '#334155',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            ✓ Lưu khách hàng
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
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
        debtCount: 0,
        totalDebtPurchased: 0,
        currentDebt: created.currentDebtAR ?? 0,
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

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSubmit();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog pos-add-customer-dialog">
        {/* Header giữ đúng cấu trúc mẫu thiết kế (tiêu đề + nút đóng) */}
        <div className="pos-modal-header pos-add-customer-header">
          <b className="pos-add-customer-title">Thêm khách hàng mới</b>
          <button
            type="button"
            className="pos-add-customer-close"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          {/* Body giữ đúng bố cục bảng 4 hàng x 2 cặp trường của mẫu thiết kế, đồng bộ CSS POS */}
          <div className="pos-modal-body pos-add-customer-body">
            {errorMessage && (
              <div role="alert" className="pos-add-customer-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pos-add-customer-table-wrap">
              <table className="pos-add-customer-table">
                <tbody>
                  {/* Hàng 1: Tên KH & Ngày sinh + Giới tính */}
                  <tr>
                    <td className="pos-add-customer-label-cell">
                      Tên KH (<span className="pos-add-customer-required">*</span>):
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        placeholder="Nhập họ và tên..."
                        className="pos-add-customer-input is-emphasis"
                        autoFocus
                      />
                    </td>
                    <td className="pos-add-customer-label-cell is-top">
                      Ngày sinh:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="pos-add-customer-input"
                      />
                      <div className="pos-add-customer-gender-row">
                        <label className="pos-add-customer-radio">
                          <input
                            type="radio"
                            name="gender_select"
                            checked={gender === 'Nam'}
                            onChange={() => setGender('Nam')}
                          />
                          <span>Nam</span>
                        </label>
                        <label className="pos-add-customer-radio">
                          <input
                            type="radio"
                            name="gender_select"
                            checked={gender === 'Nữ'}
                            onChange={() => setGender('Nữ')}
                          />
                          <span>Nữ</span>
                        </label>
                      </div>
                    </td>
                  </tr>

                  {/* Hàng 2: Điện thoại & Email */}
                  <tr>
                    <td className="pos-add-customer-label-cell">
                      Điện thoại (<span className="pos-add-customer-required">*</span>):
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={20}
                        autoComplete="tel"
                        placeholder="Nhập số điện thoại..."
                        className="pos-add-customer-input"
                      />
                    </td>
                    <td className="pos-add-customer-label-cell">
                      Email:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                        placeholder="email@gmail.com"
                        className="pos-add-customer-input"
                      />
                    </td>
                  </tr>

                  {/* Hàng 3: Địa chỉ & Khu vực */}
                  <tr>
                    <td className="pos-add-customer-label-cell">
                      Địa chỉ:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        maxLength={250}
                        placeholder="Số nhà, đường..."
                        className="pos-add-customer-input"
                      />
                    </td>
                    <td className="pos-add-customer-label-cell">
                      Khu vực:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="text"
                        list="area-suggestions"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        maxLength={120}
                        placeholder="Tỉnh/Thành - Quận/Huyện"
                        className="pos-add-customer-input"
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

                  {/* Hàng 4: Phường xã & Ghi chú */}
                  <tr>
                    <td className="pos-add-customer-label-cell">
                      Phường xã:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        maxLength={120}
                        placeholder="Phường/Xã"
                        className="pos-add-customer-input"
                      />
                    </td>
                    <td className="pos-add-customer-label-cell">
                      Ghi chú:
                    </td>
                    <td className="pos-add-customer-input-cell">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        placeholder="Ghi chú thêm..."
                        className="pos-add-customer-input"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer giữ đúng 2 nút Bỏ qua & Lưu khách hàng, đồng bộ nút POS */}
          <div className="pos-modal-footer pos-add-customer-footer">
            <button
              type="button"
              className="pos-btn-secondary-pill"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="pos-btn-primary-pill"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang lưu vào CSDL...</span>
                </>
              ) : (
                <span>Lưu khách hàng</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

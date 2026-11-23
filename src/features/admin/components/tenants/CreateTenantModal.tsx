import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Eye, EyeOff, Info, Store, UserCheck, X } from 'lucide-react';
import { tenantApi } from '../../api';
import type { CreateTenantPayload } from '../../api';
import './createTenantModal.css';

interface CreateTenantModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

const initialValues: CreateTenantPayload = {
  name: '',
  subdomain: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  password: '',
  address: '',
  city: '',
  taxCode: '',
};

export const CreateTenantModal = ({ onClose, onCreated }: CreateTenantModalProps) => {
  const [values, setValues] = useState(initialValues);
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  const update = (field: keyof CreateTenantPayload, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const payload: CreateTenantPayload = {
        ...values,
        name: values.name.trim(),
        subdomain: values.subdomain.trim().toLowerCase(),
        ownerName: values.ownerName.trim(),
        ownerEmail: values.ownerEmail.trim().toLowerCase(),
        ownerPhone: values.ownerPhone.trim(),
        address: values.address?.trim(),
        city: values.city?.trim(),
        taxCode: values.taxCode?.trim(),
      };
      if (payload.name.length < 2) throw new Error('Tên cửa hàng phải có ít nhất 2 ký tự.');
      if (payload.ownerName.length < 2 || !/^\p{L}[\p{L}\p{M}' -]*$/u.test(payload.ownerName)) {
        throw new Error('Họ tên chủ cửa hàng không hợp lệ.');
      }
      const response = await tenantApi.create(payload);
      if (!response.success || !response.data?.id) {
        throw new Error(response.message || 'Không thể tạo cửa hàng. Vui lòng thử lại.');
      }
      onCreated(response.data.id);
    } catch (cause) {
      const data = (cause as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      setError(data?.message || data?.detail || (cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="create-tenant-backdrop">
      <div
        className="create-tenant-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tenant-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onClose();
          if (event.key !== 'Tab') return;
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'
          );
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        {/* Header */}
        <header className="create-tenant-header">
          <span className="create-tenant-icon">
            <Building2 size={22} />
          </span>
          <div>
            <h2 id="create-tenant-title">Tạo cửa hàng mới</h2>
            <p>Khởi tạo chuỗi cửa hàng và tài khoản quản trị chủ sở hữu</p>
          </div>
          <button
            className="create-tenant-close"
            type="button"
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {/* Form Body - Thiết kế 2 Cột Rộng Ngang */}
        <form onSubmit={submit}>
          <div className="create-tenant-body">
            {error && <div className="create-tenant-error" role="alert">{error}</div>}

            <div className="create-tenant-columns">
              {/* CỘT 1: THÔNG TIN CỬA HÀNG */}
              <fieldset className="create-tenant-column" disabled={saving}>
                <div className="create-tenant-col-header">
                  <span className="create-tenant-step-badge">
                    <Store size={15} />
                  </span>
                  <div>
                    <h3>Thông tin cửa hàng</h3>
                    <p>Tên chuỗi, tên miền và địa chỉ kinh doanh</p>
                  </div>
                </div>

                <div className="create-tenant-fields">
                  <label>
                    Tên cửa hàng <span>*</span>
                    <input
                      value={values.name}
                      onChange={(event) => update('name', event.target.value)}
                      required
                      minLength={2}
                      maxLength={150}
                      placeholder="Nhập tên cửa hàng hoặc chuỗi"
                    />
                  </label>

                  <label>
                    Subdomain định danh <span>*</span>
                    <div className="create-tenant-subdomain-wrapper">
                      <input
                        value={values.subdomain}
                        onChange={(event) => update('subdomain', event.target.value.toLowerCase())}
                        required
                        minLength={3}
                        maxLength={63}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        title="3–63 ký tự gồm chữ thường, số và dấu gạch nối ở giữa"
                        placeholder="vi-du-cua-hang"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      <span className="create-tenant-subdomain-suffix">.thviet.vn</span>
                    </div>
                    <small>3–63 ký tự (chữ thường, số, dấu gạch nối).</small>
                  </label>

                  <div className="create-tenant-subgrid">
                    <label>
                      Mã số thuế
                      <input
                        value={values.taxCode}
                        onChange={(event) => update('taxCode', event.target.value)}
                        maxLength={50}
                        placeholder="Nhập mã số thuế"
                      />
                    </label>
                    <label>
                      Tỉnh / thành phố
                      <input
                        value={values.city}
                        onChange={(event) => update('city', event.target.value)}
                        maxLength={100}
                        placeholder="Nhập tỉnh / TP"
                      />
                    </label>
                  </div>

                  <label>
                    Địa chỉ kinh doanh
                    <input
                      value={values.address}
                      onChange={(event) => update('address', event.target.value)}
                      maxLength={255}
                      placeholder="Số nhà, tên đường, phường / xã"
                    />
                  </label>
                </div>
              </fieldset>

              {/* CỘT 2: TÀI KHOẢN CHỦ SỞ HỮU & ĐĂNG NHẬP */}
              <fieldset className="create-tenant-column" disabled={saving}>
                <div className="create-tenant-col-header">
                  <span className="create-tenant-step-badge">
                    <UserCheck size={15} />
                  </span>
                  <div>
                    <h3>Tài khoản chủ cửa hàng</h3>
                    <p>Thông tin liên hệ quản trị và mật khẩu đăng nhập</p>
                  </div>
                </div>

                <div className="create-tenant-fields">
                  <div className="create-tenant-subgrid">
                    <label>
                      Họ và tên <span>*</span>
                      <input
                        value={values.ownerName}
                        onChange={(event) => update('ownerName', event.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        placeholder="Họ và tên chủ tiệm"
                      />
                    </label>
                    <label>
                      Số điện thoại <span>*</span>
                      <input
                        type="tel"
                        value={values.ownerPhone}
                        onChange={(event) => update('ownerPhone', event.target.value)}
                        required
                        pattern="(03|05|07|08|09)[0-9]{8}"
                        maxLength={10}
                        inputMode="tel"
                        autoComplete="tel"
                        title="Số di động Việt Nam gồm 10 chữ số"
                        placeholder="Số ĐT đăng nhập"
                      />
                    </label>
                  </div>

                  <label>
                    Email liên hệ <span>*</span>
                    <input
                      type="email"
                      value={values.ownerEmail}
                      onChange={(event) => update('ownerEmail', event.target.value)}
                      required
                      maxLength={100}
                      autoComplete="email"
                      placeholder="Email chủ cửa hàng"
                    />
                  </label>

                  <label>
                    Mật khẩu ban đầu <span>*</span>
                    <div className="create-tenant-password">
                      <input
                        type={visiblePassword ? 'text' : 'password'}
                        value={values.password}
                        onChange={(event) => update('password', event.target.value)}
                        required
                        minLength={8}
                        maxLength={64}
                        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[^\s]+"
                        autoComplete="new-password"
                        aria-describedby="create-tenant-password-help"
                      />
                      <button
                        type="button"
                        onClick={() => setVisiblePassword(!visiblePassword)}
                        aria-label={visiblePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {visiblePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small id="create-tenant-password-help">
                      8–64 ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt).
                    </small>
                  </label>

                  <div className="create-tenant-plan-note">
                    <div className="create-tenant-plan-note-head">
                      <Info size={14} />
                      <strong>Kích hoạt gói dịch vụ</strong>
                    </div>
                    <p>
                      Chủ cửa hàng dùng SĐT và mật khẩu trên để đăng nhập, sau đó có thể trải nghiệm 3 ngày dùng thử hoặc kích hoạt gói dịch vụ.
                    </p>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          {/* Footer */}
          <footer className="create-tenant-footer">
            <button
              type="button"
              className="create-tenant-button"
              disabled={saving}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="create-tenant-button is-primary"
              disabled={saving}
            >
              {saving ? 'Đang tạo...' : 'Tạo cửa hàng'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

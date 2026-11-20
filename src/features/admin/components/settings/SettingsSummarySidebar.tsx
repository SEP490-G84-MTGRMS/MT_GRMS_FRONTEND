import type { UpdatePlatformSettingPayload } from '../../types/settings.types';

interface SettingsSummarySidebarProps {
  form: UpdatePlatformSettingPayload;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const SettingsSummarySidebar = ({ form, isDirty }: SettingsSummarySidebarProps) => (
  <aside className="settings-summary">
    <h2>{isDirty ? 'Thiết lập đang chỉnh sửa' : 'Thiết lập đã lưu'}</h2>
    <dl>
      <div><dt>Dùng thử</dt><dd>{Number.isFinite(form.trialDays) ? form.trialDays : '—'} ngày</dd></div>
      <div><dt>Ân hạn</dt><dd>{Number.isFinite(form.gracePeriodDays) ? form.gracePeriodDays : '—'} ngày</dd></div>
      <div><dt>Chi nhánh bổ sung</dt><dd>{Number.isFinite(form.branchAddonPriceMonthly) ? form.branchAddonPriceMonthly.toLocaleString('vi-VN') : '—'} đ / tháng</dd></div>
      <div><dt>Dung lượng bổ sung</dt><dd>{Number.isFinite(form.storageAddonPricePerGbMonthly) ? form.storageAddonPricePerGbMonthly.toLocaleString('vi-VN') : '—'} đ / GB / tháng</dd></div>
      <div><dt>Ngân hàng</dt><dd>{form.masterBankCode || '—'}</dd></div>
      <div><dt>Bảo trì</dt><dd><span className="plans-status">{form.isMaintenanceMode ? 'Bật' : 'Tắt'}</span></dd></div>
    </dl>
    <nav aria-label="Các nhóm cấu hình"><a href="#subscription-policy">Chính sách SaaS</a><a href="#master-vietqr">Master VietQR</a>
      <a href="#support-contact">Liên hệ CSKH</a><a href="#maintenance-mode">Bảo trì hệ thống</a></nav>
  </aside>
);

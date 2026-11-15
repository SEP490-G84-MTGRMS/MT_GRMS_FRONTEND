import { Wrench } from 'lucide-react';
import type { UpdatePlatformSettingPayload } from '../../types/settings.types';

interface MaintenanceModeCardProps {
  form: UpdatePlatformSettingPayload;
  onChange: (field: keyof UpdatePlatformSettingPayload, value: unknown) => void;
  disabled?: boolean;
}

export const MaintenanceModeCard = ({ form, onChange, disabled }: MaintenanceModeCardProps) => {
  const displayDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    // The field is always Vietnam local time, independent of the administrator's browser timezone.
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
  };
  return (
    <section className="settings-card" id="maintenance-mode">
      <header className="settings-card-header"><span className="plans-name-icon"><Wrench size={20} /></span>
        <div><h2>Bảo trì hệ thống</h2><p>Thiết lập trạng thái, nội dung thông báo và thời gian dự kiến.</p></div></header>
      <label className="settings-toggle-row">
        <span><strong>Chế độ bảo trì</strong><small>{form.isMaintenanceMode ? 'Đang bật trong cấu hình này' : 'Đang tắt trong cấu hình này'}</small></span>
        <input type="checkbox" role="switch" aria-label="Chế độ bảo trì" checked={form.isMaintenanceMode}
          disabled={disabled} onChange={event => onChange('isMaintenanceMode', event.target.checked)} />
      </label>
      <div className="settings-fields">
        <label className="settings-field-wide">Thông báo bảo trì
          <textarea rows={3} value={form.maintenanceMessage || ''} disabled={disabled}
            onChange={event => onChange('maintenanceMessage', event.target.value)} placeholder="Nội dung hiển thị cho khách hàng..." />
        </label>
        <label className="settings-field-wide">Dự kiến hoàn tất (giờ Việt Nam)
          <input type="datetime-local" value={displayDate(form.maintenanceExpectedEndTime)} disabled={disabled}
            onChange={event => onChange('maintenanceExpectedEndTime',
              event.target.value ? new Date(event.target.value + ':00+07:00').toISOString() : null)} />
        </label>
      </div>
      {form.isMaintenanceMode && <div className="settings-maintenance-preview">
        <strong>Xem trước thông báo</strong><p>{form.maintenanceMessage || 'Chưa có nội dung thông báo.'}</p></div>}
    </section>
  );
};

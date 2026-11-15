import { Headset } from 'lucide-react';
import type { UpdatePlatformSettingPayload } from '../../types/settings.types';

interface SupportContactCardProps {
  form: UpdatePlatformSettingPayload;
  onChange: (field: keyof UpdatePlatformSettingPayload, value: unknown) => void;
  disabled?: boolean;
}

export const SupportContactCard = ({ form, onChange, disabled }: SupportContactCardProps) => (
  <section className="settings-card" id="support-contact">
    <header className="settings-card-header"><span className="plans-name-icon"><Headset size={20} /></span>
      <div><h2>Liên hệ CSKH</h2><p>Các kênh hỗ trợ được cung cấp cho khách hàng.</p></div></header>
    <div className="settings-fields">
      <label>Hotline hỗ trợ
        <input required type="tel" maxLength={50} value={form.supportHotline} disabled={disabled}
          onChange={event => onChange('supportHotline', event.target.value)} />
      </label>
      <label>Email hỗ trợ
        <input required type="email" maxLength={100} value={form.supportEmail} disabled={disabled}
          onChange={event => onChange('supportEmail', event.target.value)} />
      </label>
      <label className="settings-field-wide">Liên hệ Zalo
        <input required maxLength={100} value={form.supportZalo} disabled={disabled}
          onChange={event => onChange('supportZalo', event.target.value)} />
      </label>
    </div>
  </section>
);

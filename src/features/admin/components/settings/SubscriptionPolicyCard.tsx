import { CalendarDays } from 'lucide-react';
import type { UpdatePlatformSettingPayload } from '../../types/settings.types';

interface SubscriptionPolicyCardProps {
  form: UpdatePlatformSettingPayload;
  onChange: (field: keyof UpdatePlatformSettingPayload, value: unknown) => void;
  disabled?: boolean;
}

export const SubscriptionPolicyCard = ({ form, onChange, disabled }: SubscriptionPolicyCardProps) => (
  <section className="settings-card" id="subscription-policy">
    <header className="settings-card-header"><span className="plans-name-icon"><CalendarDays size={20} /></span>
      <div><h2>Chính sách SaaS</h2><p>Thời hạn dùng thử, ân hạn và đơn giá tài nguyên mở rộng.</p></div></header>
    <div className="settings-fields">
      <label>Số ngày dùng thử
        <div className="settings-input-unit"><input type="number" required min={1} max={30} step={1}
          value={Number.isNaN(form.trialDays) ? '' : form.trialDays} disabled={disabled}
          onChange={event => onChange('trialDays', event.target.valueAsNumber)} /><span>ngày</span></div>
        <small>Từ 1 đến 30 ngày</small>
      </label>
      <label>Thời gian ân hạn
        <div className="settings-input-unit"><input type="number" required min={1} max={60} step={1}
          value={Number.isNaN(form.gracePeriodDays) ? '' : form.gracePeriodDays} disabled={disabled}
          onChange={event => onChange('gracePeriodDays', event.target.valueAsNumber)} /><span>ngày</span></div>
        <small>Từ 1 đến 60 ngày</small>
      </label>
      <label>Mua thêm chi nhánh
        <div className="settings-input-unit"><input type="number" required min={0} step={0.01}
          value={Number.isNaN(form.branchAddonPriceMonthly) ? '' : form.branchAddonPriceMonthly} disabled={disabled}
          onChange={event => onChange('branchAddonPriceMonthly', event.target.valueAsNumber)} /><span>đ / tháng</span></div>
      </label>
    </div>
  </section>
);

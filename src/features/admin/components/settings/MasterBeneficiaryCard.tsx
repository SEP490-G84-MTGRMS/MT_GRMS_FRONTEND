import { Landmark } from 'lucide-react';
import type { UpdatePlatformSettingPayload } from '../../types/settings.types';

interface MasterBeneficiaryCardProps {
  form: UpdatePlatformSettingPayload;
  onChange: (field: keyof UpdatePlatformSettingPayload, value: unknown) => void;
  disabled?: boolean;
}

const banks = [
  { code: 'MBBank', name: 'MB Bank (Ngân hàng Quân Đội)' },
  { code: 'Vietcombank', name: 'Vietcombank (Ngoại thương Việt Nam)' },
  { code: 'Techcombank', name: 'Techcombank (Kỹ thương Việt Nam)' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'BIDV', name: 'BIDV (Đầu tư và Phát triển Việt Nam)' },
  { code: 'VietinBank', name: 'VietinBank (Công thương Việt Nam)' },
  { code: 'TPBank', name: 'TPBank (Tiên Phong)' },
  { code: 'Sacombank', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'HDBank', name: 'HDBank (Phát triển TP.HCM)' },
];

export const MasterBeneficiaryCard = ({ form, onChange, disabled }: MasterBeneficiaryCardProps) => (
  <section className="settings-card" id="master-vietqr">
    <header className="settings-card-header"><span className="plans-name-icon"><Landmark size={20} /></span>
      <div><h2>Tài khoản Master VietQR</h2><p>Thông tin ngân hàng thụ hưởng của nền tảng.</p></div></header>
    <div className="settings-fields">
      <label>Mã ngân hàng
        <input required maxLength={50} list="settings-bank-codes" value={form.masterBankCode} disabled={disabled}
          onChange={event => {
            onChange('masterBankCode', event.target.value);
            const bank = banks.find(item => item.code === event.target.value);
            if (bank) onChange('masterBankName', bank.name);
          }} placeholder="Nhập hoặc chọn mã ngân hàng" />
        <datalist id="settings-bank-codes">{banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</datalist>
      </label>
      <label>Tên ngân hàng
        <input required minLength={2} maxLength={200} value={form.masterBankName} disabled={disabled}
          onChange={event => onChange('masterBankName', event.target.value)} placeholder="Nhập tên ngân hàng" />
      </label>
      <label>Số tài khoản
        <input required maxLength={50} pattern="[A-Za-z0-9]+" title="Số tài khoản chỉ gồm chữ và số" value={form.masterAccountNumber} disabled={disabled}
          onChange={event => onChange('masterAccountNumber', event.target.value)} autoComplete="off" />
      </label>
      <label>Tên chủ tài khoản
        <input required minLength={2} maxLength={200} value={form.masterAccountName} disabled={disabled}
          onChange={event => onChange('masterAccountName', event.target.value)} autoComplete="off" />
      </label>
    </div>
    <div className="settings-bank-summary"><span>Tài khoản thụ hưởng đang chỉnh sửa</span>
      <strong>{form.masterAccountName || '—'}</strong>
      <p>{form.masterBankName || '—'} · <b>{form.masterAccountNumber || '—'}</b></p></div>
  </section>
);

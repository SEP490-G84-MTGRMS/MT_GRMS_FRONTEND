import { useState, type FC, type FormEvent } from 'react';
import { Mail, ShieldCheck, X } from 'lucide-react';

interface Props {
  enable: boolean;
  onClose: () => void;
  onRequest: (password: string) => Promise<string>;
  onConfirm: (otp: string) => Promise<void>;
}

export const TwoFactorVerificationModal: FC<Props> = ({ enable, onClose, onRequest, onConfirm }) => {
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setBusy(true); setError('');
      setEmail(await onRequest(password));
      setStep('otp');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể gửi mã xác thực.'); }
    finally { setBusy(false); }
  };
  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setBusy(true); setError('');
      await onConfirm(otp);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Mã xác thực không hợp lệ.'); }
    finally { setBusy(false); }
  };

  return <div className="store-modal-backdrop" onClick={busy ? undefined : onClose}>
    <div className="store-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
      <div className="store-modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step === 'password' ? <ShieldCheck size={20} color="#0066FF" /> : <Mail size={20} color="#0066FF" />}
          <div className="store-modal-title">{enable ? 'Bật' : 'Tắt'} xác thực 2 lớp</div>
        </div>
        <button type="button" aria-label="Đóng" disabled={busy} onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
      </div>
      <form onSubmit={step === 'password' ? submitPassword : submitOtp}>
        <div className="store-modal-body">
          <p style={{ margin: 0, color: '#64748B', fontSize: 13.5 }}>
            {step === 'password' ? 'Nhập mật khẩu hiện tại để tiếp tục.' : `Nhập mã OTP vừa gửi tới ${email}.`}
          </p>
          {error && <div style={{ color: '#DC2626', background: '#FFF1F2', padding: '10px 12px', borderRadius: 12, fontSize: 13 }}>{error}</div>}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: '#334155' }}>{step === 'password' ? 'Mật khẩu hiện tại' : 'Mã OTP gồm 6 số'}</label>
            <input autoFocus required type={step === 'password' ? 'password' : 'text'} inputMode={step === 'otp' ? 'numeric' : undefined} maxLength={step === 'otp' ? 6 : undefined} value={step === 'password' ? password : otp} onChange={(e) => step === 'password' ? setPassword(e.target.value) : setOtp(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid #CBD5E1', fontSize: step === 'otp' ? 20 : 14, letterSpacing: step === 'otp' ? 6 : 0, textAlign: step === 'otp' ? 'center' : 'left' }} />
          </div>
        </div>
        <div className="store-modal-footer">
          <button type="button" onClick={onClose} disabled={busy} className="store-btn-secondary">Hủy</button>
          <button type="submit" disabled={busy} className="store-btn-primary">{busy ? 'Đang xử lý...' : step === 'password' ? 'Gửi mã Email' : 'Xác nhận'}</button>
        </div>
      </form>
    </div>
  </div>;
};

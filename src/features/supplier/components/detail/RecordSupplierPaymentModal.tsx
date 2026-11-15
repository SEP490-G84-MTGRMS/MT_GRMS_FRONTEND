import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Loader2, AlertCircle, Wallet } from 'lucide-react';
import type { APPaymentMethod } from '../../types/supplier.types';
import '../../supplier.css';

export interface RecordSupplierPaymentForm {
  amount: number;
  transactionDate: string;
  paymentMethod: APPaymentMethod;
  referenceNo: string;
  description: string;
  idempotencyKey: string;
  invoiceDocNo?: string;
}

export interface InvoicePaymentTarget {
  docNo: string;
  invoiceAmount: number;
  remainingAmount: number;
  description?: string;
}

interface Props {
  isOpen: boolean;
  supplierCode: string;
  supplierName: string;
  currentDebt: number;
  /** Thanh toán gắn một hóa đơn cụ thể */
  invoice?: InvoicePaymentTarget | null;
  onClose: () => void;
  onSubmit: (form: RecordSupplierPaymentForm) => Promise<void>;
}

function todayInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const METHOD_OPTIONS: { value: APPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'OTHER', label: 'Khác' },
];

const labelStyle = { fontSize: 13, fontWeight: 600, color: '#334155' } as const;
const inputStyle = {
  height: 38,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  padding: '0 12px',
  fontSize: 14,
  width: '100%',
} as const;

export const RecordSupplierPaymentModal: FC<Props> = ({
  isOpen,
  supplierCode,
  supplierName,
  currentDebt,
  invoice,
  onClose,
  onSubmit,
}) => {
  const maxPayable = invoice
    ? Math.min(invoice.remainingAmount, currentDebt)
    : currentDebt;

  const [amountText, setAmountText] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayInputValue());
  const [paymentMethod, setPaymentMethod] = useState<APPaymentMethod>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const suggested = maxPayable > 0 ? maxPayable : 0;
    setAmountText(suggested > 0 ? String(suggested) : '');
    setTransactionDate(todayInputValue());
    setPaymentMethod('CASH');
    setReferenceNo(invoice?.docNo || '');
    setDescription(
      invoice
        ? `Thanh toán hóa đơn ${invoice.docNo}`
        : `Thanh toán công nợ NCC ${supplierCode}`
    );
    setNote('');
    setIdempotencyKey(newIdempotencyKey());
    setFieldErrors({});
    setApiError(null);
    setIsSubmitting(false);
  }, [isOpen, currentDebt, supplierCode, invoice, maxPayable]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

  const validate = (): number | null => {
    const errors: Record<string, string> = {};
    const amount = Number(String(amountText).replace(/,/g, '').trim());

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Số tiền phải lớn hơn 0.';
    } else if (amount > currentDebt) {
      errors.amount = `Không được vượt dư nợ hiện tại (${fmt(currentDebt)}).`;
    } else if (invoice && amount > invoice.remainingAmount) {
      errors.amount = `Không được vượt số còn lại của hóa đơn (${fmt(invoice.remainingAmount)}).`;
    }

    if (!transactionDate) {
      errors.transactionDate = 'Vui lòng chọn ngày thanh toán.';
    }

    if (!description.trim()) {
      errors.description = 'Vui lòng nhập nội dung thanh toán.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0 ? amount : null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amount = validate();
    if (amount == null) return;

    setIsSubmitting(true);
    setApiError(null);
    try {
      const desc = note.trim()
        ? `${description.trim()} — ${note.trim()}`
        : description.trim();

      await onSubmit({
        amount,
        transactionDate: new Date(`${transactionDate}T12:00:00`).toISOString(),
        paymentMethod,
        referenceNo: (referenceNo.trim() || invoice?.docNo || ''),
        description: desc,
        idempotencyKey,
        invoiceDocNo: invoice?.docNo,
      });
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err?.message || 'Không thể ghi nhận thanh toán.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1060 }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--blue-light, #eff6ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary, #2563eb)',
              }}
            >
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1rem' }}>
                {invoice ? `Thanh toán hóa đơn` : 'Thanh toán NCC'}
              </h2>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {invoice
                  ? `${invoice.docNo} · ${supplierCode}`
                  : `${supplierCode} — ${supplierName}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#eff6ff',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div>
                Dư nợ NCC:{' '}
                <strong style={{ color: currentDebt > 0 ? '#b91c1c' : '#15803d' }}>
                  {fmt(currentDebt)}
                </strong>
              </div>
              {invoice && (
                <>
                  <div>
                    Giá trị hóa đơn: <strong>{fmt(invoice.invoiceAmount)}</strong>
                  </div>
                  <div>
                    Còn phải trả trên HĐ:{' '}
                    <strong style={{ color: '#c2410c' }}>{fmt(invoice.remainingAmount)}</strong>
                  </div>
                </>
              )}
              <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
                v1: thanh toán chưa ghi vào sổ quỹ.
              </div>
            </div>

            {apiError && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{apiError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Số tiền <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                max={maxPayable}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                disabled={isSubmitting}
                style={inputStyle}
              />
              {fieldErrors.amount && (
                <span style={{ fontSize: 12, color: '#dc2626' }}>{fieldErrors.amount}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  Ngày thanh toán <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  disabled={isSubmitting}
                  style={inputStyle}
                />
                {fieldErrors.transactionDate && (
                  <span style={{ fontSize: 12, color: '#dc2626' }}>
                    {fieldErrors.transactionDate}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  Hình thức <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as APPaymentMethod)}
                  disabled={isSubmitting}
                  style={inputStyle}
                >
                  {METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Gắn hóa đơn {invoice ? '(cố định)' : '(số tham chiếu)'}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="VD: GRN-20261115-001"
                disabled={isSubmitting || !!invoice}
                maxLength={100}
                style={{
                  ...inputStyle,
                  background: invoice ? '#f8fafc' : '#fff',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Nội dung <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                maxLength={400}
                style={inputStyle}
              />
              {fieldErrors.description && (
                <span style={{ fontSize: 12, color: '#dc2626' }}>{fieldErrors.description}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Ghi chú thêm</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
                style={inputStyle}
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '14px 20px',
              borderTop: '1px solid #edf2f9',
            }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting || maxPayable <= 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" /> Đang ghi...
                </>
              ) : (
                'Xác nhận chi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

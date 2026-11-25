import { useState, useEffect, useRef } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Banknote, Building2, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';
import type {
  SupplierSummary,
  RecordAPTransactionCommand,
  APPaymentMethod,
} from '../../types/supplier.types';
import { MoneyInput } from '../../../../components/common/MoneyInput';
import { formatMoney, numberToWordsVietnamese } from '../../../finance/utils/formatters';

interface Props {
  isOpen: boolean;
  supplier: SupplierSummary;
  currentDebt: number;
  actorName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (command: RecordAPTransactionCommand) => Promise<void>;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ap-pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const SupplierPayablePaymentModal: FC<Props> = ({
  isOpen,
  supplier,
  currentDebt,
  actorName,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<APPaymentMethod>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Giữ idempotencyKey ổn định cho cùng 1 lần nhập liệu để chống double-submit / retry trùng
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  useEffect(() => {
    if (!isOpen) return;
    setAmount(currentDebt > 0 ? Math.round(currentDebt) : 0);
    setPaymentMethod(supplier.bankAccount ? 'BANK_TRANSFER' : 'CASH');
    setReferenceNo('');
    setDescription(`Thanh toán công nợ NCC ${supplier.name}`);
    setErrorMsg('');
    setCopiedAccount(false);
    idempotencyKeyRef.current = generateIdempotencyKey();
  }, [isOpen, supplier.id, supplier.name, supplier.bankAccount, currentDebt]);

  if (!isOpen) return null;

  const isOverpaying = amount > currentDebt;
  const remainingAfter = Math.max(0, currentDebt - amount);

  const handleQuickAmount = (ratio: number) => {
    setAmount(Math.round(currentDebt * ratio));
    setErrorMsg('');
  };

  const handleCopyAccount = () => {
    if (!supplier.bankAccount) return;
    navigator.clipboard?.writeText(supplier.bankAccount).catch(() => {});
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 1800);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (currentDebt <= 0) {
      setErrorMsg('Nhà cung cấp hiện không còn dư nợ để thanh toán.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thanh toán lớn hơn 0 đ.');
      return;
    }
    if (isOverpaying) {
      setErrorMsg(`Số tiền thanh toán không được vượt quá dư nợ hiện tại (${formatMoney(currentDebt)}).`);
      return;
    }
    if (referenceNo.trim().length > 100) {
      setErrorMsg('Số tham chiếu tối đa 100 ký tự.');
      return;
    }
    if (description.trim().length > 500) {
      setErrorMsg('Nội dung diễn giải tối đa 500 ký tự.');
      return;
    }

    setErrorMsg('');
    try {
      await onConfirm({
        supplierId: supplier.id,
        docType: 'PaymentVoucher',
        docNo: '',
        amount,
        direction: -1,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        description: description.trim() || `Thanh toán công nợ NCC ${supplier.name}`,
        createdByName: actorName || 'Chủ cửa hàng',
        idempotencyKey: idempotencyKeyRef.current,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể ghi nhận thanh toán công nợ.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ap-payment-modal-title"
      data-testid="supplier-ap-payment-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <h3 id="ap-payment-modal-title" className="text-base font-bold text-emerald-950 m-0">
                Thanh toán công nợ nhà cung cấp
              </h3>
              <p className="text-xs text-emerald-800 m-0">
                Ghi nhận phiếu chi giảm dư nợ AP theo thời gian thực
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"
            >
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Supplier Debt Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">Nhà cung cấp</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {supplier.name} <span className="font-mono text-xs text-slate-500">({supplier.code})</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Dư nợ hiện tại</div>
              <div className="text-lg font-extrabold text-red-600 tabular-nums">
                {formatMoney(currentDebt)}
              </div>
            </div>
          </div>

          {/* Amount Input + Quick Chips */}
          <div className="space-y-2" data-testid="ap-payment-amount-wrap">
            <label className="block text-sm font-bold text-slate-900">
              Số tiền thanh toán (VNĐ) <span className="text-red-500">*</span>
            </label>
            <MoneyInput
              value={amount}
              onChange={(val) => {
                setAmount(val);
                setErrorMsg('');
              }}
              placeholder="0"
              className="w-full text-xl h-12 font-extrabold text-emerald-800"
            />
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-emerald-900 font-medium italic">
                {amount > 0 ? numberToWordsVietnamese(amount) : 'Chưa nhập số tiền'}
              </span>
              {amount > 0 && !isOverpaying && (
                <span className="text-slate-600 tabular-nums">
                  Còn lại sau trả: <strong>{formatMoney(remainingAfter)}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickAmount(0.5)}
                className="py-2 px-3 rounded-xl border border-teal-300 bg-teal-50 text-teal-900 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
              >
                Trả một nửa ({formatMoney(Math.round(currentDebt * 0.5))})
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(1)}
                className="py-2 px-3 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
              >
                Trả hết ({formatMoney(currentDebt)})
              </button>
            </div>

            {isOverpaying && (
              <p role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 m-0">
                Số tiền thanh toán không được vượt quá dư nợ hiện tại ({formatMoney(currentDebt)}).
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              Phương thức thanh toán <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="btn-ap-method-bank"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building2 size={18} />
                <div>
                  <div className="text-sm leading-tight">Chuyển khoản</div>
                  <div className="text-[11px] text-slate-500 font-normal">BANK_TRANSFER</div>
                </div>
              </button>

              <button
                type="button"
                data-testid="btn-ap-method-cash"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote size={18} />
                <div>
                  <div className="text-sm leading-tight">Tiền mặt</div>
                  <div className="text-[11px] text-slate-500 font-normal">CASH</div>
                </div>
              </button>
            </div>

            {paymentMethod === 'BANK_TRANSFER' && supplier.bankAccount && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    TK nhận NCC: {supplier.bankName || 'Ngân hàng'} — <span className="font-mono">{supplier.bankAccount}</span>
                  </div>
                  {supplier.accountHolder && (
                    <div className="text-sky-800 mt-0.5">Chủ TK: {supplier.accountHolder}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white text-sky-800 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-sky-100"
                >
                  {copiedAccount ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedAccount ? 'Đã chép' : 'Chép STK'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Reference No & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ap-payment-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                Mã tham chiếu / Số giao dịch (tùy chọn)
              </label>
              <input
                id="ap-payment-ref"
                data-testid="input-ap-payment-ref"
                type="text"
                maxLength={100}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={paymentMethod === 'BANK_TRANSFER' ? 'VD: FT261124000123' : 'VD: PC-001'}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label htmlFor="ap-payment-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung diễn giải
              </label>
              <input
                id="ap-payment-desc"
                data-testid="input-ap-payment-desc"
                type="text"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú thanh toán công nợ..."
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="admin-btn admin-btn-secondary"
              style={{ height: 38, padding: '0 16px', borderRadius: 8 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              data-testid="btn-ap-payment-submit"
              disabled={isSubmitting || amount <= 0 || isOverpaying || currentDebt <= 0}
              className="admin-btn admin-btn-primary"
              style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 8,
                gap: 6,
                backgroundColor: '#059669',
                borderColor: '#059669',
              }}
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


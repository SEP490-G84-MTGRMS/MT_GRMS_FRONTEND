import { useState, useEffect, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import { X, QrCode, Banknote, AlertTriangle } from 'lucide-react';
import type { CollectDebtInput, CustomerDto } from '../types/customer.types';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { VietQrDisplayCard } from './VietQrDisplayCard';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { MoneyInput } from '../../../components/common/MoneyInput';
import { formatMoney } from '../../finance/utils/formatters';
import { buildVietQrUrl, normalizeVietQrContent } from '../../../utils/vietQrHelper';

interface DebtCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDto | null;
  onConfirm: (data: CollectDebtInput) => Promise<void>;
  isSubmitting: boolean;
}

export const DebtCollectionModal: FC<DebtCollectionModalProps> = ({
  isOpen,
  onClose,
  customer,
  onConfirm,
  isSubmitting,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'Cash' | 'VietQR'>('VietQR');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [transactionRef, setTransactionRef] = useState('');
  const [bankPaymentConfirmed, setBankPaymentConfirmed] = useState(false);
  const [accountLoadFailed, setAccountLoadFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setAccounts([]);
    setAccountLoadFailed(false);
    cashbookService.getCashAccounts().then((accs) => {
      if (isMounted) {
        setAccounts(accs);
      }
    }).catch(() => {
      if (isMounted) setAccountLoadFailed(true);
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((a) =>
        method === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'
      ),
    [accounts, method]
  );

  useEffect(() => {
    if (filteredAccounts.length > 0) {
      const isSelectedValid = filteredAccounts.some((a) => a.id === selectedAccountId);
      if (!isSelectedValid) {
        const defaultAcc = filteredAccounts.find((a) => a.isDefault) || filteredAccounts[0];
        setSelectedAccountId(defaultAcc.id);
      }
    } else {
      setSelectedAccountId('');
    }
  }, [method, filteredAccounts, selectedAccountId]);

  const selectedAccount = filteredAccounts.find((a) => a.id === selectedAccountId);

  useEffect(() => {
    if (customer) {
      setAmount(0); // Spec: Leave blank/0 initially
      setMethod('VietQR');
      setNote(`Thu hồi công nợ khách hàng ${customer.fullName}`);
      setErrorMsg('');
      setTransactionRef('');
    }
  }, [customer, isOpen]);

  useEffect(() => {
    setBankPaymentConfirmed(false);
  }, [amount, method, selectedAccountId, customer?.id, isOpen]);

  if (!isOpen || !customer) return null;

  const currentDebt = customer.currentDebtAR || 0;
  const isOverpaying = amount > currentDebt;

  const qrPaymentContent = normalizeVietQrContent(`THU NO KH ${customer.fullName}`);
  const qrUrl = !isOverpaying ? buildVietQrUrl({
    bankCode: selectedAccount?.bankCode,
    accountNumber: selectedAccount?.accountNumber,
    accountHolderName: selectedAccount?.accountHolderName,
    amount,
    description: qrPaymentContent,
  }) : null;

  const canSubmit = !isSubmitting && amount > 0 && !isOverpaying && Boolean(selectedAccount) &&
    (method === 'Cash' || (Boolean(qrUrl) && bankPaymentConfirmed));

  const handleSetQuickAmount = (pct: number) => {
    const calculated = Math.round(currentDebt * pct);
    setAmount(calculated);
    setErrorMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền cần thu lớn hơn 0đ');
      return;
    }

    if (!canSubmit) return;

    setErrorMsg('');
    await onConfirm({
      customerId: customer.id,
      amount,
      method,
      targetAccountId: selectedAccountId,
      note,
      transactionRef: method === 'VietQR' ? transactionRef.trim() || undefined : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-finance overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-[20px] max-w-4xl w-full shadow-2xl overflow-hidden border border-gray-200 my-auto flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                Thu nợ khách hàng
              </h3>
              <p className="text-xs text-emerald-800">
                Khách quét VietQR Napas 247 hoặc nhận tiền mặt tại quầy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="dcm-close-btn"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: 2 Columns (5/7) */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="p-6 space-y-6" style={{ minHeight: 0, flex: '1 1 auto', overflowY: 'auto' }}>
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column (5/12): Amount & Customer Info */}
            <div className="md:col-span-5 space-y-5">
              {/* Customer Info Card */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <span className="text-xs text-gray-500 font-semibold block uppercase">
                  Khách hàng:
                </span>
                <span className="text-base font-bold text-gray-900 block">
                  {customer.fullName} · {customer.phoneNumber}
                </span>
                <div className="pt-2 border-t border-gray-200 mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-gray-600">Đang nợ mình:</span>
                  <span className="text-xl font-extrabold text-red-600 tabular-nums">
                    {formatMoney(currentDebt)}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900">
                  Thu bao nhiêu?
                </label>

                <MoneyInput
                  value={amount}
                  onChange={(val) => {
                    setAmount(val);
                    setErrorMsg('');
                  }}
                  placeholder="0"
                  className="w-full text-2xl h-14 font-extrabold text-teal-800"
                />

                {/* Quick Selection Chips */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSetQuickAmount(0.5)}
                    className="dcm-quick-btn dcm-quick-btn--half"
                  >
                    Thu một nửa ({formatMoney(Math.round(currentDebt * 0.5))})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickAmount(1)}
                    className="dcm-quick-btn dcm-quick-btn--full"
                  >
                    Thu hết ({formatMoney(currentDebt)})
                  </button>
                </div>
              </div>

              {isOverpaying && (
                <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Số tiền thu không được vượt quá dư nợ {formatMoney(currentDebt)}.
                </p>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ghi chú phiếu thu:
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-300 focus:border-teal-600 outline-none"
                />
              </div>
            </div>

            {/* Right Column (7/12): Payment Method & VietQR Display */}
            <div className="md:col-span-7 bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
              {/* Method Switcher */}
              <div className="dcm-method-group">
                <button
                  type="button"
                  onClick={() => setMethod('VietQR')}
                  className={`dcm-method-btn ${method === 'VietQR' ? 'dcm-method-btn--active' : ''}`}
                >
                  <QrCode size={18} />
                  <span>Chuyển khoản QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('Cash')}
                  className={`dcm-method-btn ${method === 'Cash' ? 'dcm-method-btn--active' : ''}`}
                >
                  <Banknote size={18} />
                  <span>Tiền mặt tại quầy</span>
                </button>
              </div>

              {/* Account Selection Dropdown */}
              <div className="space-y-1.5">
                <label
                  htmlFor="target-account-select"
                  className="block text-xs font-bold text-gray-700"
                >
                  {method === 'Cash' ? 'Két quầy nhận tiền:' : 'Tài khoản ngân hàng nhận tiền:'}
                </label>
                <select
                  id="target-account-select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium rounded-xl border border-gray-300 bg-white text-gray-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
                >
                  {filteredAccounts.length === 0 ? (
                    <option value="" disabled>
                      {method === 'Cash'
                        ? '-- Không có két tiền mặt khả dụng --'
                        : '-- Không có tài khoản ngân hàng khả dụng --'}
                    </option>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* VietQR View */}
              {method === 'VietQR' ? (
                <div className="space-y-4 text-center">
                  {qrUrl && selectedAccount ? (
                    <VietQrDisplayCard
                      key={qrUrl}
                      config={{
                        bankId: selectedAccount.bankCode!,
                        bankName: selectedAccount.bankName || selectedAccount.bankCode!,
                        accountNo: selectedAccount.accountNumber!,
                        accountName: selectedAccount.accountHolderName!,
                        amount,
                        description: qrPaymentContent,
                        qrDataUrl: qrUrl,
                      }}
                    />
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600" role="status">
                      {amount <= 0 ? 'Nhập số tiền cần thu để tạo mã QR.' : isOverpaying
                        ? 'Số tiền thu không được vượt quá dư nợ.'
                        : 'Tài khoản chưa đủ thông tin VietQR. Vui lòng cấu hình mã ngân hàng, số tài khoản và tên chủ tài khoản.'}
                    </div>
                  )}

                  <label className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-left text-sm text-teal-900">
                    <input type="checkbox" checked={bankPaymentConfirmed} disabled={!qrUrl || isSubmitting}
                      onChange={(event) => setBankPaymentConfirmed(event.target.checked)} />
                    Tôi đã kiểm tra tiền vào tài khoản
                  </label>
                  <label className="flex w-full flex-col gap-2 text-left text-xs text-teal-900">
                    <span className="font-semibold">Mã giao dịch ngân hàng (không bắt buộc)</span>
                    <input
                      type="text"
                      maxLength={100}
                      value={transactionRef}
                      onChange={(event) => setTransactionRef(event.target.value)}
                      className="dcm-text-input font-mono"
                    />
                  </label>
                </div>
              ) : (
                /* Cash View */
                <div className="p-6 rounded-2xl bg-white border border-gray-200 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Banknote size={30} />
                  </div>
                  <h4 className="text-base font-bold text-gray-900">
                    Thu tiền mặt tại quầy thu ngân
                  </h4>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto">
                    Tiền mặt sau khi thu sẽ tự động ghi tăng vào{' '}
                    <strong>{selectedAccount ? selectedAccount.accountName : 'Két quầy ca hiện tại'}</strong>{' '}
                    và sinh phiếu thu trong Sổ quỹ.
                  </p>
                </div>
              )}
            </div>
          </div>

          {accountLoadFailed && <p role="alert" className="mt-3 text-sm text-red-700">Không thể tải tài khoản nhận tiền. Mở lại biểu mẫu để thử lại.</p>}
          </div>
          {/* Footer luôn nằm ngoài vùng cuộn của nội dung. */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="dcm-cancel-btn"
            >
              Hủy bỏ
            </button>

            {/* Decision D5: Green button for collecting debt */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-collect-debt text-lg min-w-[200px] shadow-lg"
              id="btn-confirm-collect-debt"
            >
              {isSubmitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <span>Thu {amount > 0 ? formatMoney(amount) : ''}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

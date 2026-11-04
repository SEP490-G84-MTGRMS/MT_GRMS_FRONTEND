import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, QrCode, Banknote, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import type { CustomerDto } from '../types/customer.types';
import { VietQrDisplayCard } from './VietQrDisplayCard';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { MoneyInput } from '../../../components/common/MoneyInput';
import { formatMoney, numberToWordsVietnamese } from '../../finance/utils/formatters';

interface DebtCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDto | null;
  onConfirm: (data: {
    customerId: string;
    amount: number;
    method: 'Cash' | 'VietQR';
    targetAccountId?: string;
    note?: string;
    excessAmount?: number;
    transactionRef?: string;
  }) => Promise<void>;
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
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Overpayment (Trả thừa) Handling - Decision D4
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Webhook Fallback Handling - Decision D3
  const [showManualRefInput, setShowManualRefInput] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [isWaitingWebhook, setIsWaitingWebhook] = useState(true);
  const [isCopiedContent, setIsCopiedContent] = useState(false);

  useEffect(() => {
    cashbookService.getCashAccounts().then((accs) => {
      const matched = accs.find((a) =>
        method === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'
      );
      if (matched) setSelectedAccountId(matched.id);
    });
  }, [method]);

  useEffect(() => {
    if (customer) {
      setAmount(0); // Spec: Leave blank/0 initially
      setMethod('VietQR');
      setNote(`Thu hồi công nợ khách hàng ${customer.fullName}`);
      setErrorMsg('');
      setShowOverpaymentDialog(false);
      setShowManualRefInput(false);
      setTransactionRef('');
      setIsWaitingWebhook(true);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const currentDebt = customer.currentDebtAR || 0;
  const isOverpaying = amount > currentDebt;
  const excessAmount = isOverpaying ? amount - currentDebt : 0;
  const requiresManagerPin = excessAmount > 1_000_000 || excessAmount > currentDebt * 0.2;

  const qrPaymentContent = `THU NO KH ${customer.fullName.toUpperCase().replace(/\s+/g, ' ')}`;

  const handleCopyContent = () => {
    navigator.clipboard.writeText(qrPaymentContent);
    setIsCopiedContent(true);
    setTimeout(() => setIsCopiedContent(false), 2000);
  };

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

    // Check if overpayment requires confirmation dialog
    if (isOverpaying && !showOverpaymentDialog) {
      setShowOverpaymentDialog(true);
      return;
    }

    if (isOverpaying && requiresManagerPin && managerPin !== '1234') {
      setPinError('Mã PIN xác nhận chủ tiệm không đúng (Mặc định: 1234)');
      return;
    }

    setErrorMsg('');
    await onConfirm({
      customerId: customer.id,
      amount,
      method,
      targetAccountId: selectedAccountId,
      note: note + (isOverpaying ? ` (Ghi nhận tiền gửi thừa: ${formatMoney(excessAmount)})` : ''),
      excessAmount: isOverpaying ? excessAmount : 0,
      transactionRef: transactionRef || undefined,
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
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/70">
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
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: 2 Columns (5/7) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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

                {/* Amount in Words */}
                <div className="text-xs text-teal-900 font-medium italic min-h-[1.25rem]">
                  {amount > 0 ? numberToWordsVietnamese(amount) : 'Chưa nhập số tiền'}
                </div>

                {/* Quick Selection Chips */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSetQuickAmount(0.5)}
                    className="py-2.5 px-3 rounded-xl border border-teal-300 bg-teal-50 text-teal-900 text-xs font-semibold hover:bg-teal-100 transition-colors"
                  >
                    Thu một nửa ({formatMoney(Math.round(currentDebt * 0.5))})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickAmount(1)}
                    className="py-2.5 px-3 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Thu hết ({formatMoney(currentDebt)})
                  </button>
                </div>
              </div>

              {/* Overpayment Warning/Prompt - Decision D4 */}
              {isOverpaying && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle size={18} className="text-amber-700" />
                    <span>Khách trả thừa tiền</span>
                  </div>
                  <p className="text-xs text-amber-900">
                    Khách nợ <strong>{formatMoney(currentDebt)}</strong>, bạn nhập{' '}
                    <strong>{formatMoney(amount)}</strong> (thừa{' '}
                    <strong className="text-red-700">{formatMoney(excessAmount)}</strong>).
                  </p>
                  <p className="text-xs text-gray-700">
                    Hệ thống sẽ ghi nhận <strong>{formatMoney(excessAmount)}</strong> vào Quỹ Đặt cọc /
                    Trả trước của khách để cấn trừ vào các đơn hàng sau.
                  </p>

                  {requiresManagerPin && (
                    <div className="pt-2 border-t border-amber-200">
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Khoản thừa lớn (&gt;20% nợ) - Nhập PIN chủ tiệm:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Mã PIN 4 số (1234)"
                        value={managerPin}
                        onChange={(e) => {
                          setManagerPin(e.target.value);
                          setPinError('');
                        }}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-amber-300 outline-none"
                      />
                      {pinError && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          {pinError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
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
              <div className="flex rounded-xl bg-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setMethod('VietQR')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    method === 'VietQR'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode size={18} />
                  <span>Chuyển khoản QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('Cash')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    method === 'Cash'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Banknote size={18} />
                  <span>Tiền mặt tại quầy</span>
                </button>
              </div>

              {/* VietQR View */}
              {method === 'VietQR' ? (
                <div className="space-y-4 text-center">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 inline-block shadow-sm">
                    <VietQrDisplayCard
                      config={{
                        bankId: '970436',
                        bankName: 'Vietcombank',
                        accountNo: '0071001234567',
                        accountName: 'NGUYEN VAN CHU TIEM',
                        amount: Math.min(amount, currentDebt),
                        description: qrPaymentContent,
                        qrDataUrl: 'https://api.vietqr.io/image/970436-0071001234567-compact2.png',
                      }}
                    />
                  </div>

                  {/* Transfer details copy helper */}
                  <div className="text-left bg-white p-3 rounded-xl border border-gray-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Nội dung chuyển khoản:</span>
                      <button
                        type="button"
                        onClick={handleCopyContent}
                        className="text-teal-700 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <Copy size={13} />
                        <span>{isCopiedContent ? 'Đã sao chép!' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <div className="font-mono font-bold text-gray-900 text-sm bg-gray-50 p-1.5 rounded border border-gray-100">
                      {qrPaymentContent}
                    </div>
                  </div>

                  {/* Webhook Status & Fallback Button - Decision D3 */}
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex flex-col items-center gap-2">
                    {isWaitingWebhook && !transactionRef ? (
                      <div className="flex items-center gap-2 text-teal-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping inline-block" />
                        <span>Đang chờ tín hiệu biến động số dư từ ngân hàng...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span>Đã có mã xác nhận đối soát: {transactionRef}</span>
                      </div>
                    )}

                    {!showManualRefInput && (
                      <button
                        type="button"
                        onClick={() => setShowManualRefInput(true)}
                        className="text-teal-700 font-semibold underline hover:text-teal-900 mt-1"
                      >
                        Khách đã chuyển thành công nhưng hệ thống chưa tự nhận?
                      </button>
                    )}

                    {showManualRefInput && (
                      <div className="w-full pt-2 border-t border-teal-200 space-y-2 text-left">
                        <label className="block text-xs font-bold text-gray-800">
                          Nhập mã giao dịch ngân hàng (FT...):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ví dụ: FT2630098234"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="flex-1 h-9 px-3 text-xs rounded-lg border border-gray-300 outline-none uppercase font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (transactionRef.trim()) {
                                setIsWaitingWebhook(false);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                          >
                            Xác nhận bằng mắt
                          </button>
                        </div>
                        <span className="text-[11px] text-gray-500 block">
                          Phiếu thu sẽ được ghi nhận trạng thái <strong>Chờ đối soát</strong>.
                        </span>
                      </div>
                    )}
                  </div>
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
                    Tiền mặt sau khi thu sẽ tự động ghi tăng vào <strong>Két quầy ca hiện tại</strong>{' '}
                    và sinh phiếu thu trong Sổ quỹ.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sheet Footer: Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-text-cancel"
            >
              Hủy bỏ
            </button>

            {/* Decision D5: Green button for collecting debt */}
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="btn-collect-debt text-lg min-w-[200px] shadow-lg disabled:opacity-50"
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

import { useState, useEffect, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { X, ArrowLeft, Check, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import type { CashAccount } from '../types/cashbook.types';
import { formatMoney } from '../../finance/utils/formatters';

interface CashReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CashAccount | null;
  onSubmit: (data: {
    accountId: string;
    actualBalance: number;
    difference: number;
    reason: string;
    countedBy: string;
    denominations: Record<number, number>;
  }) => Promise<void>;
}

// 9 Standard Vietnamese Polymer Denominations
const DENOMINATIONS = [
  { value: 500_000, label: '500.000đ', color: '#1E40AF', bgColor: '#DBEAFE' },
  { value: 200_000, label: '200.000đ', color: '#B45309', bgColor: '#FEF3C7' },
  { value: 100_000, label: '100.000đ', color: '#047857', bgColor: '#D1FAE5' },
  { value: 50_000, label: '50.000đ', color: '#B91C1C', bgColor: '#FEE2E2' },
  { value: 20_000, label: '20.000đ', color: '#0284C7', bgColor: '#E0F2FE' },
  { value: 10_000, label: '10.000đ', color: '#4B5563', bgColor: '#F3F4F6' },
  { value: 5_000, label: '5.000đ', color: '#4338CA', bgColor: '#E0E7FF' },
  { value: 2_000, label: '2.000đ', color: '#6B7280', bgColor: '#F3F4F6' },
  { value: 1_000, label: '1.000đ', color: '#374151', bgColor: '#F9FAFB' },
];

export const CashReconciliationModal: FC<CashReconciliationModalProps> = ({
  isOpen,
  onClose,
  account,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [counts, setCounts] = useState<Record<number, number>>({
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });

  const [touchedDenoms, setTouchedDenoms] = useState<Record<number, boolean>>({});
  const [countedBy] = useState('Trần Thị Lan (Thu ngân)');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const denomRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Restore Draft if exists
  useEffect(() => {
    if (isOpen && account) {
      setStep(1);
      const draftKey = `reconcile_draft_${account.id}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCounts(parsed.counts || {});
          setTouchedDenoms(parsed.touched || {});
        } catch {
          // ignore invalid draft
        }
      }
    }
  }, [isOpen, account]);

  // Save Draft on change
  const saveDraft = () => {
    if (account) {
      localStorage.setItem(
        `reconcile_draft_${account.id}`,
        JSON.stringify({ counts, touched: touchedDenoms, timestamp: Date.now() })
      );
    }
  };

  const clearDraft = () => {
    if (account) {
      localStorage.removeItem(`reconcile_draft_${account.id}`);
    }
  };

  // Calculations
  const totalCounted = useMemo(() => {
    return Object.entries(counts).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [counts]);

  // System balance (Strictly hidden until Step 3)
  const systemBalance = account?.currentBalance || 12_500_000;
  const difference = totalCounted - systemBalance;

  // Un-entered denominations count
  const unenteredDenoms = DENOMINATIONS.filter((d) => !touchedDenoms[d.value]);

  const updateCount = (denom: number, newCount: number) => {
    const validCount = Math.max(0, isNaN(newCount) ? 0 : Math.floor(newCount));
    setCounts((prev) => ({ ...prev, [denom]: validCount }));
    setTouchedDenoms((prev) => ({ ...prev, [denom]: true }));
  };

  const scrollToFirstUnentered = () => {
    if (unenteredDenoms.length > 0) {
      const firstVal = unenteredDenoms[0].value;
      const el = denomRefs.current[firstVal];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleExit = () => {
    if (totalCounted > 0) {
      const save = window.confirm(
        'Bạn có muốn lưu nháp số tiền đã đếm để lần sau đếm tiếp không?\n\n• Bấm OK: Lưu nháp\n• Bấm Cancel: Bỏ kết quả đếm'
      );
      if (save) {
        saveDraft();
      } else {
        clearDraft();
      }
    }
    onClose();
  };

  const handleStep1Next = () => {
    if (totalCounted === 0) {
      const confirmZero = window.confirm(
        'Tất cả mệnh giá đều bằng 0đ (két đang trống).\nBạn có chắc chắn két quầy hoàn toàn không có tiền mặt không?'
      );
      if (!confirmZero) return;
    }
    saveDraft();
    setStep(2);
  };

  const handlePinSubmit = () => {
    if (pin.length < 4) {
      setPinError('Vui lòng nhập đủ 4 số PIN');
      return;
    }

    if (pinAttempts >= 5) {
      setPinError('Bạn đã nhập sai PIN quá 5 lần. Vui lòng nhờ chủ tiệm hỗ trợ.');
      return;
    }

    // Default pin for demo: 1234
    if (pin !== '1234') {
      setPinAttempts((p) => p + 1);
      setPinError(`Mã PIN không đúng (Còn ${4 - pinAttempts} lần thử)`);
      return;
    }

    setPinError('');
    setStep(3); // Open results
  };

  const handleFinalSubmit = async () => {
    if (difference !== 0 && !discrepancyReason) {
      alert('Vui lòng chọn lý do phát sinh chênh lệch tiền');
      return;
    }

    setIsSubmitting(true);
    try {
      if (account) {
        await onSubmit({
          accountId: account.id,
          actualBalance: totalCounted,
          difference,
          reason: discrepancyReason + (customNote ? ` - ${customNote}` : ''),
          countedBy,
          denominations: counts,
        });
      }
      clearDraft();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !account) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F7F8F7] flex flex-col font-finance"
      style={{ backgroundColor: '#F8FAFC', zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Thoát</span>
          </button>

          <div>
            <h2
              className="text-base sm:text-lg font-bold text-gray-900 leading-tight"
              style={{ maxWidth: 'calc(100vw - 190px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={`Kiểm két cuối ca: ${account.accountName}`}
            >
              Kiểm két cuối ca: {account.accountName}
            </h2>
            <span className="text-xs text-gray-500 mt-1 inline-block">
              Quy trình kiểm quỹ mù 3 bước
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#115E59] bg-[#F0FDFA] px-3 py-1 rounded-full border border-teal-200">
            Bước {step} / 3
          </span>
          <button
            type="button"
            onClick={handleExit}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 w-full">
        <div
          className="h-full bg-[#115E59] transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Main Body per Step */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
        {/* ================= STEP 1: BLIND COUNTING ================= */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Denominations List (7/12) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-900 flex items-start gap-3">
                <ShieldCheck className="shrink-0 text-teal-700 mt-0.5" size={20} />
                <div>
                  <strong className="block font-semibold">Quy tắc đếm két khách quan</strong>
                  <span>
                    Đếm tiền thực tế trong két và nhập số tờ tương ứng. Hệ thống chưa hiển thị số
                    dư sổ sách để bảo đảm kết quả kiểm ca trung thực và khách quan.
                  </span>
                </div>
              </div>

              {DENOMINATIONS.map((denom) => {
                const count = counts[denom.value] || 0;
                const subtotal = denom.value * count;
                const isTouched = touchedDenoms[denom.value];

                return (
                  <div
                    key={denom.value}
                    ref={(el) => {
                      denomRefs.current[denom.value] = el;
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isTouched && count > 0
                        ? 'bg-[#F0FDFA] border-teal-400 shadow-sm'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Denomination Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className="w-14 h-8 rounded-md flex items-center justify-center font-bold text-xs shadow-inner"
                        style={{ backgroundColor: denom.bgColor, color: denom.color }}
                      >
                        {denom.label}
                      </div>
                      <span className="font-semibold text-gray-900 text-base sm:text-lg tabular-nums">
                        {denom.label}
                      </span>
                    </div>

                    {/* Counter Buttons & Input */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCount(denom.value, count - 1)}
                        className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-bold flex items-center justify-center select-none active:scale-95 transition-transform"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={count === 0 && !isTouched ? '' : count}
                        placeholder="0"
                        onChange={(e) =>
                          updateCount(denom.value, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-20 sm:w-24 h-12 text-center text-lg sm:text-xl font-bold rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none tabular-nums"
                      />

                      <button
                        type="button"
                        onClick={() => updateCount(denom.value, count + 1)}
                        className="w-12 h-12 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-900 text-xl font-bold flex items-center justify-center select-none active:scale-95 transition-transform"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right shrink-0 min-w-[100px] sm:min-w-[120px]">
                      <span
                        className={`text-base sm:text-lg font-bold tabular-nums ${
                          count > 0 ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {formatMoney(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Sticky Summary Panel (5/12) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm space-y-4">
                <span className="text-sm font-medium text-gray-500">Tổng tiền đã đếm</span>
                <div className="text-4xl sm:text-5xl font-extrabold text-teal-800 tabular-nums">
                  {formatMoney(totalCounted)}
                </div>

                {unenteredDenoms.length > 0 ? (
                  <button
                    type="button"
                    onClick={scrollToFirstUnentered}
                    className="w-full text-left p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between hover:bg-amber-100 transition-colors"
                  >
                    <span>
                      Còn <strong>{unenteredDenoms.length}</strong> mệnh giá chưa nhập
                    </span>
                    <span className="font-semibold text-xs text-amber-800 underline">
                      Xem ngay ›
                    </span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                    <Check size={18} className="text-emerald-600" />
                    <span>Đã kiểm kê đủ 9 mệnh giá</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="w-full btn-primary-teal py-4 text-lg justify-center shadow-md"
                  >
                    <span>Xác nhận & Sang bước 2 ›</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: OPERATOR & PIN CONFIRMATION ================= */}
        {step === 2 && (
          <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-[16px] border border-gray-200 shadow-sm space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">Xác nhận Người kiểm két</h3>
              <p className="text-sm text-gray-600 mt-1">
                Nhập mã PIN 4 số của thu ngân ca để niêm phong kết quả đếm
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Người thực hiện:</span>
              <span className="font-bold text-gray-900">{countedBy}</span>
            </div>

            {/* PIN Keypad Display */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Mã PIN cá nhân (Mặc định demo: 1234)
              </label>
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-xl border-2 border-gray-300 flex items-center justify-center text-2xl font-bold text-teal-800"
                  >
                    {pin[i] ? '●' : ''}
                  </div>
                ))}
              </div>
              {pinError && (
                <p className="text-xs text-red-600 font-semibold text-center mt-2">
                  {pinError}
                </p>
              )}
            </div>

            {/* 0-9 Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => pin.length < 4 && setPin((p) => p + digit)}
                  className="h-14 rounded-xl bg-gray-50 hover:bg-gray-200 text-xl font-bold text-gray-800 active:scale-95 transition-transform"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => pin.length < 4 && setPin((p) => p + '0')}
                className="h-14 rounded-xl bg-gray-50 hover:bg-gray-200 text-xl font-bold text-gray-800"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600"
              >
                ←
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 btn-text-cancel"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                className="w-2/3 btn-primary-teal justify-center"
              >
                Xem kết quả đối soát ›
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: RECONCILIATION RESULT ================= */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-[16px] border border-gray-200 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-bold text-gray-900">Kết quả Kiểm kê Đối soát</h3>
              <p className="text-sm text-gray-600">
                So sánh số tiền đếm thực tế với số dư hệ thống ghi nhận
              </p>
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-semibold block uppercase">
                  Bạn đếm thực tế
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums mt-1 block">
                  {formatMoney(totalCounted)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-semibold block uppercase">
                  Sổ sách hệ thống ghi
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums mt-1 block">
                  {formatMoney(systemBalance)}
                </span>
              </div>
            </div>

            {/* Verdict Status Box */}
            {difference === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h4 className="text-xl font-bold text-emerald-950">Khớp đúng 100% (Đủ tiền)</h4>
                <p className="text-sm text-emerald-800">
                  Số tiền kiểm kê trùng khớp hoàn toàn với số dư sổ quỹ. Két quầy an toàn để giao ca!
                </p>
              </div>
            ) : (
              <div
                className={`p-6 rounded-2xl border text-center space-y-2 ${
                  difference < 0
                    ? 'bg-red-50 border-red-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full text-white flex items-center justify-center mx-auto ${
                    difference < 0 ? 'bg-red-600' : 'bg-amber-600'
                  }`}
                >
                  <AlertTriangle size={28} />
                </div>
                <h4
                  className={`text-xl font-bold ${
                    difference < 0 ? 'text-red-950' : 'text-amber-950'
                  }`}
                >
                  {difference < 0 ? 'Thiếu tiền trong két' : 'Thừa tiền trong két'}
                </h4>
                <div
                  className={`text-3xl sm:text-4xl font-extrabold tabular-nums ${
                    difference < 0 ? 'text-red-700' : 'text-amber-800'
                  }`}
                >
                  {formatMoney(difference)}
                </div>
                <p className="text-xs text-gray-600 max-w-md mx-auto">
                  Hệ thống sẽ tự động lập phiếu điều chỉnh kiểm kê để cân đối sổ cái. Vui lòng chọn
                  lý do bên dưới:
                </p>
              </div>
            )}

            {/* Reason Selection if Discrepancy */}
            {difference !== 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-900">
                  Lý do chênh lệch tiền (Bắt buộc chọn):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    'Trả nhầm tiền thối cho khách',
                    'Quên chưa ghi phiếu chi/thu',
                    'Chưa rõ nguyên nhân (Chờ rà soát)',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDiscrepancyReason(r)}
                      className={`p-3.5 rounded-xl border text-left text-sm font-semibold transition-all ${
                        discrepancyReason === r
                          ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-200'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ghi chú thêm về ca kiểm kê (tùy chọn)..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm rounded-xl border border-gray-300 focus:border-teal-600 outline-none"
                />
              </div>
            )}

            {/* Bottom Final Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-text-cancel"
                disabled={isSubmitting}
              >
                Đếm lại
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || (difference !== 0 && !discrepancyReason)}
                className="btn-primary-teal min-w-[180px] justify-center"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <span>
                    {difference === 0 ? 'Xác nhận kết ca' : 'Ghi nhận chênh lệch & Kết ca'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

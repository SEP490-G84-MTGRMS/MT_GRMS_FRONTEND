import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { X, Search, RotateCcw, Plus, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import type { CashAccount, DepositItem } from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { formatMoney } from '../../finance/utils/formatters';

interface DepositRefundDrawerProps {
  isOpen: boolean;
  initialTab?: 'refund' | 'create';
  onClose: () => void;
  accounts: CashAccount[];
  onSuccess: (message: string) => void;
}

export const DepositRefundDrawer: FC<DepositRefundDrawerProps> = ({
  isOpen,
  initialTab = 'refund',
  onClose,
  accounts,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'refund' | 'create'>(initialTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositItem | null>(null);

  // Form states for Refund
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundAccountId, setRefundAccountId] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Form states for Create Deposit
  const [customerName, setCustomerName] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Default accounts
  useEffect(() => {
    if (accounts.length > 0) {
      const tillAcc = accounts.find((a) => a.accountType === 'CASH' && !a.isSafeDeposit) || accounts[0];
      setRefundAccountId(tillAcc.id);
      setDepositAccountId(tillAcc.id);
    }
  }, [accounts]);

  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedDeposit(null);
    setRefundError(null);
    setCreateError(null);
  }, [initialTab, isOpen]);

  // Search deposits
  const handleSearch = useCallback(async (kw: string) => {
    setIsLoading(true);
    try {
      const items = await cashbookService.searchDeposits(kw);
      setDeposits(items);
    } catch (err) {
      console.error('Failed to search deposits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'refund') {
      handleSearch(searchKeyword);
    }
  }, [isOpen, activeTab, searchKeyword, handleSearch]);

  const handleSelectDepositForRefund = (dep: DepositItem) => {
    setSelectedDeposit(dep);
    setRefundAmount(dep.remainingAmount);
    setRefundNote(`Hoàn cọc vỏ cho phiếu ${dep.voucherCode}`);
    setRefundError(null);
  };

  const handleExecuteRefund = async () => {
    if (!selectedDeposit) return;
    if (refundAmount <= 0) {
      setRefundError('Số tiền hoàn cọc phải lớn hơn 0.');
      return;
    }
    if (refundAmount > selectedDeposit.remainingAmount) {
      setRefundError(`Số tiền hoàn không được vượt quá số dư cọc còn lại (${formatMoney(selectedDeposit.remainingAmount)}).`);
      return;
    }

    const account = accounts.find((a) => a.id === refundAccountId);
    if (account && account.accountType === 'CASH' && account.currentBalance < refundAmount) {
      setRefundError(`Két hiện tại (${formatMoney(account.currentBalance)}) không đủ số dư để chi hoàn cọc ${formatMoney(refundAmount)}.`);
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError(null);
    try {
      await cashbookService.refundDeposit(selectedDeposit.id, {
        amount: refundAmount,
        paymentSourceType: account?.accountType === 'BANK' ? 'Bank' : 'Till',
        paymentSourceAccountId: refundAccountId,
        note: refundNote,
      });

      onSuccess(`Đã hoàn cọc ${formatMoney(refundAmount)} cho ${selectedDeposit.customerName} thành công.`);
      setSelectedDeposit(null);
      handleSearch(searchKeyword);
      onClose();
    } catch (err: any) {
      setRefundError(err?.response?.data?.message || err?.message || 'Lỗi khi hoàn cọc.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleExecuteCreate = async () => {
    if (!customerName.trim()) {
      setCreateError('Vui lòng nhập tên khách hàng đặt cọc.');
      return;
    }
    if (depositAmount <= 0) {
      setCreateError('Số tiền đặt cọc phải lớn hơn 0.');
      return;
    }

    const account = accounts.find((a) => a.id === depositAccountId);
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await cashbookService.createDeposit({
        customerName: customerName.trim(),
        amount: depositAmount,
        paymentSourceType: account?.accountType === 'BANK' ? 'Bank' : 'Till',
        paymentSourceAccountId: depositAccountId,
        note: depositNote.trim(),
      });

      onSuccess(`Đã lập phiếu thu cọc vỏ ${formatMoney(depositAmount)} cho ${customerName} thành công.`);
      setCustomerName('');
      setDepositAmount(0);
      setDepositNote('');
      onClose();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.message || 'Lỗi khi tạo phiếu thu cọc.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end font-finance">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="text-teal-600" size={22} />
              Quản lý Cọc vỏ Bình/Chai
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Theo dõi tiền cọc 2 chiều · Không tính thuế · Độc lập với doanh thu P&L
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-white px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('refund')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'refund'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <RotateCcw size={16} />
            Tra cứu & Hoàn cọc vỏ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'create'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus size={16} />
            + Thu cọc vỏ mới
          </button>
        </div>

        {/* Tab 1: Tra cứu & Hoàn cọc */}
        {activeTab === 'refund' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Gõ tên khách (Bác A, Cô Ba...) hoặc mã phiếu cọc..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            {/* Selected Deposit Detail Form */}
            {selectedDeposit && (
              <div className="p-5 rounded-2xl border-2 border-teal-500 bg-teal-50/50 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                      Đang xử lý hoàn cọc
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-1">
                      {selectedDeposit.customerName} · Mã: {selectedDeposit.voucherCode}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedDeposit.note || 'Không có ghi chú'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDeposit(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Bỏ chọn
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-teal-200/60 text-xs">
                  <div>
                    <span className="text-gray-500 block">Cọc ban đầu</span>
                    <span className="font-bold text-gray-900">{formatMoney(selectedDeposit.originalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Đã hoàn trả</span>
                    <span className="font-bold text-amber-600">{formatMoney(selectedDeposit.refundedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Dư cọc còn lại</span>
                    <span className="font-bold text-teal-700 text-sm">{formatMoney(selectedDeposit.remainingAmount)}</span>
                  </div>
                </div>

                {refundError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{refundError}</span>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Số tiền hoàn cọc lần này (đ) *
                    </label>
                    <input
                      type="number"
                      value={refundAmount || ''}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      max={selectedDeposit.remainingAmount}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                      Tối đa có thể hoàn: {formatMoney(selectedDeposit.remainingAmount)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Két/Quỹ chi tiền *
                    </label>
                    <select
                      value={refundAccountId}
                      onChange={(e) => setRefundAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} (Dư: {formatMoney(acc.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Ghi chú hoàn cọc
                    </label>
                    <input
                      type="text"
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      placeholder="VD: Trả 3 bình vỏ đợt 1..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRefund}
                    disabled={isSubmittingRefund}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    {isSubmittingRefund ? 'Đang xuất quỹ...' : `↩️ Xác nhận hoàn tiền ${formatMoney(refundAmount)}`}
                  </button>
                </div>
              </div>
            )}

            {/* List of matching deposits */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Danh sách phiếu cọc chưa tất toán ({deposits.length})
              </h4>

              {isLoading && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Đang tra cứu dữ liệu cọc...
                </div>
              )}

              {!isLoading && deposits.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
                  Không tìm thấy phiếu cọc nào chưa tất toán.
                </div>
              )}

              {!isLoading &&
                deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedDeposit?.id === dep.id
                        ? 'border-teal-500 bg-teal-50/40 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-gray-900 text-sm">{dep.customerName}</h5>
                          <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {dep.voucherCode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{dep.note || 'Không có ghi chú'}</p>
                        <span className="text-[11px] text-gray-400 mt-1 block">
                          Ngày cọc: {new Date(dep.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Dư cọc còn:</span>
                        <span className="text-base font-extrabold text-teal-700 block">
                          {formatMoney(dep.remainingAmount)}
                        </span>
                        {dep.refundedAmount > 0 && (
                          <span className="text-[11px] text-gray-400 block mt-0.5">
                            (Đã hoàn: {formatMoney(dep.refundedAmount)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSelectDepositForRefund(dep)}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} />
                        ↩️ Chọn hoàn cọc ngay
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 2: Lập phiếu thu cọc mới */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert size={16} />
                Quy tắc an toàn tài chính cọc vỏ:
              </p>
              <p>• Tiền thu cọc được ghi tăng quỹ két tiền mặt tại quầy để kiểm két khớp 100%.</p>
              <p>• Khoản cọc này được đánh dấu miễn thuế và không tính vào doanh thu bán hàng P&L.</p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên khách hàng đặt cọc *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="VD: Bác A, Anh Hùng Chung Cư..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Số tiền đặt cọc (đ) *
              </label>
              <input
                type="number"
                value={depositAmount || ''}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                placeholder="VD: 250000"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Két nhận tiền cọc *
              </label>
              <select
                value={depositAccountId}
                onChange={(e) => setDepositAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} (Hiện có: {formatMoney(acc.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ghi chú số lượng vỏ cọc
              </label>
              <textarea
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                rows={3}
                placeholder="VD: Cọc 5 bình vỏ nước Lavie 19L (50.000đ/bình)..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleExecuteCreate}
                disabled={isSubmittingCreate}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {isSubmittingCreate ? 'Đang ghi nhận...' : `+ Xác nhận thu tiền cọc ${formatMoney(depositAmount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

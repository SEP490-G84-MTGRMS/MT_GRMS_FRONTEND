import { cashbookService } from '../../cashbook/services/cashbookService';
import type { CashAccount } from '../../cashbook/types/cashbook.types';
import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, DollarSign, QrCode, Banknote, CheckCircle, AlertTriangle } from 'lucide-react';
import type { CustomerDto } from '../types/customer.types';
import { customerApi } from '../api/customerApi';
import { VietQrDisplayCard } from './VietQrDisplayCard';

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
  }) => Promise<void>;
  isSubmitting: boolean;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

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
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    cashbookService.getCashAccounts().then((accs) => {
      setCashAccounts(accs);
      const matched = accs.find((a) => (method === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'));
      if (matched) setSelectedAccountId(matched.id);
    });
  }, [method]);

  useEffect(() => {
    if (customer) {
      setAmount(customer.currentDebtAR || 0);
      setMethod('VietQR');
      setNote('Thu hồi công nợ khách hàng');
      setErrorMsg('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSetFullDebt = () => {
    setAmount(customer.currentDebtAR);
    setErrorMsg('');
  };

  const handleSetHalfDebt = () => {
    setAmount(Math.round(customer.currentDebtAR / 2));
    setErrorMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thu nợ lớn hơn 0 VNĐ.');
      return;
    }

    if (amount > customer.currentDebtAR) {
      setErrorMsg(
        `Số tiền thu (${formatCurrency(amount)}) không được vượt quá số nợ hiện tại (${formatCurrency(customer.currentDebtAR)}).`
      );
      return;
    }

    try {
      await onConfirm({
        customerId: customer.id,
        amount,
        method,
        targetAccountId: selectedAccountId || undefined,
        note: note.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi thực hiện thu nợ.');
    }
  };

  const qrConfig = customerApi.generateVietQr(customer, amount > 0 ? amount : customer.currentDebtAR);

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div className="customer-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customer-modal-header" style={{ background: '#F0FDF4' }}>
          <div className="customer-modal-title">
            <QrCode className="w-5 h-5" style={{ color: '#059669' }} />
            <h3 style={{ color: '#065F46' }}>Lập Phiếu Thu Nợ Khách Hàng</h3>
          </div>
          <button
            onClick={onClose}
            className="action-icon-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit}>
          <div className="customer-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Customer Summary Card */}
            <div
              style={{
                background: '#FAFCFC',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #e5edf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Khách hàng nợ</span>
                <div style={{ fontWeight: 800, color: 'var(--text-main, #111827)', fontSize: '1rem', marginTop: '2px' }}>
                  {customer.fullName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-mono, monospace)', marginTop: '2px' }}>
                  {customer.phoneNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Số nợ hiện tại</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#DC2626', marginTop: '2px' }}>
                  {formatCurrency(customer.currentDebtAR)}
                </div>
              </div>
            </div>

            {/* Amount input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Số tiền thu đợt này (VNĐ) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSetHalfDebt}
                    className="btn-secondary-pill"
                    style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                  >
                    Thu 50%
                  </button>
                  <button
                    type="button"
                    onClick={handleSetFullDebt}
                    className="btn-secondary-pill"
                    style={{ padding: '3px 10px', fontSize: '0.72rem', color: '#059669', borderColor: '#A7F3D0' }}
                  >
                    Thu 100% nợ
                  </button>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <DollarSign className="w-4 h-4 customer-search-icon" />
                <input
                  type="number"
                  min="0"
                  max={customer.currentDebtAR}
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="form-input"
                  style={{
                    paddingLeft: '40px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Cash Account Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">
                Tài khoản quỹ thụ hưởng Sổ quỹ (FE-17) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="form-input"
                style={{ fontWeight: 600, color: '#0F766E', width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}
              >
                {cashAccounts
                  .filter((a) => (method === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} (Số dư: {acc.currentBalance.toLocaleString('vi-VN')} đ)
                    </option>
                  ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4, display: 'block' }}>
                ✓ Hệ thống tự động tăng số dư và tạo Phiếu Thu trong Sổ quỹ cho tài khoản này
              </span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="form-label">
                Hình thức thanh toán
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMethod('VietQR')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: method === 'VietQR' ? '2px solid var(--blue-primary, #0F766E)' : '1px solid #E2E8F0',
                    background: method === 'VietQR' ? 'var(--blue-subtle, #CCFBF1)' : '#ffffff',
                    color: method === 'VietQR' ? 'var(--blue-primary, #0F766E)' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Chuyển khoản VietQR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('Cash')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: method === 'Cash' ? '2px solid #059669' : '1px solid #E2E8F0',
                    background: method === 'Cash' ? '#ECFDF5' : '#ffffff',
                    color: method === 'Cash' ? '#059669' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tiền mặt tại quầy</span>
                </button>
              </div>
            </div>

            {/* VietQR Card Display */}
            {method === 'VietQR' && (
              <div style={{ paddingTop: '4px' }}>
                <VietQrDisplayCard config={qrConfig} />
              </div>
            )}

            {/* Note Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Ghi chú chứng từ thu nợ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Khách trả nợ đơn hàng ngày 01/10"
                className="form-input"
              />
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="customer-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary-pill"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="btn-primary-pill"
              style={{
                background: method === 'Cash' ? '#059669' : 'var(--blue-primary, #0F766E)',
              }}
            >
              {isSubmitting ? (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>
                {method === 'VietQR' ? 'Xác nhận đã nhận chuyển khoản' : 'Xác nhận thu tiền mặt'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
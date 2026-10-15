import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  History,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Building2,
  Receipt,
} from 'lucide-react';
import type { CustomerDto, CustomerDebtLedgerDto } from '../types/customer.types';
import { customerApi } from '../api/customerApi';

interface CustomerDebtLedgerDrawerProps {
  customer: CustomerDto | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCollect: (customer: CustomerDto) => void;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const CustomerDebtLedgerDrawer: FC<CustomerDebtLedgerDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenCollect,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'INCREASE' | 'DECREASE'>('ALL');

  const [ledgers, setLedgers] = useState<CustomerDebtLedgerDto[]>([]);

  useEffect(() => {
    if (customer) {
      void customerApi.getCustomerDebtLedger(customer.id).then((data) => {
        setLedgers(data);
      });
    } else {
      setLedgers([]);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const filteredLedgers = ledgers.filter((l) => {
    if (filterType === 'INCREASE') return l.transactionType === 'DEBT_INCREASE';
    if (filterType === 'DECREASE') return l.transactionType === 'DEBT_DECREASE';
    return true;
  });

  const totalIncreased = ledgers
    .filter((l) => l.transactionType === 'DEBT_INCREASE')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalDecreased = ledgers
    .filter((l) => l.transactionType === 'DEBT_DECREASE')
    .reduce((sum, l) => sum + l.amount, 0);

  const hasDebt = customer.currentDebtAR > 0;
  const isOverLimit = customer.currentDebtAR > customer.debtLimit && customer.debtLimit > 0;

  return (
    <div className="customer-drawer-backdrop" onClick={onClose}>
      <div className="customer-drawer-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        {/* Header */}
        <div className="customer-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0F766E, #115E59)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
              }}
            >
              <History className="w-6 h-6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #111827)' }}>
                  Sổ Biến Động Công Nợ
                </h3>
                <span className={'tier-badge tier-badge-' + customer.membershipTier.toLowerCase()}>
                  {customer.membershipTier}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Khách hàng: <strong>{customer.fullName}</strong> ({customer.phoneNumber})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="action-icon-btn" title="Đóng sổ nợ">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Summary Bar */}
        <div style={{ padding: '16px 24px', background: '#FAFCFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {/* Dư nợ hiện tại */}
            <div
              style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isOverLimit ? '1px solid #FECACA' : '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>DƯ NỢ HIỆN TẠI</div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: isOverLimit ? '#DC2626' : hasDebt ? '#D97706' : '#059669',
                  marginTop: '4px',
                }}
              >
                {formatCurrency(customer.currentDebtAR)}
              </div>
              {customer.debtLimit > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  Hạn mức: {formatCurrency(customer.debtLimit)}
                </div>
              )}
            </div>

            {/* Tổng phát sinh tăng */}
            <div
              style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TỔNG MUA NỢ (+)</div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#DC2626',
                  marginTop: '4px',
                }}
              >
                +{formatCurrency(totalIncreased)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                Từ đơn bán lẻ POS
              </div>
            </div>

            {/* Tổng phát sinh giảm */}
            <div
              style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>ĐÃ THANH TOÁN (-)</div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#059669',
                  marginTop: '4px',
                }}
              >
                -{formatCurrency(totalDecreased)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                Tiền mặt & VietQR
              </div>
            </div>
          </div>

          {/* Filter Segmented Control */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'ALL' ? '#0F766E' : '#E2E8F0',
                color: filterType === 'ALL' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả ({ledgers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('INCREASE')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'INCREASE' ? '#DC2626' : '#E2E8F0',
                color: filterType === 'INCREASE' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Phát sinh nợ (+)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DECREASE')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'DECREASE' ? '#059669' : '#E2E8F0',
                color: filterType === 'DECREASE' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Thanh toán nợ (-)
            </button>
          </div>
        </div>

        {/* Timeline / Ledger Items Body */}
        <div className="customer-drawer-body" style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {filteredLedgers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <Receipt className="w-12 h-12" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>
                Không có giao dịch công nợ nào
              </div>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>
                Khách hàng chưa có lịch sử mua nợ hoặc chưa thanh toán nợ theo bộ lọc đã chọn.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredLedgers.map((item) => {
                const isIncrease = item.transactionType === 'DEBT_INCREASE';

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Top Row: Type badge, Date, Amount */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isIncrease ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Ghi nợ (Mua hàng)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              background: '#ECFDF5',
                              color: '#059669',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Ghi có (Thu nợ)
                          </span>
                        )}

                        {item.paymentMethod && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              color: '#475569',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {item.paymentMethod === 'VietQR' ? '💳 VietQR' : '💵 Tiền mặt'}
                          </span>
                        )}
                      </div>

                      {/* Số tiền phát sinh */}
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono, monospace)',
                          color: isIncrease ? '#DC2626' : '#059669',
                        }}
                      >
                        {isIncrease ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </div>
                    </div>

                    {/* Middle Row: Note & Reference docs */}
                    <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>
                      {item.note || (isIncrease ? 'Đơn hàng mua nợ tại POS' : 'Khách trả nợ')}
                    </div>

                    {/* Bottom Row: Doc links & Balance after */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px dashed #F1F5F9',
                        paddingTop: '8px',
                        fontSize: '0.74rem',
                        color: '#64748b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.referenceDocId && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <FileText className="w-3 h-3 text-slate-400" />
                            Đơn: <strong>{item.referenceDocId}</strong>
                          </span>
                        )}
                        {item.cashTransactionCode && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#0F766E',
                              fontWeight: 600,
                            }}
                            title="Mã phiếu thu Sổ quỹ liên thông tự động (FE-17)"
                          >
                            <Building2 className="w-3 h-3" />
                            Sổ quỹ: {item.cashTransactionCode}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          Dư nợ sau GD: <strong style={{ color: '#0F766E', fontFamily: 'var(--font-mono, monospace)' }}>{formatCurrency(item.balanceAfter)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="customer-drawer-footer" style={{ borderTop: '1px solid #E2E8F0', padding: '16px 24px', background: '#FAFCFC' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-pill"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Đóng sổ nợ
          </button>

          {hasDebt && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCollect(customer);
              }}
              className="btn-primary-pill"
              style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
            >
              <QrCode className="w-4 h-4" />
              <span>Thu nợ & VietQR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

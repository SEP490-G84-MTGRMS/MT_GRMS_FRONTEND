import type { FC } from 'react';
import { Lock, Store, Building2, Check, ArrowRight } from 'lucide-react';
import type { CashAccount } from '../types/cashbook.types';
import { formatMoney } from '../../finance/utils/formatters';

interface CashAccountsCardSectionProps {
  accounts: CashAccount[];
  selectedAccountId?: string;
  onSelectAccount: (accountId: string) => void;
  onOpenReconcileModal?: (account: CashAccount) => void;
}

export const CashAccountsCardSection: FC<CashAccountsCardSectionProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onOpenReconcileModal,
}) => {
  return (
    <div className="cash-accounts-grid">
      {accounts.map((acc) => {
        const isSelected = selectedAccountId === acc.id;
        const isSafe = acc.isSafeDeposit || acc.id === 'ACC-SAFE' || acc.accountName.includes('Két sắt');
        const isCash = acc.accountType === 'CASH' && !isSafe;
        const isBank = acc.accountType === 'BANK';

        let badgeBg = '#E0F2FE';
        let badgeColor = '#0369A1';
        let badgeLabel = 'Két quầy thu ngân';
        let badgeIcon = <Store size={15} />;
        let borderHighlight = isSelected ? '#0284C7' : '#E2E8F0';
        let statusText = 'Đang hoạt động (Thu ngân)';
        let statusDotColor = '#10B981';

        if (isSafe) {
          badgeBg = '#FEF3C7';
          badgeColor = '#B45309';
          badgeLabel = 'Két sắt chủ shop';
          badgeIcon = <Lock size={15} />;
          if (isSelected) borderHighlight = '#D97706';
          statusText = 'Bảo mật (Chủ shop & KTT)';
          statusDotColor = '#F59E0B';
        } else if (isBank) {
          badgeBg = '#CCFBF1';
          badgeColor = '#0F766E';
          badgeLabel = acc.isDefault ? 'Ngân hàng VietQR' : 'Tài khoản ngân hàng';
          badgeIcon = <Building2 size={15} />;
          if (isSelected) borderHighlight = '#0D9488';
          statusText = 'Online Banking 24/7 (Sẵn sàng)';
          statusDotColor = '#0F766E';
        }

        return (
          <div
            key={acc.id}
            className={`cash-account-card ${isSelected ? 'active-selected' : ''}`}
            onClick={() => onSelectAccount(acc.id)}
            role="button"
            tabIndex={0}
            style={{
              borderColor: borderHighlight,
              boxShadow: isSelected
                ? '0 6px 16px rgba(15, 118, 110, 0.12)'
                : '0 1px 3px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              background: isSelected
                ? '#FFFFFF'
                : isSafe
                ? 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 100%)'
                : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Header: Type Badge & Active Filter Indicator */}
            <div className="account-card-header">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {badgeIcon}
                <span>{badgeLabel}</span>
              </span>

              {isSelected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#CCFBF1',
                    color: '#0F766E',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Đang lọc</span>
                </span>
              ) : (
                <span className="account-branch-name" style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {acc.branchName}
                </span>
              )}
            </div>

            {/* Account Title & Bank/Safe Details */}
            <div>
              <h3 className="account-card-name" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0 4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>{acc.accountName}</span>
              </h3>
              {acc.bankName && acc.accountNumber && (
                <p className="account-card-detail" style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                  {acc.bankName} - <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{acc.accountNumber}</span>
                </p>
              )}
              {isSafe && (
                <p className="account-card-detail" style={{ margin: 0, fontSize: '11.5px', color: '#92400E' }}>
                  Chi nhánh: {acc.branchName}
                </p>
              )}
              {isCash && (
                <p className="account-card-detail" style={{ margin: 0, fontSize: '11.5px', color: '#475569' }}>
                  Chi nhánh: {acc.branchName}
                </p>
              )}
            </div>

            {/* Balance Block */}
            <div className="account-card-balance-block" style={{ marginTop: 'auto', paddingTop: 6 }}>
              <span className="account-balance-label" style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                Số dư khả dụng
              </span>
              <span
                className="account-balance-amount tabular-nums"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: isSafe ? '#B45309' : isBank ? '#0F766E' : '#0284C7',
                }}
              >
                {formatMoney(acc.currentBalance)}
              </span>
            </div>

            {/* Bottom Status & Quick Reconcile */}
            <div
              style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#64748B',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: statusDotColor,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontWeight: 500 }}>{statusText}</span>
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {isCash && onOpenReconcileModal && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReconcileModal(acc);
                    }}
                    style={{
                      background: '#F0FDFA',
                      border: '1px solid #99F6E4',
                      color: '#0F766E',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Đối soát kiểm đếm tiền mặt thực tế tại két"
                  >
                    Kiểm kê
                  </button>
                )}
                <span
                  style={{
                    color: isSelected ? '#0F766E' : '#64748B',
                    fontWeight: 600,
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span>{isSelected ? 'Bỏ lọc' : 'Lọc sổ'}</span>
                  <ArrowRight size={11} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

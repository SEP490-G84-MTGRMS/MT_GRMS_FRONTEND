import type { FC } from 'react';
import { Lock, Store, Building2, Scale } from 'lucide-react';
import type { CashAccount } from '../types/cashbook.types';

interface CashAccountsCardSectionProps {
  accounts: CashAccount[];
  selectedAccountId?: string;
  onSelectAccount: (accountId: string) => void;
  onOpenReconcileModal: (account: CashAccount) => void;
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
        const isSafe = acc.isSafeDeposit || acc.id === 'ACC-SAFE';
        const isCash = acc.accountType === 'CASH' && !isSafe;
        const isBank = acc.accountType === 'BANK';

        let badgeBg = '#E0F2FE';
        let badgeColor = '#0369A1';
        let badgeLabel = 'Két tiền quầy';
        let badgeIcon = <Store size={14} />;
        let borderHighlight = isSelected ? '#0284C7' : '#E2E8F0';

        if (isSafe) {
          badgeBg = '#FEF3C7';
          badgeColor = '#B45309';
          badgeLabel = 'Két sắt của chủ shop';
          badgeIcon = <Lock size={14} />;
          if (isSelected) borderHighlight = '#D97706';
        } else if (isBank) {
          badgeBg = '#CCFBF1';
          badgeColor = '#0F766E';
          badgeLabel = 'Tài khoản ngân hàng';
          badgeIcon = <Building2 size={14} />;
          if (isSelected) borderHighlight = '#0D9488';
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
              boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : undefined,
              position: 'relative',
              background: isSafe ? 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 100%)' : '#FFFFFF',
            }}
          >
            <div className="account-card-header">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {badgeIcon}
                <span>{badgeLabel}</span>
              </span>
              <span className="account-branch-name">{acc.branchName}</span>
            </div>

            <div>
              <h3 className="account-card-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{acc.accountName}</span>
              </h3>
              {acc.bankName && acc.accountNumber && (
                <p className="account-card-detail">
                  {acc.bankName} - <span style={{ fontFamily: 'monospace' }}>{acc.accountNumber}</span>
                </p>
              )}
              {isSafe && (
                <p className="account-card-detail" style={{ color: '#92400E' }}>
                  Phân quyền: Chỉ chủ shop & kế toán trưởng
                </p>
              )}
            </div>

            <div className="account-card-balance-block">
              <span className="account-balance-label">Số dư khả dụng</span>
              <span
                className="account-balance-amount"
                style={{ color: isSafe ? '#B45309' : isBank ? '#0F766E' : '#0284C7' }}
              >
                {acc.currentBalance.toLocaleString('vi-VN')} {acc.currency}
              </span>
            </div>

            {/* Reconciliation action for cash drawers */}
            {isCash && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cb-btn cb-btn-outline"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReconcileModal(acc);
                  }}
                >
                  <Scale size={14} />
                  <span>Kiểm kê kết ca</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

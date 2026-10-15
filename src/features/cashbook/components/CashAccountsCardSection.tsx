import type { FC } from 'react';
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
        const isCash = acc.accountType === 'CASH';

        return (
          <div
            key={acc.id}
            className={`cash-account-card ${isSelected ? 'active-selected' : ''}`}
            onClick={() => onSelectAccount(acc.id)}
            role="button"
            tabIndex={0}
          >
            <div className="account-card-header">
              <span className={`account-type-badge ${isCash ? 'cash' : 'bank'}`}>
                {isCash ? '💵 Két tiền mặt' : '🏦 Ngân hàng'}
              </span>
              <span className="account-branch-name">{acc.branchName}</span>
            </div>

            <div>
              <h3 className="account-card-name">{acc.accountName}</h3>
              {acc.bankName && acc.accountNumber && (
                <p className="account-card-detail">
                  {acc.bankName} - {acc.accountNumber}
                </p>
              )}
            </div>

            <div className="account-card-balance-block">
              <span className="account-balance-label">Số dư hiện tại</span>
              <span className="account-balance-amount">
                {acc.currentBalance.toLocaleString('vi-VN')} {acc.currency}
              </span>
            </div>

            {isCash && (
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cb-btn cb-btn-outline"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReconcileModal(acc);
                  }}
                >
                  ⚖️ Kiểm kê két
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

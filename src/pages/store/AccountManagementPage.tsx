// src/pages/store/AccountManagementPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  INITIAL_STORE_INFO,
  INITIAL_USER_PROFILE,
  INITIAL_SESSIONS,
  INITIAL_TRANSACTIONS,
  type StoreInfo,
  type UserProfile,
  type UserSessionItem,
  type WalletTransaction,
} from './storeData';
import type { AccountTabKey } from './components/AccountSidebarNav';
import { AccountProfileTab } from './components/AccountProfileTab';
import { WalletLedgerTab } from './components/WalletLedgerTab';
import { TermsOfServiceTab } from './components/TermsOfServiceTab';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';

export const AccountManagementPage: FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AccountTabKey | null;

  const [activeTab, setActiveTab] = useState<AccountTabKey>(
    tabParam && ['account-profile', 'wallet', 'terms'].includes(tabParam)
      ? tabParam
      : 'account-profile'
  );

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [sessions, setSessions] = useState<UserSessionItem[]>(INITIAL_SESSIONS);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && ['account-profile', 'wallet', 'terms'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  useEffect(() => {
    if (searchParams.get('action') === 'topup') {
      setShowTopupModal(true);
    }
  }, [searchParams]);

  const handleUpdateUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const handleTerminateSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Nạp tiền ví
  const handleTopupSuccess = (amount: number) => {
    const newBal = storeInfo.walletBalance + amount;
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      transactionCode: `WAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      type: 'TOPUP',
      amount,
      balanceBefore: storeInfo.walletBalance,
      balanceAfter: newBal,
      description: 'Nạp tiền vào ví gian hàng qua VietQR Napas247',
      paymentMethod: 'VietQR',
      status: 'Success',
      createdAt: 'Vừa xong',
    };

    setStoreInfo((prev) => ({
      ...prev,
      walletBalance: newBal,
    }));
    setTransactions((prev) => [newTx, ...prev]);
    setShowTopupModal(false);
  };

  return (
    <div className="store-hub-container">
      {/* Nội dung chính tương ứng từng tab */}
      <div style={{ width: '100%', minWidth: 0 }}>
        {activeTab === 'account-profile' && (
          <AccountProfileTab
            userProfile={userProfile}
            sessions={sessions}
            onUpdateProfile={handleUpdateUserProfile}
            onTerminateSession={handleTerminateSession}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletLedgerTab
            storeInfo={storeInfo}
            transactions={transactions}
            onOpenTopupModal={() => setShowTopupModal(true)}
          />
        )}

        {activeTab === 'terms' && <TermsOfServiceTab />}
      </div>

      {/* Modal Nạp ví VietQR */}
      {showTopupModal && (
        <StoreWalletTopupModal
          storeInfo={storeInfo}
          onClose={() => setShowTopupModal(false)}
          onSuccess={handleTopupSuccess}
        />
      )}
    </div>
  );
};

export default AccountManagementPage;

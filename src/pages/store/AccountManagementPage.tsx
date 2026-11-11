// src/pages/store/AccountManagementPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  INITIAL_STORE_INFO,
  INITIAL_USER_PROFILE,
  INITIAL_SESSIONS,
  type StoreInfo,
  type UserProfile,
  type UserSessionItem,
} from './storeData';
import type { AccountTabKey } from './components/AccountSidebarNav';
import { AccountProfileTab } from './components/AccountProfileTab';
import { WalletLedgerTab } from './components/WalletLedgerTab';
import { TermsOfServiceTab } from './components/TermsOfServiceTab';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';
import { storeApi, mapBackendStoreToFrontend } from './api/storeApi';

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
  const [walletRefreshKey, setWalletRefreshKey] = useState<number>(0);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await storeApi.getStoreInfo();
        if (res.success && res.data) {
          setStoreInfo((prev) => mapBackendStoreToFrontend(res.data, prev.walletBalance));
        }
      } catch {
        // Bỏ qua nếu chưa lấy được thông tin gian hàng
      }
    };
    fetchStore();
  }, []);

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
  const handleTopupSuccess = (amount: number, newBalance?: number) => {
    const newBal = newBalance !== undefined ? newBalance : storeInfo.walletBalance + amount;

    setStoreInfo((prev) => ({
      ...prev,
      walletBalance: newBal,
    }));
    setWalletRefreshKey((k) => k + 1);
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
            refreshKey={walletRefreshKey}
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

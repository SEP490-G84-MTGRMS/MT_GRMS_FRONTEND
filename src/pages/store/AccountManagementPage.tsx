// src/pages/store/AccountManagementPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  INITIAL_STORE_INFO,
  INITIAL_USER_PROFILE,
  type StoreInfo,
  type UserProfile,
  type UserSessionItem,
} from './storeData';
import { AccountSidebarNav, type AccountTabKey } from './components/AccountSidebarNav';
import { AccountProfileTab } from './components/AccountProfileTab';
import { WalletLedgerTab } from './components/WalletLedgerTab';
import { TermsOfServiceTab } from './components/TermsOfServiceTab';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';
import { storeApi, mapBackendStoreToFrontend } from './api/storeApi';
import { authService } from '../../features/auth/authService';
import { useAuthStore } from '../../stores/useAuthStore';

const VALID_ACCOUNT_TABS: AccountTabKey[] = ['account-profile', 'wallet', 'terms'];

export const AccountManagementPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuthStore();
  const tabParam = searchParams.get('tab') as AccountTabKey | null;

  const [activeTab, setActiveTab] = useState<AccountTabKey>(
    tabParam && VALID_ACCOUNT_TABS.includes(tabParam)
      ? tabParam
      : 'account-profile',
  );

  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    authUser
      ? {
          ...INITIAL_USER_PROFILE,
          userId: authUser.id,
          fullName: authUser.fullName || '',
          userName: authUser.phone || authUser.email || '',
          role: authUser.role || '',
          phone: authUser.phone || '',
          email: authUser.email || '',
        }
      : INITIAL_USER_PROFILE,
  );
  const [sessions, setSessions] = useState<UserSessionItem[]>(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = /Edg\//.test(ua)
      ? 'Microsoft Edge'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Trình duyệt hiện tại';
    const deviceName = /Windows/i.test(ua)
      ? 'Máy tính Windows'
      : /Mac/i.test(ua)
        ? 'Máy tính macOS'
        : /Android|iPhone|iPad/i.test(ua)
          ? 'Thiết bị di động'
          : 'Thiết bị hiện tại';
    const today = new Date().toLocaleDateString('vi-VN');
    return [
      {
        id: 'current-session',
        deviceName,
        browser,
        ipAddress: 'Phiên hiện tại',
        lastActive: today,
        isCurrent: true,
        status: 'active',
      },
    ];
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [walletRefreshKey, setWalletRefreshKey] = useState<number>(0);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchAccountData = async () => {
      const [storeRes, meRes, twoFactorRes] = await Promise.allSettled([
        storeApi.getStoreInfo(),
        authService.getMe(),
        authService.getTwoFactorStatus(),
      ]);
      if (!active) return;

      const loadedStore =
        storeRes.status === 'fulfilled' && storeRes.value.success && storeRes.value.data
          ? storeRes.value.data
          : null;

      if (loadedStore) {
        setStoreInfo((prev) => mapBackendStoreToFrontend(loadedStore, prev.walletBalance));
      }
      if (meRes.status === 'fulfilled' && meRes.value) {
        const me = meRes.value;
        setUserProfile((prev) => ({
          ...prev,
          userId: me.id,
          fullName: me.fullName || '',
          userName: me.phone || me.email || prev.userName,
          role: me.role || prev.role,
          phone: me.phone || loadedStore?.hotline || '',
          email: me.email || '',
          address: loadedStore?.address || '',
        }));
      }
      if (twoFactorRes.status === 'fulfilled' && twoFactorRes.value) {
        setUserProfile((prev) => ({
          ...prev,
          isTwoFactorEnabled: Boolean(twoFactorRes.value.enabled),
        }));
      }
    };
    fetchAccountData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && VALID_ACCOUNT_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  useEffect(() => {
    if (searchParams.get('action') === 'topup') {
      setShowTopupModal(true);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: AccountTabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleUpdateUserProfile = async (updated: Partial<UserProfile>) => {
    if (updated.fullName !== undefined || updated.phone !== undefined) {
      const saved = await authService.updateProfile({
        fullName: (updated.fullName ?? userProfile.fullName).trim(),
        phone: updated.phone ?? userProfile.phone,
      });
      setUserProfile((prev) => ({
        ...prev,
        fullName: saved.fullName,
        phone: saved.phone || updated.phone || prev.phone,
        userName: saved.phone || saved.email || prev.userName,
      }));
      useAuthStore.getState().updateUser({
        fullName: saved.fullName,
        phone: saved.phone || updated.phone,
      });
      return;
    }
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (sessionId === 'current-session') {
      await useAuthStore.getState().logout();
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

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
      <AccountSidebarNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      <div className="store-hub-main" style={{ width: '100%', minWidth: 0 }}>
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

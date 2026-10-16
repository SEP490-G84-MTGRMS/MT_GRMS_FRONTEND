// src/pages/store/StoreSettingsHubPage.tsx
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
  type SubscriptionPlanItem,
} from './storeData';
import { StoreSidebarNav, type StoreHubTabKey } from './components/StoreSidebarNav';
import { StoreTopStatusBar } from './components/StoreTopStatusBar';
import { SubscriptionPricingCards } from './components/SubscriptionPricingCards';
import { SubscriptionCheckoutModal } from './components/SubscriptionCheckoutModal';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';
import { StoreInfoTab } from './components/StoreInfoTab';
import { WalletLedgerTab } from './components/WalletLedgerTab';
import { AccountProfileTab } from './components/AccountProfileTab';
import { OrderHistoryTab } from './components/OrderHistoryTab';
import { TermsOfServiceTab } from './components/TermsOfServiceTab';

export const StoreSettingsHubPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as StoreHubTabKey | null;

  const [activeTab, setActiveTab] = useState<StoreHubTabKey>(
    tabParam || 'subscriptions'
  );

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [sessions, setSessions] = useState<UserSessionItem[]>(INITIAL_SESSIONS);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<SubscriptionPlanItem | null>(null);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectTab = (tab: StoreHubTabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
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

  // Mua gói dịch vụ
  const handlePurchaseSuccess = (result: {
    planName: string;
    months: number;
    totalAmount: number;
    paymentMethod: 'Wallet' | 'VietQR';
  }) => {
    let newBal = storeInfo.walletBalance;
    if (result.paymentMethod === 'Wallet') {
      newBal = Math.max(0, storeInfo.walletBalance - result.totalAmount);
    }

    // Gia hạn thêm ngày
    const newDaysRemaining = storeInfo.daysRemaining + result.months * 30;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + newDaysRemaining);
    const newExpStr = expDate.toISOString().split('T')[0];

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      transactionCode: `SUB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      type: 'PURCHASE_PLAN',
      amount: result.totalAmount,
      balanceBefore: storeInfo.walletBalance,
      balanceAfter: newBal,
      description: `Đăng ký & Nâng cấp ${result.planName} (${result.months} tháng)`,
      paymentMethod: result.paymentMethod,
      status: 'Success',
      createdAt: 'Vừa xong',
    };

    setStoreInfo((prev) => ({
      ...prev,
      currentPlan: result.planName,
      daysRemaining: newDaysRemaining,
      subscriptionExpiresAt: newExpStr,
      walletBalance: newBal,
    }));
    setTransactions((prev) => [newTx, ...prev]);
    setSelectedPlanForCheckout(null);
  };

  // Cập nhật thông tin store
  const handleUpdateStoreInfo = (updated: Partial<StoreInfo>) => {
    setStoreInfo((prev) => ({ ...prev, ...updated }));
  };

  // Cập nhật thông tin user
  const handleUpdateUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  // Đăng xuất session
  const handleTerminateSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <div className="store-hub-container">
      {/* Sidebar navigation */}
      <StoreSidebarNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Workspace */}
      <main className="store-hub-main">
        {/* Top Status Bar is shown on all tabs except Account Profile (to strictly match KiotViet Account screenshot) */}
        {activeTab !== 'account-profile' && (
          <StoreTopStatusBar
            storeInfo={storeInfo}
            onOpenTopupModal={() => setShowTopupModal(true)}
          />
        )}

        {/* Tab 1: Gói dịch vụ */}
        {activeTab === 'subscriptions' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Gói dịch vụ MT-GRMS
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                Lựa chọn gói thuê bao phù hợp với quy mô chuỗi cửa hàng, quản lý đa chi nhánh và tự động hóa bán lẻ.
              </p>
            </div>
            <SubscriptionPricingCards
              onSelectPlan={(plan) => setSelectedPlanForCheckout(plan)}
            />
          </div>
        )}

        {/* Tab 2: Thông tin gian hàng */}
        {activeTab === 'store-info' && (
          <StoreInfoTab
            storeInfo={storeInfo}
            onUpdateStoreInfo={handleUpdateStoreInfo}
          />
        )}

        {/* Tab 3: Tài khoản người dùng (Profile) */}
        {activeTab === 'account-profile' && (
          <AccountProfileTab
            userProfile={userProfile}
            sessions={sessions}
            onUpdateProfile={handleUpdateUserProfile}
            onTerminateSession={handleTerminateSession}
          />
        )}

        {/* Tab 4: Ví tiền & Thanh toán */}
        {activeTab === 'wallet' && (
          <WalletLedgerTab
            storeInfo={storeInfo}
            transactions={transactions}
            onOpenTopupModal={() => setShowTopupModal(true)}
          />
        )}

        {/* Tab 5: Lịch sử mua hàng */}
        {activeTab === 'order-history' && (
          <OrderHistoryTab isServiceConfirmation={false} />
        )}

        {/* Tab 6: Bản xác nhận dịch vụ */}
        {activeTab === 'service-confirm' && (
          <OrderHistoryTab isServiceConfirmation={true} />
        )}

        {/* Tab 7: Điều khoản sử dụng */}
        {activeTab === 'terms' && <TermsOfServiceTab />}
      </main>

      {/* Modal Checkout */}
      {selectedPlanForCheckout && (
        <SubscriptionCheckoutModal
          plan={selectedPlanForCheckout}
          storeInfo={storeInfo}
          onClose={() => setSelectedPlanForCheckout(null)}
          onSuccess={handlePurchaseSuccess}
        />
      )}

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

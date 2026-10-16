// src/pages/store/StoreSettingsHubPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import {
  INITIAL_STORE_INFO,
  type StoreInfo,
  type WalletTransaction,
  type SubscriptionPlanItem,
  INITIAL_TRANSACTIONS,
} from './storeData';
import type { StoreHubTabKey } from './components/StoreSidebarNav';
import { StoreTopStatusBar } from './components/StoreTopStatusBar';
import { SubscriptionPricingCards } from './components/SubscriptionPricingCards';
import { SubscriptionCheckoutModal } from './components/SubscriptionCheckoutModal';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';
import { StoreInfoTab } from './components/StoreInfoTab';
import { OrderHistoryTab } from './components/OrderHistoryTab';

export const StoreSettingsHubPage: FC = () => {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');

  // Nếu người dùng truy cập tab tài khoản cũ, chuyển hướng sang trang Quản lý tài khoản riêng
  if (rawTab === 'account-profile' || rawTab === 'wallet' || rawTab === 'terms') {
    return <Navigate to={`/store-owner/account?tab=${rawTab}`} replace />;
  }

  const tabParam = rawTab as StoreHubTabKey | null;

  const [activeTab, setActiveTab] = useState<StoreHubTabKey>(
    tabParam && ['store-info', 'subscriptions', 'order-history', 'service-confirm'].includes(tabParam)
      ? tabParam
      : 'subscriptions'
  );

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<SubscriptionPlanItem | null>(null);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  useEffect(() => {
    if (
      tabParam &&
      tabParam !== activeTab &&
      ['store-info', 'subscriptions', 'order-history', 'service-confirm'].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);


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

  return (
    <div className="store-hub-container">

      {/* Main Workspace */}
      <main className="store-hub-main">
        {/* Top Status Bar */}
        <StoreTopStatusBar
          storeInfo={storeInfo}
          onOpenTopupModal={() => setShowTopupModal(true)}
        />

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

        {/* Tab 3: Lịch sử mua hàng */}
        {activeTab === 'order-history' && (
          <OrderHistoryTab isServiceConfirmation={false} />
        )}

        {/* Tab 4: Bản xác nhận dịch vụ */}
        {activeTab === 'service-confirm' && (
          <OrderHistoryTab isServiceConfirmation={true} />
        )}
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

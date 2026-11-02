// src/pages/store/StoreSettingsHubPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import {
  INITIAL_STORE_INFO,
  type StoreInfo,
  type WalletTransaction,
  type SubscriptionPlanItem,
  INITIAL_TRANSACTIONS,
} from './storeData';
import { StoreSidebarNav, type StoreHubTabKey } from './components/StoreSidebarNav';
import { StoreTopStatusBar } from './components/StoreTopStatusBar';
import { SubscriptionPricingCards } from './components/SubscriptionPricingCards';
import { SubscriptionCheckoutModal } from './components/SubscriptionCheckoutModal';
import { StoreWalletTopupModal } from './components/StoreWalletTopupModal';
import { StoreInfoTab } from './components/StoreInfoTab';
import { OrderHistoryTab } from './components/OrderHistoryTab';
import { TermsOfServiceTab } from './components/TermsOfServiceTab';
import { WalletLedgerTab } from './components/WalletLedgerTab';
import { storeApi, mapBackendStoreToFrontend } from './api/storeApi';

const VALID_TABS: StoreHubTabKey[] = [
  'store-info',
  'subscriptions',
  'order-history',
  'service-confirm',
  'terms',
  'wallet',
];

export const StoreSettingsHubPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');

  // Nếu người dùng truy cập tab tài khoản cá nhân, chuyển hướng sang trang Profile riêng
  if (rawTab === 'account-profile') {
    return <Navigate to="/store-owner/account?tab=account-profile" replace />;
  }

  const tabParam = rawTab as StoreHubTabKey | null;

  const [activeTab, setActiveTab] = useState<StoreHubTabKey>(
    tabParam && VALID_TABS.includes(tabParam)
      ? tabParam
      : 'store-info'
  );

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<SubscriptionPlanItem | null>(null);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);

  // Load real store info from Backend API
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await storeApi.getStoreInfo();
        if (res.success && res.data) {
          setStoreInfo((prev) => mapBackendStoreToFrontend(res.data, prev.walletBalance));
        }
      } catch {
        // Giữ mock fallback nếu mạng lỗi
      }
    };
    fetchStore();
  }, []);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  // Điều hướng chuyển tab khi click sidebar
  const handleSelectTab = (tab: StoreHubTabKey) => {
    setActiveTab(tab);
    navigate(`/store-owner/subscriptions?tab=${tab}`);
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
    subscriptionExpiresAt?: string;
    daysRemaining?: number;
  }) => {
    let newBal = storeInfo.walletBalance;
    if (result.paymentMethod === 'Wallet') {
      newBal = Math.max(0, storeInfo.walletBalance - result.totalAmount);
    }

    // Gia hạn thêm ngày (ưu tiên dữ liệu từ backend trả về)
    const newDaysRemaining =
      result.daysRemaining !== undefined
        ? result.daysRemaining
        : storeInfo.daysRemaining + result.months * 30;

    const newExpStr = result.subscriptionExpiresAt
      ? result.subscriptionExpiresAt.split('T')[0]
      : (() => {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + newDaysRemaining);
          return expDate.toISOString().split('T')[0];
        })();

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
  const handleUpdateStoreInfo = async (updated: Partial<StoreInfo>) => {
    try {
      const res = await storeApi.updateStoreInfo({
        name: updated.name || storeInfo.name,
        taxCode: updated.taxCode,
        hotline: updated.hotline,
        address: updated.address,
        city: updated.city,
      });
      if (res.success && res.data) {
        setStoreInfo((prev) => mapBackendStoreToFrontend(res.data, prev.walletBalance));
        return;
      }
    } catch {
      // fallback local update
    }
    setStoreInfo((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="store-hub-container">
      {/* 1. Sidebar bên trái chuẩn phong cách KiotViet */}
      <StoreSidebarNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* 2. Không gian làm việc chính bên phải */}
      <div className="store-hub-main">
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
              currentPlanName={storeInfo.currentPlan}
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

        {/* Tab 5: Điều khoản sử dụng */}
        {activeTab === 'terms' && (
          <div style={{ marginTop: 8 }}>
            <TermsOfServiceTab />
          </div>
        )}

        {/* Tab 6: Thanh toán & Ví gian hàng */}
        {activeTab === 'wallet' && (
          <div style={{ marginTop: 8 }}>
            <WalletLedgerTab
              storeInfo={storeInfo}
              transactions={transactions}
              onOpenTopupModal={() => setShowTopupModal(true)}
            />
          </div>
        )}
      </div>

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

export default StoreSettingsHubPage;

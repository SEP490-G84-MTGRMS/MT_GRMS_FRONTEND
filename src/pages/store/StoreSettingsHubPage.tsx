// src/pages/store/StoreSettingsHubPage.tsx
import { useState, useEffect, type FC } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import {
  INITIAL_STORE_INFO,
  SUBSCRIPTION_PLANS,
  type StoreInfo,
  type SubscriptionPlanItem,
} from "./storeData";
import {
  StoreSidebarNav,
  type StoreHubTabKey,
} from "./components/StoreSidebarNav";
import { StoreTopStatusBar } from "./components/StoreTopStatusBar";
import { StoreInfoTab } from "./components/StoreInfoTab";
import { SubscriptionPricingCards } from "./components/SubscriptionPricingCards";
import { SubscriptionCheckoutModal } from "./components/SubscriptionCheckoutModal";
import { StoreWalletTopupModal } from "./components/StoreWalletTopupModal";
import { OrderHistoryTab } from "./components/OrderHistoryTab";
import { TermsOfServiceTab } from "./components/TermsOfServiceTab";
import { WalletLedgerTab } from "./components/WalletLedgerTab";
import { BranchManagementTab } from "./components/BranchManagementTab";
import { storeApi, mapBackendStoreToFrontend, type TrialStatus } from "./api/storeApi";
import { StorageAddonCard } from "./components/StorageAddonCard";
import { BranchAddonModal } from "./components/BranchAddonModal";
import { TrialStatusBanner } from "./components/TrialStatusBanner";

const VALID_TABS: StoreHubTabKey[] = [
  "store-info",
  "branches",
  "subscriptions",
  "order-history",
  "terms",
  "wallet",
];

export const StoreSettingsHubPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const isAccountProfileRedirect = rawTab === "account-profile";

  const tabParam = rawTab as StoreHubTabKey | null;

  const [activeTab, setActiveTab] = useState<StoreHubTabKey>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "store-info",
  );

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    ...INITIAL_STORE_INFO,
    name: "Đang tải...",
    currentPlan: "Đang tải...",
    subscriptionExpiresAt: "Chưa kích hoạt",
    daysRemaining: 0,
    branchesCount: 1,
    walletBalance: 0,
  });
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [walletRefreshKey, setWalletRefreshKey] = useState<number>(0);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<SubscriptionPlanItem | null>(null);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [showBranchAddonModal, setShowBranchAddonModal] = useState<boolean>(false);
  const isEligibleNoPlan = trialStatus?.state === "ELIGIBLE";
  const effectiveStoreInfo: StoreInfo = isEligibleNoPlan
    ? {
        ...storeInfo,
        currentPlan: "Chưa kích hoạt",
        subscriptionExpiresAt: "Chưa kích hoạt",
        daysRemaining: 0,
      }
    : storeInfo;
  const currentPlanCode = effectiveStoreInfo.currentPlan.toUpperCase();
  const isStandardPlan =
    !isEligibleNoPlan &&
    (currentPlanCode.includes("STANDARD") || currentPlanCode.includes("THƯỜNG"));
  const isProPlan = !isEligibleNoPlan && currentPlanCode.includes("PRO");

  const refreshStoreAndTrialStatus = async () => {
    try {
      const [infoRes, trialRes] = await Promise.allSettled([
        storeApi.getStoreInfo(),
        storeApi.getTrialStatus(),
      ]);
      if (infoRes.status === "fulfilled" && infoRes.value.success && infoRes.value.data) {
        setStoreInfo((prev) =>
          mapBackendStoreToFrontend(infoRes.value.data, prev.walletBalance),
        );
      }
      if (trialRes.status === "fulfilled" && trialRes.value.success && trialRes.value.data) {
        setTrialStatus(trialRes.value.data);
      }
    } catch {
      // Giữ trạng thái hiện tại nếu mạng lỗi
    }
  };

  // Load real store info + trial onboarding status from Backend API
  useEffect(() => {
    if (isAccountProfileRedirect) return;
    let active = true;
    Promise.allSettled([storeApi.getStoreInfo(), storeApi.getTrialStatus()]).then(([infoRes, trialRes]) => {
      if (!active) return;
      if (infoRes.status === "fulfilled" && infoRes.value.success && infoRes.value.data) {
        setStoreInfo((prev) => mapBackendStoreToFrontend(infoRes.value.data, prev.walletBalance));
      }
      if (trialRes.status === "fulfilled" && trialRes.value.success && trialRes.value.data) {
        setTrialStatus(trialRes.value.data);
      }
    });
    return () => { active = false; };
  }, [isAccountProfileRedirect]);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  if (isAccountProfileRedirect) {
    return <Navigate to="/store-owner/account?tab=account-profile" replace />;
  }

  // Điều hướng chuyển tab khi click sidebar
  const handleSelectTab = (tab: StoreHubTabKey) => {
    setActiveTab(tab);
    navigate(`/store-owner/subscriptions?tab=${tab}`);
  };

  // Nạp tiền ví
  const handleTopupSuccess = (amount: number, newBalance?: number) => {
    const newBal =
      newBalance !== undefined ? newBalance : storeInfo.walletBalance + amount;

    setStoreInfo((prev) => ({
      ...prev,
      walletBalance: newBal,
    }));
    setWalletRefreshKey((k) => k + 1);
    setShowTopupModal(false);
  };

  // Mua gói dịch vụ
  const handlePurchaseSuccess = (result: {
    planName: string;
    months: number;
    totalAmount: number;
    paymentMethod: "Wallet" | "VietQR";
    subscriptionExpiresAt?: string;
    daysRemaining?: number;
  }) => {
    let newBal = storeInfo.walletBalance;
    if (result.paymentMethod === "Wallet") {
      newBal = Math.max(0, storeInfo.walletBalance - result.totalAmount);
    }

    // Gia hạn thêm ngày (ưu tiên dữ liệu từ backend trả về)
    const newDaysRemaining =
      result.daysRemaining !== undefined
        ? result.daysRemaining
        : storeInfo.daysRemaining + result.months * 30;

    const newExpStr = result.subscriptionExpiresAt
      ? result.subscriptionExpiresAt.split("T")[0]
      : (() => {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + newDaysRemaining);
          return expDate.toISOString().split("T")[0];
        })();

    setStoreInfo((prev) => ({
      ...prev,
      currentPlan: result.planName,
      daysRemaining: newDaysRemaining,
      subscriptionExpiresAt: newExpStr,
      walletBalance: newBal,
    }));
    setWalletRefreshKey((k) => k + 1);
    setSelectedPlanForCheckout(null);
    refreshStoreAndTrialStatus();
  };

  const trialPlanItem =
    SUBSCRIPTION_PLANS.find((p) => p.code === "TRIAL") ?? SUBSCRIPTION_PLANS[0];

  const handleUpdateStoreInfo = async (
    updated: Partial<StoreInfo>,
  ): Promise<boolean> => {
    try {
      const res = await storeApi.updateStoreInfo({
        name: updated.name || storeInfo.name,
        taxCode: updated.taxCode,
        hotline: updated.hotline,
        address: updated.address,
        city: updated.city,
      });
      if (res.success && res.data) {
        setStoreInfo((prev) =>
          mapBackendStoreToFrontend(res.data, prev.walletBalance),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Update store info error:", error);
      return false;
    }
  };

  return (
    <div className="store-hub-container">
      {/* 1. Sidebar bên trái chuẩn phong cách KiotViet */}
      <StoreSidebarNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* 2. Không gian làm việc chính bên phải */}
      <div className="store-hub-main">
        {/* Top Status Bar */}
        <StoreTopStatusBar
          storeInfo={effectiveStoreInfo}
          onNavigateBranches={() => handleSelectTab("branches")}
        />

        {/* Tab 0: Thông tin gian hàng */}
        {activeTab === "store-info" && (
          <StoreInfoTab
            storeInfo={effectiveStoreInfo}
            onUpdateStoreInfo={handleUpdateStoreInfo}
          />
        )}

        {/* Tab 1: Gói dịch vụ */}
        {activeTab === "subscriptions" && (
          <div style={{ width: "100%" }}>
            <TrialStatusBanner
              trialStatus={trialStatus}
              onStartTrial={() => setSelectedPlanForCheckout(trialPlanItem)}
              onOpenWallet={() => handleSelectTab("wallet")}
            />
            {isStandardPlan && <StorageAddonCard
              onPurchased={(amount) => {
                setStoreInfo((prev) => ({ ...prev, walletBalance: Math.max(0, prev.walletBalance - amount) }));
                setWalletRefreshKey((key) => key + 1);
              }}
            />}
            {isProPlan && <section style={{ marginBottom: 18, padding: 20, border: "1px solid #DDE7F3", borderRadius: 24, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div><strong style={{ color: "#0F172A" }}>Mở rộng chuỗi cửa hàng</strong><div style={{ marginTop: 4, color: "#64748B", fontSize: 13 }}>Gói Pro có thể mua thêm chi nhánh: 80.000 đ/chi nhánh/tháng.</div></div>
              <button type="button" onClick={() => setShowBranchAddonModal(true)} style={{ padding: "10px 18px", border: 0, borderRadius: 9999, background: "#0066FF", color: "#FFF", fontWeight: 700 }}>Mua thêm chi nhánh</button>
            </section>}
            <SubscriptionPricingCards
              onSelectPlan={(plan) => setSelectedPlanForCheckout(plan)}
              currentPlanName={effectiveStoreInfo.currentPlan}
              trialState={trialStatus?.state ?? null}
            />
          </div>
        )}

        {/* Tab: Chi nhánh & Kho hàng */}
        {activeTab === "branches" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <BranchManagementTab
              onGoToSubscriptions={() => handleSelectTab("subscriptions")}
            />
          </div>
        )}

        {/* Tab 3: Lịch sử mua hàng */}
        {activeTab === "order-history" && <OrderHistoryTab />}

        {/* Tab 4: Điều khoản sử dụng */}
        {activeTab === "terms" && (
          <div style={{ marginTop: 8 }}>
            <TermsOfServiceTab />
          </div>
        )}

        {/* Tab 5: Thanh toán & Ví gian hàng */}
        {activeTab === "wallet" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              marginTop: 4,
            }}
          >
            <WalletLedgerTab
              refreshKey={walletRefreshKey}
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

      {showBranchAddonModal && (
        <BranchAddonModal
          onClose={() => setShowBranchAddonModal(false)}
          onPurchased={(amount) => {
            setStoreInfo((prev) => ({ ...prev, walletBalance: Math.max(0, prev.walletBalance - amount) }));
            setWalletRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
};

export default StoreSettingsHubPage;

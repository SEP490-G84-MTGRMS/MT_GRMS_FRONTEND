import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SubscriptionLockOverlay } from "../../../components/auth/SubscriptionLockOverlay";
import { useAuthStore } from "../../../stores/useAuthStore";
import { storeApi } from "../api/storeApi";

export function StaffManagementGate({ children, isOwner = true }: { children: ReactNode; isOwner?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const store = useQuery({
    queryKey: ["staff-management-access", user?.tenantId, user?.id],
    queryFn: async () => {
      const result = await storeApi.getStoreInfo();
      if (!result.success || !result.data) throw new Error(result.message ?? "Không thể kiểm tra quyền.");
      return result.data;
    },
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  if (store.isFetching) return <p role="status" style={{ padding: 24 }}>Đang kiểm tra quyền Quản lý nhân viên…</p>;
  if (!store.data || store.isError) {
    return (
      <section style={{ padding: 24 }}>
        <p role="alert">Không thể kiểm tra quyền Quản lý nhân viên.</p>
        <button type="button" className="store-btn-secondary" onClick={() => void store.refetch()}>Thử lại</button>
      </section>
    );
  }
  if (!store.data.staffManagementLocked) return children;

  return (
    <SubscriptionLockOverlay
      isOwner={isOwner}
      lockReason="STAFF_ADDON_REQUIRED"
      onGoToBilling={() => navigate("/store-owner/subscriptions?tab=subscriptions")}
    />
  );
}

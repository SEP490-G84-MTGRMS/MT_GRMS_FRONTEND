// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storeApi, type BackendTenantStoreResponse } from "../api/storeApi";
import { StaffAddonModal } from "../components/StaffAddonModal";
import { StaffManagementGate } from "../components/StaffManagementGate";
import { SubscriptionPricingCards } from "../components/SubscriptionPricingCards";

if (!HTMLDialogElement.prototype.showModal) {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
}

const store: BackendTenantStoreResponse = {
  id: "tenant-1", subdomain: "shop", name: "Shop", code: "SHOP", status: "ACTIVE",
  currentPlan: "STANDARD", branchCount: 1, maxBranches: 1, staffCount: 1, maxStaff: 1,
};

afterEach(() => vi.restoreAllMocks());

function BillingDestination() {
  const { search } = useLocation();
  return <p>Trang Gói dịch vụ {search}</p>;
}

describe("Tiện ích Quản lý nhân viên", () => {
  it("khóa nội dung quản lý khi Gói Thường chưa mua tiện ích", async () => {
    vi.spyOn(storeApi, "getStoreInfo").mockResolvedValueOnce({
      success: true, data: { ...store, staffManagementLocked: true },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/store-owner/employees"]}>
          <Routes>
            <Route path="/store-owner/employees" element={<StaffManagementGate><p>Hồ sơ nhân viên</p></StaffManagementGate>} />
            <Route path="/store-owner/subscriptions" element={<BillingDestination />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "Quản lý nhân viên đang khóa" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByText("Hồ sơ nhân viên")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Nâng cấp" }));
    expect(await screen.findByText("Trang Gói dịch vụ ?tab=subscriptions")).toBeInTheDocument();
  });

  it("hiển thị màn quản lý khi quyền đã được bật", async () => {
    vi.spyOn(storeApi, "getStoreInfo").mockResolvedValueOnce({
      success: true, data: { ...store, staffManagementLocked: false },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><StaffManagementGate><p>Hồ sơ nhân viên</p></StaffManagementGate></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Hồ sơ nhân viên")).toBeInTheDocument();
  });

  it("đổi nút mua trên thẻ Gói Thường thành trạng thái đã mở khóa", async () => {
    vi.spyOn(storeApi, "getPricingPlans").mockResolvedValue({ success: true, data: [] });
    const onBuyStaffAddon = vi.fn();
    const onSelectPlan = vi.fn();
    const { rerender } = render(
      <SubscriptionPricingCards currentPlanName="STANDARD" trialState="PAID"
        onSelectPlan={onSelectPlan} onBuyStaffAddon={onBuyStaffAddon} />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Mua thêm Quản lý nhân viên" }));
    expect(onBuyStaffAddon).toHaveBeenCalledOnce();
    expect(onSelectPlan).not.toHaveBeenCalled();

    rerender(<SubscriptionPricingCards currentPlanName="STANDARD" trialState="PAID"
      onSelectPlan={onSelectPlan} hasStaffAddon />);
    expect(screen.queryByRole("button", { name: "Mua thêm Quản lý nhân viên" })).not.toBeInTheDocument();
    expect(screen.getByText("Đã mở khóa Quản lý nhân viên")).toBeInTheDocument();
  });

  it("giữ mã giao dịch khi thử lại và chỉ mở khóa sau khi thanh toán thành công", async () => {
    const quote = { subtotal: 25_000, vat: 2_500, total: 27_500, expiresAt: "2026-12-17T12:00:00Z" };
    const onPurchased = vi.fn();
    vi.spyOn(storeApi, "getStaffAddonQuote").mockResolvedValue({ success: true, data: quote });
    const purchase = vi.spyOn(storeApi, "purchaseStaffAddon")
      .mockRejectedValueOnce(new Error("Kết nối gián đoạn"))
      .mockResolvedValueOnce({ success: true, data: { walletBalance: 72_500 } });
    render(<StaffAddonModal onClose={vi.fn()} onPurchased={onPurchased} />);

    const button = await screen.findByRole("button", { name: "Thanh toán bằng Ví gian hàng" });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Kết nối gián đoạn");
    expect(onPurchased).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith(72_500));
    expect(purchase).toHaveBeenCalledTimes(2);
    expect(purchase.mock.calls[1]).toEqual(purchase.mock.calls[0]);
    expect(purchase.mock.calls[0]?.[0]).toEqual(quote);
  });
});

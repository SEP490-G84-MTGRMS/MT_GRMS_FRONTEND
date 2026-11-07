# Worklog: Nâng cấp Giao diện Nạp ví SePay & Tích hợp API (Frontend)

- **Ngày thực hiện**: 2026-11-04
- **Mã task / Tính năng**: `FE-WALLET` / `wallet-topup-sepay-integration`
- **Người thực hiện**: AI Coding Assistant (Antigravity)
- **Dự án**: `MT_GRMS_FRONTEND`

---

## 1. Mục đích (Why)
- Thay thế hoàn toàn giao diện nạp ví giả lập (mock SVG QR) bằng trải nghiệm nạp ví VietQR SePay thật.
- Đồng bộ toàn diện hệ màu Deep Teal (`#0F766E`), nền pastel nhẹ (`#F0FDFA`), viền tinh tế (`#CCFBF1`), font chữ `Be Vietnam Pro` (`var(--font-sans)`).
- Tích hợp Polling tự động 3 giây/lần kiểm tra giao dịch nạp tiền và cập nhật số dư gian hàng tức thời.

---

## 2. Danh sách tệp & Nội dung thay đổi (What)
- `src/pages/store/api/walletApi.ts`: Tạo API client service kết nối các endpoint `/tenant/wallet/topup-order`, `/tenant/wallet/topup-status/{code}`, `/tenant/wallet/balance`, `/tenant/wallet/transactions`.
- `src/pages/store/api/storeApi.ts`: Bổ sung `walletBalance` vào `BackendTenantStoreResponse` và map số dư ví thật từ backend vào store info frontend.
- `src/pages/store/components/StoreWalletTopupModal.tsx`:
  - Tái thiết kế toàn diện theo chuẩn Deep Teal (`var(--blue-primary)`).
  - Tự động gọi API tạo đơn nạp tiền khi đổi mệnh giá (debounce 400ms).
  - Hiển thị ảnh VietQR thật từ SePay QR URL với mã giao dịch tự động.
  - Tích hợp Polling ngầm mỗi 3 giây; khi nhận `COMPLETED`, hiển thị màn hình chúc mừng và cập nhật số dư ngay mà không cần reload trang.
  - Nút copy nhanh 1 chạm cho số tài khoản và nội dung chuyển khoản kèm visual tick xanh.
- `src/pages/store/components/WalletLedgerTab.tsx`:
  - Đồng bộ hệ màu Deep Teal, font chữ và số tiền `tabular-nums`.
  - Tự động gọi `walletApi.getTransactions()` và `walletApi.getBalance()` để hiển thị sổ cái thực tế từ cơ sở dữ liệu.
- `src/pages/store/StoreSettingsHubPage.tsx`:
  - Cập nhật hàm `handleTopupSuccess` nhận số dư mới `newBalance` từ backend và cập nhật reactive state.
- `src/pages/store/components/SubscriptionCheckoutModal.tsx`:
  - Kiểm tra số dư ví khả dụng thực tế khi chọn thanh toán bằng ví, chặn submit và thông báo lỗi rõ ràng nếu thiếu tiền.

---

## 3. Kết quả Kiểm thử (Verification)
- `npm run build`: `✓ built in 1.33s`, 0 errors, production build thành công.

---

## 4. Ghi chú cho Manager khi duyệt & merge
- **Mức độ rủi ro**: Thấp (Low).
- **Giao diện**: Đồng bộ hoàn toàn typography và bảng màu Deep Teal với modal Checkout.


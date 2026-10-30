# 📋 KẾ HOẠCH HOÀN THIỆN PHÂN HỆ TÀI CHÍNH — MT-GRMS
> Tài liệu làm việc: vừa để theo dõi tiến độ, vừa là checklist thực thi từng nhiệm vụ.  
> Cập nhật trạng thái mỗi task bằng cách đổi `[ ]` → `[x]`.

**Nguồn tổng hợp:** BAO_CAO_1 · BAO_CAO_2 · TIEN_DO_TAI_CHINH_CHI_TIET  
**Ngày lập:** 2026-10-31 | **Nhánh BE:** `feature/refactor-tax-finance-backend` | **Nhánh FE:** `feature/FE19-tax-finance-polish`

---

## 🗺️ Tổng quan tiến độ hiện tại

| Module | BE | FE | Tổng | Mục tiêu |
|--------|----|----|------|----------|
| Auth & RBAC nền tảng | 60% | 50% | **55%** | 100% |
| Sổ quỹ (Cashbook) | 85% | 65% | **75%** | 100% |
| Phiếu chi (Expenses) | 90% | 80% | **85%** | 100% |
| Lãi/Lỗ (P&L) | 88% | 85% | **87%** | 100% |
| Thuế HKD (Tax) | 80% | 60% | **70%** | 100% |
| Công nợ (Customer Debt) | 90% | 0% | **45%** | 100% |

---

## 🚨 GIAI ĐOẠN 0 — Nền tảng Bảo mật (Unblock tất cả module)
> **Phải làm TRƯỚC TIÊN.** Nếu bỏ qua, mọi `[Authorize]` thêm vào đều vô nghĩa vì Role luôn là "ADMIN" và mật khẩu plain-text.  
> Ước tính: **~3 giờ**

### TASK-0.1 — BCrypt hóa mật khẩu trong AuthService
- **File:** `MT_GRMS.Application/Auth/AuthService.cs` (dòng 36)
- **Vấn đề:** `user.Password != request.Password` → so sánh plain-text, toàn bộ mật khẩu DB lộ nếu bị dump
- **Ghi chú kỹ thuật:**
  - Entity `User.cs` đã có field `PasswordHash` (dòng 17) và alias `Password → PasswordHash` (dòng 45). Nên dữ liệu đang lưu dưới dạng gì phụ thuộc vào Seeder.
  - Cần kiểm tra `DatabaseSeeder.SeedAsync` xem đang seed `PasswordHash` hay `Password` với giá trị gì.
  - Nếu Seeder đang lưu plain-text → phải re-seed với BCrypt hash.
- **Các bước thực hiện:**
  - [ ] Đọc `DatabaseSeeder.SeedAsync` — xác nhận giá trị seed cho `PasswordHash`
  - [ ] Thêm NuGet package: `dotnet add package BCrypt.Net-Next --project src/MT_GRMS.Application`
  - [ ] Sửa `AuthService.LoginAsync`: đổi `user.Password != request.Password` → `!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)`
  - [ ] Cập nhật Seeder: hash mật khẩu `Admin@123`, `Manager@123`, `Cashier@123` bằng `BCrypt.Net.BCrypt.HashPassword(...)`
  - [ ] Chạy migration seed lại (hoặc xóa + re-seed trên Neon)
  - [ ] Chạy lại test: `dotnet test` → xác nhận pass

```csharp
// AuthService.cs — SAU KHI SỬA
if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
{
    throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
}
```

---

### TASK-0.2 — Trả đúng Role từ TenantUser thay vì hardcode "ADMIN"
- **File:** `MT_GRMS.Application/Auth/AuthService.cs` (dòng 45)
- **Vấn đề:** `var role = "ADMIN";` hardcoded → mọi user đều là ADMIN → `[Authorize(Roles = "X")]` không hoạt động đúng
- **Ghi chú kỹ thuật:**
  - `User.cs` có navigation `ICollection<TenantUser> TenantUsers`
  - `TenantUser.cs` cần có field `Role` (hoặc `RoleName`) — cần xác nhận schema
  - Cần `.Include(u => u.TenantUsers)` trong `UserRepository.GetByUsernameAsync` hoặc query riêng
- **Các bước thực hiện:**
  - [ ] Đọc `TenantUser.cs` — xác nhận field Role và kiểu dữ liệu (string/enum)
  - [ ] Đọc `UserRepository.GetByUsernameAsync` — kiểm tra có Include TenantUsers không
  - [ ] Sửa query để Include TenantUsers nếu chưa có
  - [ ] Trong `AuthService.LoginAsync`, đổi `var role = "ADMIN"` → đọc từ `user.TenantUsers.FirstOrDefault(tu => tu.TenantId == tenantId)?.Role ?? "CASHIER"`
  - [ ] Cập nhật `RefreshTokenAsync` — hiện tại cũng hardcode `RoleName: "ADMIN"` (dòng 78) → cần lookup hoặc embed role vào RefreshToken payload
  - [ ] Chạy test xác nhận role truyền đúng vào JWT claims

---

### TASK-0.3 — Xóa Mock Fallback trong authService.ts (Frontend)
- **File:** `src/features/auth/authService.ts`
- **Vấn đề:** `catch (error) { return MOCK_USER; }` → auth fail vẫn đăng nhập được bằng user giả → bảo mật bằng 0
- **Ghi chú kỹ thuật:**
  - `AuthController` đã có cả hai route: `api/v1/auth` và `api/auth` (dòng 10-11 trong file controller) nên cả `httpClient` (baseURL `/api/v1`) lẫn `financeHttpClient` (baseURL `/api`) đều có thể reach được.
  - Frontend đang dùng client nào để gọi login cần kiểm tra — nếu đang dùng `httpClient` với `/api/v1`, route `api/v1/auth/login` đã có sẵn trên Backend.
- **Các bước thực hiện:**
  - [ ] Đọc `authService.ts` — xác nhận URL đang gọi và client đang dùng
  - [ ] Xóa block `catch (error) { return MOCK_USER; }` → thay bằng `throw error` (hoặc re-throw với message tiếng Việt)
  - [ ] Thêm `try/catch` ở component Login để hiển thị toast lỗi
  - [ ] Test đăng nhập thật với tài khoản `admin / Admin@123` — xác nhận JWT nhận được
  - [ ] Test đăng nhập sai → phải thấy lỗi, không được vào được

---

## ⚠️ GIAI ĐOẠN 1 — Bảo vệ Dòng Tiền (RBAC toàn bộ controller tài chính)
> Phụ thuộc: TASK-0.2 phải xong (Role đọc đúng từ DB) thì Authorize mới có tác dụng.  
> Ước tính: **~2 giờ**

### TASK-1.1 — [Authorize] cho ExpensesController
- **File:** `MT_GRMS.Api/Controllers/ExpensesController.cs`
- **Vấn đề:** `ApproveExpense` và `DisburseExpense` không có Authorize → thu ngân tự duyệt phiếu chi
- **Nguy cơ gian lận:** Thu ngân lập phiếu → tự duyệt → tự chi → gạch bút toán → mất tiền
- **Các bước thực hiện:**
  - [ ] Thêm `[Authorize]` ở class level controller (block tất cả endpoint với authenticated user)
  - [ ] Thêm `[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER,SUPER_ADMIN")]` riêng cho `ApproveExpense`
  - [ ] Thêm `[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER,SUPER_ADMIN")]` riêng cho `DisburseExpense`
  - [ ] `CreateExpense`: `[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER,CASHIER")]` — thu ngân được tạo đề xuất
  - [ ] Chạy test integration → xác nhận 401 khi không có token, 403 khi sai role

---

### TASK-1.2 — [Authorize] cho CashbookController
- **File:** `MT_GRMS.Api/Controllers/CashbookController.cs`
- **Vấn đề:** Tất cả 14 endpoint đều public — bất kỳ ai cũng gọi được
- **Phân tầng quyền cần áp dụng:**
  - `shifts/open`, `shifts/close`: `CASHIER,BRANCH_MANAGER,STORE_OWNER`
  - `cash-drop`, `receipts`, `payments`: `CASHIER,BRANCH_MANAGER,STORE_OWNER`
  - `transfers`, `reconcile`, `deposits/bank`, `deposits/confirm`: `BRANCH_MANAGER,STORE_OWNER`
  - `entries/{id}/void`: `STORE_OWNER,SUPER_ADMIN` ← nhạy cảm nhất
  - `entries (GET)`, `accounts (GET)`, `summary (GET)`: tất cả role đã đăng nhập
- **Các bước thực hiện:**
  - [ ] Thêm `[Authorize]` ở class level
  - [ ] Annotate từng endpoint theo phân tầng ở trên
  - [ ] Chạy test: xác nhận CASHIER không void được, MANAGER không dùng endpoint OWNER

---

### TASK-1.3 — [Authorize] cho CustomerDebtController
- **File:** `MT_GRMS.Api/Controllers/CustomerDebtController.cs`
- **Vấn đề:** Tất cả 7 endpoint public — ai cũng ghi/xóa công nợ
- **Phân tầng quyền:**
  - `record-sale-debt`, `repay`: `CASHIER,BRANCH_MANAGER,STORE_OWNER`
  - `goods-return-offset`, `adjust`: `BRANCH_MANAGER,STORE_OWNER`
  - `write-off`: `STORE_OWNER,SUPER_ADMIN` ← quan trọng nhất
  - `profile/{id}`, `ledger/{id}` (GET): tất cả role đã đăng nhập
- **Các bước thực hiện:**
  - [ ] Thêm `[Authorize]` class level
  - [ ] Annotate từng endpoint theo phân tầng ở trên
  - [ ] Thêm cross-tenant filter: kiểm tra `customerId` thuộc `TenantId` trong claims — **xem TASK-1.4**

---

### TASK-1.4 — Cross-tenant Isolation cho CustomerDebt
- **File:** `MT_GRMS.Application/CustomerDebt/CustomerDebtService.cs` (cần kiểm tra)
- **Vấn đề:** Tenant A có thể đọc/ghi công nợ khách hàng của Tenant B nếu biết `customerId`
- **Ghi chú kỹ thuật:**
  - Cần extract `TenantId` từ JWT claims: `User.FindFirstValue("tenantId")`
  - Inject vào query: `WHERE customer.TenantId = @tenantId AND customer.Id = @customerId`
  - Nếu query trả null → trả 404 (không expose "đây là khách của tenant khác")
- **Các bước thực hiện:**
  - [ ] Đọc `CustomerDebtService.cs` — xác nhận các query có filter TenantId chưa
  - [ ] Tạo `ITenantContext` interface nếu chưa có — inject `TenantId` từ claims vào service
  - [ ] Thêm `.Where(c => c.TenantId == tenantId)` vào tất cả query liên quan
  - [ ] Viết integration test: tenant A không thấy data của tenant B

---

### TASK-1.5 — [Authorize] cho HouseholdTaxController
- **File:** `MT_GRMS.Api/Controllers/HouseholdTaxController.cs`
- **Vấn đề:** Snapshot thuế public → ai cũng tạo được snapshot giả
- **Các bước thực hiện:**
  - [ ] Thêm `[Authorize]` class level
  - [ ] `POST /snapshots`: `[Authorize(Roles = "STORE_OWNER,SUPER_ADMIN")]`
  - [ ] `POST /snapshots/{id}/verify-integrity`: `[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER,SUPER_ADMIN")]`
  - [ ] Sửa fallback user cứng: thay `"user-owner-001"` / `"store_owner"` → `User.FindFirstValue(ClaimTypes.NameIdentifier)` + throw nếu null
  - [ ] Chạy test: verify 401 khi gọi không có JWT

---

## 🔴 GIAI ĐOẠN 2 — Fix Bug Nghiệp vụ P0
> Các bug này gây ra số liệu sai trên dashboard → sai báo cáo thuế → rủi ro pháp lý.  
> Ước tính: **~3 giờ**

### TASK-2.1 — Fix HMAC Key từ ENV (Tax Module)
- **File:** `MT_GRMS.Application/Tax/HouseholdTaxService.cs` hoặc `HouseholdTaxController.cs`
- **Vấn đề:** HMAC key hardcoded trong source code → ai đọc code có thể làm giả snapshot thuế
- **Ghi chú kỹ thuật:**
  - Key rotation cần lưu cả `CurrentKey` và `PreviousKey` trong config
  - `appsettings.json` được commit lên git → phải để trống, fill bằng `appsettings.Development.json` (gitignored) hoặc ENV variable
  - Trên Neon/production: dùng `TAXHMAC__CURRENTKEY` và `TAXHMAC__PREVIOUSKEY` làm ENV
- **Các bước thực hiện:**
  - [ ] Xác định vị trí `_keyStore` trong code
  - [ ] Thêm vào `appsettings.json`:
    ```json
    "TaxHmac": { "CurrentKey": "", "PreviousKey": "" }
    ```
  - [ ] Tạo `appsettings.Development.json` (đã gitignored) với key thật
  - [ ] Sửa code: `_configuration["TaxHmac:CurrentKey"] ?? throw new InvalidOperationException("HMAC key not configured")`
  - [ ] Xác nhận `appsettings.Development.json` trong `.gitignore`
  - [ ] Chạy test `TaxSnapshotSignatureTests.cs` → pass

---

### TASK-2.2 — Fix COGS Null Bug trong P&L
- **File:** `MT_GRMS.Application/Reports/PnLReportService.cs`
- **Vấn đề:** `var cogs = orderItem.CostPrice ?? 0` → sản phẩm chưa có giá vốn bị coi là giá vốn 0 → lợi nhuận ảo → thuế tính sai
- **Phân biệt nghiệp vụ:**
  - `CostPrice == null`: THIẾU DỮ LIỆU — không được dùng vào tính toán
  - `CostPrice == 0`: Hàng tặng kèm/khuyến mại — hợp lệ
- **Các bước thực hiện:**
  - [ ] Đọc `PnLReportService.cs` — tìm tất cả chỗ dùng `CostPrice ?? 0`
  - [ ] Tạo enum/flag: `CostDataStatus { Complete, Missing, ZeroPrice }`
  - [ ] Thay `?? 0` bằng logic:
    ```csharp
    if (item.CostPrice == null) {
        incompleteItems.Add(item.ProductId);
        continue; // bỏ qua, không tính vào COGS
    }
    cogs += item.CostPrice.Value * item.Quantity;
    ```
  - [ ] Thêm field `HasIncompleteData: bool` và `IncompleteProductCount: int` vào response DTO
  - [ ] Thêm field `CogsCoveragePercent: decimal` để biết % sản phẩm có giá vốn
  - [ ] Cập nhật test `PnLReportServiceTests.cs` với case `CostPrice = null`
  - [ ] Chạy test → pass

---

## 🟠 GIAI ĐOẠN 3 — Kết nối Frontend Công nợ Khách hàng (Critical Gap)
> Đây là module **0% frontend** — backend hoàn chỉnh nhưng không có UI nào gọi vào.  
> Ước tính: **~6 giờ**

### TASK-3.1 — Tạo customerDebtApi.ts
- **File mới:** `src/features/customer-crm/api/customerDebtApi.ts`
- **Lý do tách file riêng:** `customerApi.ts` hiện có nhiều hàm CRM khác (tìm kiếm, lịch sử mua) không liên quan debt — không xóa, chỉ thêm file mới
- **HTTP Client:** `financeHttpClient` (baseURL `/api`) → khớp với `api/customers/debt/*`
- **Các bước thực hiện:**
  - [ ] Tạo file `customerDebtApi.ts` với đầy đủ JSDoc
  - [ ] Implement 5 hàm cốt lõi:
    - `recordSaleDebt(payload): Promise<DebtRecord>`
    - `repayDebt(payload): Promise<RepayResult>`
    - `getCustomerDebtProfile(customerId): Promise<DebtProfile>`
    - `getCustomerDebtLedger(customerId, params): Promise<PagedResult<LedgerEntry>>`
    - `goodsReturnOffset(payload): Promise<OffsetResult>`
  - [ ] Tạo TypeScript interfaces cho request/response (đọc DTO từ backend)
  - [ ] Viết Vitest tests cho các hàm API

---

### TASK-3.2 — Tạo useCustomerDebt hook
- **File mới:** `src/features/customer-crm/hooks/useCustomerDebt.ts`
- **Lý do:** Cần hook để quản lý state loading/error/data và cache cho debt data
- **Các bước thực hiện:**
  - [ ] Implement `useCustomerDebtProfile(customerId)` hook
  - [ ] Implement `useCustomerDebtLedger(customerId, page)` hook
  - [ ] Implement `useRecordDebt()` mutation hook với optimistic update
  - [ ] Implement `useRepayDebt()` mutation hook
  - [ ] Handle lỗi với `problemDetailsMapper` → toast tiếng Việt
  - [ ] Viết test cho hooks

---

### TASK-3.3 — UI: CustomerDebtProfile component
- **File sửa/tạo:** `src/features/customer-crm/components/CustomerDebtProfile.tsx`
- **Vấn đề:** UI hiện tại đọc từ `localStorage` → cần thay bằng real API data
- **Các bước thực hiện:**
  - [ ] Thay `customerApi.getCustomerDebt(id)` → `useCustomerDebtProfile(id)`
  - [ ] Hiển thị: tổng dư nợ, ngày nợ cũ nhất, số đơn nợ, trạng thái
  - [ ] Loading skeleton khi fetch
  - [ ] Empty state khi khách không có nợ
  - [ ] Error state với retry button

---

### TASK-3.4 — UI: CustomerDebtLedger (sổ chi tiết)
- **File mới:** `src/features/customer-crm/components/CustomerDebtLedger.tsx`
- **Các bước thực hiện:**
  - [ ] Bảng lịch sử giao dịch nợ (phân trang) — dùng `useCustomerDebtLedger`
  - [ ] Columns: Ngày, Loại (nợ mới/trả/cấn trừ/điều chỉnh), Số tiền, Số dư còn lại, Ghi chú
  - [ ] Filter theo loại giao dịch, date range
  - [ ] Export CSV (P1, có thể để sau)

---

### TASK-3.5 — UI: Form ghi nợ & trả nợ
- **File mới/sửa:** `src/features/customer-crm/components/RecordDebtDialog.tsx`, `RepayDebtDialog.tsx`
- **Các bước thực hiện:**
  - [ ] Dialog ghi nợ: chọn khách hàng, số tiền, lý do, ngày hẹn trả
  - [ ] Dialog trả nợ: chọn khách, số tiền trả, ghi chú — hiển thị FIFO allocation
  - [ ] Validation: amount > 0, customerId required
  - [ ] Success: refresh profile + ledger, toast "Ghi nhận thành công"
  - [ ] Error: hiển thị lỗi từ BE (RFC 7807 mapper)

---

### TASK-3.6 — Tích hợp ghi nợ vào flow POS
- **File sửa:** `src/features/pos/` (tìm component thanh toán)
- **Vấn đề:** Khi khách mua hàng chịu tại POS, hiện không ghi vào `CustomerDebtController`
- **Ghi chú:** Đây là tích hợp quan trọng nhất — debt phải xuất phát từ đơn hàng thật
- **Các bước thực hiện:**
  - [ ] Tìm flow `handleCheckout` trong POS component
  - [ ] Sau khi tạo đơn thành công, nếu `paymentMethod === 'CREDIT'` → gọi `recordSaleDebt`
  - [ ] Truyền `orderId`, `customerId`, `amount`, `dueDate`
  - [ ] Handle lỗi: nếu ghi nợ fail → rollback đơn hàng hoặc alert để thu ngân xử lý thủ công

---

## 🟡 GIAI ĐOẠN 4 — Hoàn thiện UI/UX còn thiếu
> Các tính năng P1 — quan trọng cho UX nhưng không block production.  
> Ước tính: **~8 giờ**

### TASK-4.1 — Xóa Mock Fallback trong cashbookService.ts
- **File:** `src/features/cashbook/services/cashbookService.ts`
- **Vấn đề:** `INITIAL_ACCOUNTS` và `INITIAL_TRANSACTIONS` array (~100 dòng) được dùng khi API fail → ẩn lỗi thực tế
- **Quyết định đã chốt:** Xóa mock, hiển thị error state rõ ràng
- **Các bước thực hiện:**
  - [ ] Đọc file — xác nhận chính xác logic fallback (điều kiện nào kích hoạt mock)
  - [ ] Xóa `INITIAL_ACCOUNTS` và `INITIAL_TRANSACTIONS` constants
  - [ ] Thay fallback logic bằng: `throw error` hoặc trả `{ data: [], error: message }`
  - [ ] Cập nhật component sử dụng để handle error state (empty state UI)
  - [ ] Chạy test Vitest → pass

---

### TASK-4.2 — Xóa isMockEnabled() trong taxSnapshotApi.ts
- **File:** `src/features/tax-snapshot/api/taxSnapshotApi.ts`
- **Vấn đề:** `if (isMockEnabled()) return MOCK_TAX_DATA` → test môi trường dev luôn nhận mock khi `VITE_USE_MOCK_DATA=true`
- **Quyết định:** Neon DB test env luôn kết nối được → xóa flag, dùng real API
- **Các bước thực hiện:**
  - [ ] Xóa hàm `isMockEnabled()` hoặc làm nó luôn trả `false`
  - [ ] Xóa tất cả `if (isMockEnabled())` block
  - [ ] Xóa import mock data constants liên quan
  - [ ] Đảm bảo `VITE_USE_MOCK_DATA` bị xóa khỏi `.env.development`
  - [ ] Chạy build `tsc -b && vite build` → 0 errors

---

### TASK-4.3 — UI Duyệt Phiếu Chi (Approve Flow)
- **File sửa:** `src/features/service-expenses/components/` (tìm list component)
- **Vấn đề:** Endpoint `POST /expenses/{id}/approve` không có UI — chỉ Swagger mới gọi được
- **Các bước thực hiện:**
  - [ ] Trong `ExpenseList.tsx` (hoặc tương đương), thêm nút "Duyệt" cho phiếu trạng thái `PENDING`
  - [ ] Nút chỉ hiển thị khi user có role `STORE_OWNER` hoặc `BRANCH_MANAGER` (check từ auth context)
  - [ ] Confirm dialog: "Bạn có chắc muốn duyệt phiếu này?"
  - [ ] Gọi `financeHttpClient.post('/expenses/{id}/approve')`
  - [ ] Refresh danh sách sau khi duyệt thành công

---

### TASK-4.4 — Hiển thị Trạng thái Phiếu Chi (Status Badge)
- **File sửa:** `src/features/service-expenses/` (tìm list và detail component)
- **Vấn đề:** User không biết phiếu đang ở bước nào trong quy trình
- **Các bước thực hiện:**
  - [ ] Tạo `ExpenseStatusBadge.tsx` component với 4 trạng thái:
    - `PENDING` → Chờ duyệt (màu vàng)
    - `APPROVED` → Đã duyệt (màu xanh lá)
    - `DISBURSED` → Đã giải ngân (màu xanh dương)
    - `REJECTED` → Bị từ chối (màu đỏ) — nếu có
  - [ ] Gắn badge vào danh sách phiếu
  - [ ] Gắn badge vào trang chi tiết phiếu

---

### TASK-4.5 — Warning UI khi P&L có dữ liệu COGS thiếu
- **File sửa:** `src/features/reports-pnl/components/PnLDashboard.tsx`
- **Phụ thuộc:** TASK-2.2 phải xong (BE trả `HasIncompleteData` trong response)
- **Vấn đề:** User nhìn thấy lợi nhuận sai mà không biết → quyết định kinh doanh sai
- **Các bước thực hiện:**
  - [ ] Sau khi TASK-2.2 xong, đọc field `hasIncompleteData` từ API response
  - [ ] Nếu `hasIncompleteData === true`, hiển thị Alert banner:
    > ⚠️ Có **{incompleteProductCount} sản phẩm** chưa nhập giá vốn. Lợi nhuận hiển thị chưa bao gồm những sản phẩm này và có thể cao hơn thực tế.
  - [ ] Link "Xem danh sách sản phẩm thiếu giá vốn" → navigate đến trang sản phẩm với filter

---

### TASK-4.6 — Form tạo Tax Snapshot từ UI
- **File mới:** `src/features/tax-snapshot/components/CreateSnapshotDialog.tsx`
- **Vấn đề:** Endpoint `POST /tax/household/snapshots` không có UI — chủ hộ không thể chốt kỳ thuế từ giao diện
- **Các bước thực hiện:**
  - [ ] Dialog với các field: Kỳ (tháng/năm), Phương pháp thuế (khoán/thực tế), Ghi chú
  - [ ] Hiển thị preview thuế ước tính trước khi chốt (gọi `GET /summary` trước)
  - [ ] Confirm: "Sau khi chốt, snapshot không thể sửa đổi. Tiếp tục?"
  - [ ] Gọi `POST /tax/household/snapshots` với Idempotency-Key
  - [ ] Hiển thị HMAC signature sau khi tạo thành công

---

### TASK-4.7 — Hiển thị Biểu thuế NĐ 68/2026
- **File mới/sửa:** `src/features/tax-snapshot/components/TaxRateTable.tsx`
- **Vấn đề:** User không biết đang áp thuế suất nào → không tin tưởng vào số liệu
- **Các bước thực hiện:**
  - [ ] Tạo component bảng biểu thuế lũy tiến theo NĐ 68/2026
  - [ ] Highlight dòng thuế suất đang áp dụng (dựa trên doanh thu kỳ hiện tại)
  - [ ] Tooltip giải thích cách tính

---

## 🟢 GIAI ĐOẠN 5 — Hoàn thiện & Chất lượng (P2 Nice-to-have)
> Làm sau khi P0/P1 đã xong. Không block go-live.  
> Ước tính: **~10 giờ**

### TASK-5.1 — DB CHECK Constraint balance ≥ 0 (Cashbook)
- **Migration mới** trên Neon: `AddCashbookBalanceConstraints`
- Thêm `CHECK (balance >= 0)` vào bảng `BranchCashTills`
- Thêm `CHECK (amount > 0)` vào `CashbookEntries`
- Chạy `dotnet ef migrations add AddCashbookBalanceConstraints && dotnet ef database update`

### TASK-5.2 — Background Service TTL Cleanup (IdempotencyStore)
- Tạo `IdempotencyCleanupService : BackgroundService`
- Chạy mỗi giờ, xóa records có `CreatedAt < NOW() - 24h` và `Status = DONE`
- Register trong `Program.cs`: `builder.Services.AddHostedService<IdempotencyCleanupService>()`

### TASK-5.3 — Kiểm tra Trạng thái Ca trước khi Void
- **File:** `CashbookService.cs` - `VoidEntryAsync`
- Thêm check: nếu entry thuộc ca đã `CLOSED` → trả lỗi `SHIFT_ALREADY_CLOSED`
- Chỉ `SUPER_ADMIN` mới được void entry của ca đã đóng (với lý do bắt buộc)

### TASK-5.4 — Export PDF/Excel cho P&L
- Dùng `EPPlus` (BE) hoặc `exceljs` (FE) để xuất báo cáo
- Endpoint mới: `GET /api/finance/reports/pnl/export?format=xlsx&period=...`

### TASK-5.5 — Date Range Picker tùy chỉnh cho P&L
- Thêm `DateRangePicker` component vào `PnLDashboard.tsx`
- Thay preset cố định (tháng/quý/năm) bằng picker linh hoạt

### TASK-5.6 — Caching P&L Summary (Response Cache)
- Thêm `[ResponseCache(Duration = 300)]` hoặc Memory Cache trong `PnLReportService`
- Cache key: `{tenantId}:{branchId}:{period}` — invalidate khi có order/expense mới

---

## 📊 Checklist Tổng hợp Theo Dõi

### Giai đoạn 0 — Nền tảng Bảo mật (~3h)
- [ ] TASK-0.1: BCrypt hóa mật khẩu (AuthService.cs)
- [ ] TASK-0.2: Trả đúng Role từ TenantUser
- [ ] TASK-0.3: Xóa mock fallback authService.ts (FE)

### Giai đoạn 1 — RBAC Bảo vệ Dòng Tiền (~2h)
- [ ] TASK-1.1: [Authorize] ExpensesController
- [ ] TASK-1.2: [Authorize] CashbookController (phân tầng)
- [ ] TASK-1.3: [Authorize] CustomerDebtController
- [ ] TASK-1.4: Cross-tenant isolation CustomerDebt
- [ ] TASK-1.5: [Authorize] HouseholdTaxController + fix fallback user

### Giai đoạn 2 — Fix Bug Nghiệp vụ (~3h)
- [ ] TASK-2.1: HMAC key ra ENV variable
- [ ] TASK-2.2: Fix COGS null bug trong P&L

### Giai đoạn 3 — Kết nối Customer Debt FE (~6h)
- [ ] TASK-3.1: Tạo customerDebtApi.ts
- [ ] TASK-3.2: Tạo useCustomerDebt hook
- [ ] TASK-3.3: UI CustomerDebtProfile
- [ ] TASK-3.4: UI CustomerDebtLedger
- [ ] TASK-3.5: Form ghi nợ & trả nợ
- [ ] TASK-3.6: Tích hợp ghi nợ vào POS

### Giai đoạn 4 — Hoàn thiện UI/UX (~8h)
- [ ] TASK-4.1: Xóa mock fallback cashbookService.ts
- [ ] TASK-4.2: Xóa isMockEnabled() taxSnapshotApi.ts
- [ ] TASK-4.3: UI Duyệt phiếu chi (Approve flow)
- [ ] TASK-4.4: Status Badge phiếu chi
- [ ] TASK-4.5: Warning UI COGS thiếu (phụ thuộc TASK-2.2)
- [ ] TASK-4.6: Form tạo Tax Snapshot
- [ ] TASK-4.7: Bảng biểu thuế NĐ 68/2026

### Giai đoạn 5 — Chất lượng & Nice-to-have (~10h)
- [ ] TASK-5.1: DB CHECK balance ≥ 0
- [ ] TASK-5.2: Background TTL Cleanup IdempotencyStore
- [ ] TASK-5.3: Kiểm tra trạng thái ca trước Void
- [ ] TASK-5.4: Export PDF/Excel P&L
- [ ] TASK-5.5: Date Range Picker P&L
- [ ] TASK-5.6: Caching P&L Summary

---

## 📌 Phụ lục: Quy ước thực hiện

### Trước khi bắt đầu mỗi Task
1. Đọc file liên quan để hiểu code hiện tại (không đoán)
2. Xác nhận giả định và hỏi lại nếu có điểm không rõ
3. Viết/sửa code minimal — chỉ chạm đúng phạm vi task

### Sau khi hoàn thành mỗi Task
1. Chạy test: `dotnet test` (BE) hoặc `npm run test` (FE)
2. Chạy build: `tsc -b && vite build` (FE) hoặc `dotnet build` (BE)
3. Báo cáo kết quả test thực tế (không tuyên bố "xong" khi chưa chạy test)
4. Đánh dấu `[x]` trong checklist
5. Commit riêng theo chuẩn: `fix(auth): BCrypt password comparison in AuthService`

### Commit convention
```
feat(module): ngắn gọn mô tả tính năng mới
fix(module): mô tả lỗi đã fix
refactor(module): mô tả thay đổi không ảnh hưởng behavior
test(module): thêm/sửa test
docs(module): chỉ sửa tài liệu
```

---

*Kế hoạch tạo: 2026-10-31 | Tổng ước tính: ~32 giờ (G0+G1+G2+G3+G4 = 22h cốt lõi + G5 10h)*

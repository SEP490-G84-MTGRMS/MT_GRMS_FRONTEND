# 📊 BÁO CÁO CHI TIẾT — TIẾN ĐỘ 5 MODULE TÀI CHÍNH
**Dự án:** MT-GRMS — Multi-tenant Retail Chain Management System  
**Ngày:** 2026-10-31  
**Nhánh BE:** `feature/refactor-tax-finance-backend`  
**Nhánh FE:** `feature/FE19-tax-finance-polish`  
**Phạm vi:** Sổ quỹ · Phiếu chi · Lãi/Lỗ · Thuế · Công nợ khách hàng

---

## 🗺️ Tổng quan nhanh (Dashboard)

| # | Module | BE % | FE % | Tổng | Trạng thái |
|---|--------|------|------|------|-----------|
| 1 | Sổ quỹ & Két tiền (Cashbook) | 85% | 65% | **75%** | 🟡 Thiếu RBAC + mock fallback |
| 2 | Phiếu chi vận hành (Expenses) | 90% | 80% | **85%** | 🟡 Thiếu RBAC approve/disburse |
| 3 | Báo cáo Lãi/Lỗ (P&L) | 88% | 85% | **87%** | 🟡 Bug COGS null → lãi ảo |
| 4 | Kê khai thuế HKD (Tax/HMAC) | 80% | 60% | **70%** | 🔴 Mock flag + HMAC key cứng |
| 5 | Công nợ khách hàng (Debt) | 90% | 0% | **45%** | 🔴 FE dùng localStorage, BE bị cô lập |

> [!IMPORTANT]
> **P0 toàn hệ thống:** `AuthService.cs` so sánh mật khẩu plain-text (`user.Password != request.Password`). Phải fix trước khi bất kỳ module nào có thể coi là "hoàn thiện" về bảo mật.

---

## 1. 🏦 Sổ quỹ & Két tiền (Cashbook)

### 1.1 Backend — 85%

**Route prefix:** `api/cashbook` (BaseApiController, không có `/v1`)  
**Controller:** `CashbookController.cs`  
**Test:** `CashbookServiceTests.cs` (unit) · `CashbookDatabaseIntegrationTests.cs` (integration)

#### ✅ Đã hoàn thiện
| Endpoint | Mô tả | Ghi chú |
|----------|--------|---------|
| `POST /shifts/open` | Mở ca thu ngân | Idempotency key |
| `POST /shifts/close` | Đóng ca, kiểm đếm cuối ca | Idempotency key |
| `POST /cash-drop` | Nộp tiền vào két trong ca | Idempotency key |
| `POST /deposits/bank` | Tạo lệnh gửi ngân hàng | |
| `POST /deposits/confirm` | Xác nhận tiền đã vào bank | |
| `GET  /entries` | Lịch sử giao dịch sổ quỹ (phân trang) | |
| `POST /tills/init` | Khởi tạo két thu ngân mới | |
| `GET  /accounts` | Danh sách tài khoản quỹ | |
| `GET  /summary` | Tổng hợp số dư, thu chi theo kỳ | |
| `POST /receipts` | Tạo phiếu thu | |
| `POST /payments` | Tạo phiếu chi quỹ | |
| `POST /transfers` | Chuyển tiền giữa két | Idempotency key |
| `POST /reconcile` | Đối soát quỹ cuối ngày | |
| `DELETE /entries/{id}/void` | Hủy giao dịch (void) + ghi audit | HMAC audit trail |

**Idempotency:** Two-Phase Filter hoạt động đúng — request trùng Idempotency-Key trả 200 từ cache, không insert lại.

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| Không có `[Authorize]` | 🔴 P0 | Bất kỳ request ẩn danh nào cũng gọi được toàn bộ 14 endpoint |
| Không có DB CHECK balance ≥ 0 | 🟡 P1 | Service validate bằng code; nếu race condition xảy ra, số dư có thể âm |
| Không có Background TTL cleanup | 🟢 P2 | IdempotencyStore records cũ không được dọn — RAM rò rỉ dài hạn |
| `void` chưa kiểm tra trạng thái ca | 🟡 P1 | Có thể void giao dịch thuộc ca đã đóng, phá audit trail |

#### 🔗 Cơ sở dữ liệu
- Migration `AddTaxAndFinanceModules` đã tạo bảng: `CashShifts`, `CashDrops`, `BankDeposits`, `CashbookEntries`, `IdempotencyRecords`
- Seed data: `DatabaseSeeder.SeedAsync` seed sample ca + entries — chạy tự động khi khởi động

---

### 1.2 Frontend — 65%

**File chính:** `cashbookService.ts`, `cashbookApi.ts`  
**HTTP Client:** `financeHttpClient` (baseURL: `/api`) → **khớp** với backend `api/cashbook`

#### ✅ Đã hoàn thiện
- Live API calls: `getAccounts`, `getSummary`, `getEntries`, `openShift`, `closeShift`, `initTill`
- Dialog chuyển tiền (Till Transfer) gọi `POST /transfers`
- Cash-drop reconciliation gọi `POST /cash-drop`
- RFC 7807 error mapper (`problemDetailsMapper.ts`) hiển thị lỗi BE rõ ràng

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| `INITIAL_ACCOUNTS` mock array ~100 dòng trong service | 🟡 P1 | Nếu API fail, component render mock thay vì báo lỗi → user không biết BE đang lỗi |
| `INITIAL_TRANSACTIONS` mock fallback | 🟡 P1 | Tương tự — ẩn lỗi thực tế |
| Không có loading skeleton cho shift management | 🟢 P2 | UX xấu khi mạng chậm |
| Chưa có realtime update (WebSocket/polling) | 🟢 P2 | Nhiều thu ngân cùng ca không thấy cập nhật của nhau |

#### 📌 Quyết định cần user chốt
> **Mock fallback có nên giữ?**  
> Hiện tại: API lỗi → hiển thị mock (user nhìn thấy dữ liệu giả)  
> Đề xuất: API lỗi → hiển thị error toast + empty state  
> → Cần quyết định trước khi xóa `INITIAL_ACCOUNTS`

---

## 2. 📄 Phiếu chi vận hành (Service Expenses)

### 2.1 Backend — 90%

**Route prefix:** `api/expenses`  
**Controller:** `ExpensesController.cs`  
**Test:** `ExpenseServiceTests.cs`

#### ✅ Đã hoàn thiện
| Endpoint | Mô tả |
|----------|--------|
| `POST /` | Tạo phiếu chi mới |
| `POST /{id}/approve` | Duyệt phiếu |
| `POST /{id}/disburse` | Giải ngân / thanh toán |
| `GET  /summary` | Tổng hợp chi phí theo danh mục, kỳ |
| `GET  /{id}` | Chi tiết một phiếu |
| `GET  /` | Danh sách phiếu (phân trang, filter) |

- Solo-owner guard: chủ cửa hàng không thể tự duyệt phiếu của mình
- Suspicious note requirement: phiếu > ngưỡng threshold phải có ghi chú lý do
- Idempotency key trên POST create

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| `ApproveExpense` không có `[Authorize]` | 🔴 P0 | Nhân viên bán hàng có thể tự duyệt phiếu chi |
| `DisburseExpense` không có `[Authorize]` | 🔴 P0 | Tương tự — tài chính nghiêm trọng |
| Không validate amount > 0 ở controller level | 🟡 P1 | Service validate nhưng lỗi message không rõ |
| Không có soft-delete / cancel flow | 🟡 P1 | Một phiếu đã tạo không thể hủy, chỉ có thể "disburse" hoặc để treo |

#### Fix nhanh P0 — thêm vào `ExpensesController.cs`:
```csharp
[HttpPost("{id}/approve")]
[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER")]  // ← thêm dòng này
public async Task<IActionResult> ApproveExpense(...)

[HttpPost("{id}/disburse")]
[Authorize(Roles = "STORE_OWNER,BRANCH_MANAGER")]  // ← thêm dòng này
public async Task<IActionResult> DisburseExpense(...)
```

---

### 2.2 Frontend — 80%

**Files:** `expenseApi.ts`, `expenseService.ts`, `ExpenseList.tsx`, `ExpenseForm.tsx`  
**HTTP Client:** `financeHttpClient` → **khớp** `api/expenses`

#### ✅ Đã hoàn thiện
- GET list với filter (category, date range, status)
- GET summary với chart breakdown
- POST create với Idempotency-Key header
- POST pay (→ gọi `/expenses/{id}/disburse`)
- RFC 7807 error handling

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| Chưa có UI gọi `approve` endpoint | 🟡 P1 | Flow approve chỉ có thể làm qua Swagger/Postman |
| Form tạo phiếu không validate client-side amount | 🟢 P2 | Phụ thuộc hoàn toàn vào BE validation |
| Không hiển thị trạng thái phiếu (PENDING/APPROVED/DISBURSED) | 🟡 P1 | User không biết phiếu đang ở bước nào |

---

## 3. 📈 Báo cáo Lãi/Lỗ (P&L Reports)

### 3.1 Backend — 88%

**Route prefix:** `api/finance/reports/pnl`  
**Controller:** `PnLReportController.cs`  
**Test:** `PnLReportServiceTests.cs`

#### ✅ Đã hoàn thiện
| Endpoint | Mô tả |
|----------|--------|
| `GET /summary` | Tổng hợp doanh thu, chi phí, lợi nhuận theo kỳ |
| `GET /breakdown/expenses` | Phân tích chi tiết chi phí theo danh mục |
| `GET /comparison` | So sánh kỳ này vs kỳ trước |
| `GET /trend` | Xu hướng lợi nhuận theo tháng/tuần |

- Eliminate N+1: dùng `.Include()` + projection thay vì loop query
- Drilldown analytics: breakdown by product category, supplier, branch

#### ❌ Thiếu / Sai — BUG NGHIÊM TRỌNG
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| **`CostPrice == null` → treat as 0** | 🔴 P0 | COGS = 0 → Gross Profit = Revenue → **lợi nhuận bị thổi phồng** → thuế tính sai |
| Không cache P&L summary | 🟡 P1 | Query nặng, gọi nhiều lần → DB quá tải |
| Không có access control by branch | 🟡 P1 | Manager chi nhánh A có thể xem P&L chi nhánh B |

#### 🔍 Root Cause Bug COGS:
```csharp
// PnLReportService.cs — dòng gây lỗi (ví dụ)
var cogs = orderItem.CostPrice ?? 0;  // ← null → 0, không phải lỗi kỹ thuật nhưng sai nghiệp vụ
```
**Hậu quả:** Nếu sản phẩm chưa nhập giá vốn → lợi nhuận ảo → `HouseholdTaxService` tính thuế dựa trên lãi giả → báo cáo thuế sai.  
**Fix:** Khi `CostPrice == null`, đánh dấu sản phẩm là `INCOMPLETE_COST_DATA`, loại khỏi P&L summary hoặc hiển thị warning.

---

### 3.2 Frontend — 85%

**Files:** `reportsPnlService.ts`, `PnLDashboard.tsx`, `PnLChart.tsx`  
**HTTP Client:** `financeHttpClient` → **khớp** `api/finance/reports/pnl`

#### ✅ Đã hoàn thiện
- Dashboard summary với cards (Revenue, Cost, Profit, Margin %)
- Line chart theo trend
- Expense breakdown donut chart
- Period comparison (kỳ này vs kỳ trước)
- Drilldown metrics (click vào category để xem chi tiết)

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| Không hiển thị warning khi có COGS null | 🔴 P0 | User nhìn thấy lợi nhuận sai mà không biết |
| Export PDF/Excel chưa có | 🟡 P1 | Người dùng cần in báo cáo |
| Không có date range picker tùy chỉnh | 🟡 P1 | Chỉ có preset: tháng này, quý này, năm này |

---

## 4. 🧾 Kê khai thuế Hộ kinh doanh (Tax & HMAC)

### 4.1 Backend — 80%

**Route prefix:** `api/tax/household`  
**Controller:** `HouseholdTaxController.cs`  
**Test:** `HouseholdTaxServiceTests.cs` · `TaxSnapshotSignatureTests.cs` · `HouseholdTaxDatabaseIntegrationTests.cs`

#### ✅ Đã hoàn thiện
| Endpoint | Mô tả |
|----------|--------|
| `GET /summary` | Tổng hợp nghĩa vụ thuế (NĐ 68/2026, NĐ 141) |
| `GET /books` | Sổ thuế theo kỳ kê khai |
| `POST /snapshots` | Tạo snapshot và ký HMAC-SHA256 |
| `GET /snapshots` | Danh sách snapshot đã ký |
| `GET /snapshots/{id}` | Chi tiết snapshot |
| `POST /snapshots/{id}/verify-integrity` | Xác minh chữ ký HMAC còn nguyên vẹn |

- Key rotation logic: khi key cũ hết hạn, tự động dùng key mới nhưng vẫn verify được snapshot cũ bằng key cũ
- Compliance: áp dụng đúng biểu thuế NĐ 68/2026 (lũy tiến theo doanh thu)

#### ❌ Thiếu / Sai — VẤN ĐỀ BẢO MẬT
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| **HMAC key hardcoded trong source** | 🔴 P0 | `_keyStore` trong C# chứa key thật → ai đọc code là biết key → có thể làm giả snapshot |
| `CreateSnapshot` fallback user cứng | 🔴 P0 | Khi không có JWT, dùng `"user-owner-001"` / `"store_owner"` → snapshot giả danh |
| Không có `[Authorize]` trên controller | 🔴 P0 | Bất kỳ ai cũng tạo/xem snapshot thuế |
| Chưa có submit to tax authority API | 🟡 P1 | Hiện chỉ lưu internal — chưa tích hợp eTax/VNPT |

#### Fix bắt buộc — HMAC key:
```csharp
// appsettings.json (KHÔNG commit lên git)
"TaxHmac": {
  "CurrentKey": "",  // ← fill from ENV
  "PreviousKey": ""  // ← fill from ENV
}

// Trong code
var key = _configuration["TaxHmac:CurrentKey"]
  ?? throw new InvalidOperationException("HMAC key not configured");
```

---

### 4.2 Frontend — 60%

**Files:** `taxSnapshotApi.ts`, `taxService.ts`, `TaxDashboard.tsx`  
**HTTP Client:** `financeHttpClient` → **khớp** `api/tax/household`

#### ✅ Đã hoàn thiện
- Xem danh sách snapshot đã ký
- Verify integrity của snapshot
- Hiển thị tổng hợp nghĩa vụ thuế

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| **`isMockEnabled()` trong `taxSnapshotApi.ts`** | 🔴 P0 | Nếu `VITE_USE_MOCK_DATA=true`, **toàn bộ tax API trả mock** kể cả khi BE đang chạy — môi trường dev sẽ test dữ liệu giả |
| Form tạo snapshot chưa có | 🟡 P1 | Chỉ xem, không tạo được từ UI |
| Không validate HMAC key trước khi submit | 🟡 P1 | User có thể tạo snapshot với key rỗng |
| Biểu thuế NĐ 68/2026 không hiển thị rõ | 🟡 P1 | User không biết đang áp thuế suất nào |

#### 📌 Quyết định cần user chốt
> **`VITE_USE_MOCK_DATA` flag có còn cần thiết không?**  
> Nếu Neon DB luôn kết nối được (test env), nên xóa hẳn mock flag để tránh nhầm lẫn.  
> Nếu cần offline mode thì phải có mechanism rõ ràng hơn (service worker, explicit toggle trong UI).

---

## 5. 💳 Công nợ khách hàng (Customer Debt)

### 5.1 Backend — 90%

**Route prefix:** `api/customers/debt`  
**Controller:** `CustomerDebtController.cs`  
**Test:** `CustomerDebtServiceTests.cs` · `CustomerDebtFifoTests.cs` · `CustomerDebtDatabaseIntegrationTests.cs`

#### ✅ Đã hoàn thiện
| Endpoint | Mô tả |
|----------|--------|
| `POST /record-sale-debt` | Ghi nhận nợ khi bán hàng chịu |
| `POST /repay` | Ghi nhận khách trả nợ |
| `POST /goods-return-offset` | Bù trừ công nợ bằng hàng trả lại |
| `POST /adjust` | Điều chỉnh thủ công (lý do + audit) |
| `POST /write-off` | Xóa nợ khó đòi |
| `GET  /profile/{customerId}` | Hồ sơ công nợ tổng hợp |
| `GET  /ledger/{customerId}` | Sổ chi tiết công nợ (phân trang) |

- FIFO payment allocation: tiền trả trước xóa nợ cũ nhất trước (`CustomerDebtFifoTests.cs` verify)
- Write-off ghi audit trail + reason requirement

#### ❌ Thiếu / Sai
| Vấn đề | Mức độ | Chi tiết |
|--------|--------|---------|
| Không có `[Authorize]` | 🔴 P0 | Bất kỳ ai cũng ghi/xóa công nợ |
| Không có cross-tenant isolation | 🔴 P0 | Tenant A có thể đọc công nợ khách hàng Tenant B nếu biết customerId |
| FIFO chưa cover partial payment edge case | 🟡 P1 | Nếu trả một phần tiền = đúng một hóa đơn, test pass; nhưng trả lẻ qua nhiều hóa đơn chưa test đủ |

---

### 5.2 Frontend — **0% (Critical)**

**File hiện tại:** `customerApi.ts` (trong `customer-crm` feature)

#### 🔴 Vấn đề cốt lõi
```typescript
// customerApi.ts — toàn bộ file dùng localStorage
const STORAGE_KEY = 'mt_grms_customers';

export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateCustomerDebt = (id: string, amount: number): void => {
  // chỉ update localStorage, KHÔNG gọi API
};
```

**Hậu quả:**
1. Công nợ lưu trong localStorage → **mất khi clear browser / đổi thiết bị**
2. Nhiều tab/thiết bị → dữ liệu không đồng bộ
3. `CustomerDebtController` với 7 endpoint được test đầy đủ nhưng **không có FE nào gọi vào**
4. Báo cáo công nợ sẽ luôn sai vì dữ liệu không từ DB

#### Kế hoạch kết nối (cần làm trước tất cả)
```typescript
// customerDebtApi.ts — cần tạo mới
import { financeHttpClient } from '@/lib/financeHttpClient';

export const recordSaleDebt = (payload: RecordSaleDebtRequest) =>
  financeHttpClient.post('/customers/debt/record-sale-debt', payload);

export const repayDebt = (payload: RepayRequest) =>
  financeHttpClient.post('/customers/debt/repay', payload);

export const getCustomerDebtProfile = (customerId: string) =>
  financeHttpClient.get(`/customers/debt/profile/${customerId}`);

export const getCustomerDebtLedger = (customerId: string, params: PaginationParams) =>
  financeHttpClient.get(`/customers/debt/ledger/${customerId}`, { params });
```

> [!CAUTION]
> **Không xóa `customerApi.ts` cũ trước khi migrate xong** — module CRM dùng nhiều hàm khác (tìm kiếm khách, lịch sử mua) không liên quan đến debt API. Chỉ tách phần debt sang file mới.

---

## 6. 🔐 Vấn đề bảo mật chung (ảnh hưởng toàn bộ module tài chính)

### 6.1 Plain-text Password — P0 toàn hệ thống
```csharp
// AuthService.cs — BUG NGHIÊM TRỌNG
if (user.Password != request.Password)  // ← plain-text compare!
    throw new UnauthorizedException("Invalid credentials");
```
**Hậu quả:** Database bị dump → toàn bộ mật khẩu lộ. Tất cả auth token đang dùng đều không đáng tin.

**Fix:**
```csharp
if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
    throw new UnauthorizedException("Invalid credentials");
```

### 6.2 Auth Fallback to Mock User — P0
```typescript
// authService.ts
} catch (error) {
  // TODO: remove in production
  return MOCK_USER;  // ← auth fail → vẫn đăng nhập được với mock user!
}
```

### 6.3 Backend luôn trả role = "ADMIN"
```csharp
// AuthService.cs
Role = "ADMIN"  // hardcoded, không đọc từ TenantUser.Role
```
→ Mọi `[Authorize(Roles = "...")]` sẽ không hoạt động đúng vì tất cả user đều là ADMIN.

---

## 7. 📋 Ma trận ưu tiên — Việc cần làm

### 🔴 P0 — Phải làm trước (block production)
| # | Việc | Module ảnh hưởng | Thời gian ước tính |
|---|------|-----------------|-------------------|
| 1 | BCrypt passwords trong `AuthService.cs` | Tất cả | 1h |
| 2 | Trả đúng `Role` từ `TenantUser.Role` | Tất cả | 30 phút |
| 3 | Xóa mock fallback trong `authService.ts` | Tất cả | 15 phút |
| 4 | `[Authorize]` cho `ApproveExpense`, `DisburseExpense` | Expenses | 30 phút |
| 5 | `[Authorize]` cho `CustomerDebtController` | Customer Debt | 30 phút |
| 6 | `[Authorize]` cho `CashbookController` (void, transfers) | Cashbook | 30 phút |
| 7 | HMAC key ra ENV variable | Tax | 1h |
| 8 | Fix COGS null bug trong P&L | P&L → Tax | 2h |

### 🟡 P1 — Quan trọng (nên làm trước go-live)
| # | Việc | Module | Thời gian ước tính |
|---|------|--------|-------------------|
| 9 | Kết nối `customerDebtApi.ts` → `CustomerDebtController` | Customer Debt | 4h |
| 10 | Xóa/cô lập mock fallback trong `cashbookService.ts` | Cashbook | 2h |
| 11 | UI duyệt phiếu chi (approve flow) | Expenses | 3h |
| 12 | Hiển thị trạng thái phiếu chi | Expenses | 1h |
| 13 | Cross-tenant isolation cho CustomerDebt | Customer Debt | 3h |
| 14 | Xóa/tắt `isMockEnabled()` trong tax API | Tax | 30 phút |
| 15 | Warning UI khi P&L có sản phẩm thiếu COGS | P&L | 1h |

### 🟢 P2 — Nice to have
| # | Việc | Module |
|---|------|--------|
| 16 | Export PDF/Excel báo cáo P&L | P&L |
| 17 | Date range picker tùy chỉnh | P&L |
| 18 | Realtime update cashbook (polling/WebSocket) | Cashbook |
| 19 | Background TTL cleanup IdempotencyStore | Cashbook |
| 20 | Submit to eTax/VNPT API | Tax |

---

## 8. 📊 Cơ sở tính % hoàn thành

| Tiêu chí | Trọng số | Cách tính |
|----------|----------|-----------|
| Backend endpoints implemented | 30% | Số endpoint hoạt động / tổng endpoint cần có |
| Frontend kết nối thực (không mock) | 25% | Số API call thực / tổng API call cần có |
| Test coverage (unit + integration) | 20% | Tests pass / tests cần có |
| Security & RBAC | 15% | Số endpoint có Authorize / tổng endpoint nhạy cảm |
| UX completeness | 10% | Số flow user hoàn chỉnh / tổng flow cần có |

**Ví dụ Customer Debt:**
- BE endpoints: 7/7 = 100% × 30% = **30 điểm**
- FE connected: 0/7 = 0% × 25% = **0 điểm**
- Tests: pass × 20% = **18 điểm**
- Security: 0/7 auth × 15% = **0 điểm**
- UX: 0 flow hoàn chỉnh × 10% = **0 điểm**
- **Tổng: ~48% → làm tròn 45%** (có penalty vì FE = 0)

---

*Báo cáo tạo: 2026-10-31 | Đây là test environment — Neon DB được dùng trực tiếp*

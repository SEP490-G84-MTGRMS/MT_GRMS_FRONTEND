# Tổng hợp logic nghiệp vụ — Quản lý tồn kho & Kiểm kê (MT-GRMS)

> **Ngày cập nhật:** 2026-11-15  
> **Phạm vi:** đúng code hiện tại (Backend + Frontend), không OpenSpec/SEP.  
> **Nguồn sự thật tồn:** bảng `BranchStocks` (chi nhánh × sản phẩm × lô).

---

## 1. Bản đồ màn hình & vai trò

| Màn (Store Owner) | Employee | Mục đích |
|---|---|---|
| `/store-owner/inventory` | (lookup / quyền hạn chế) | Tồn tổng hợp theo SKU × chi nhánh |
| `/store-owner/batches` | `/employee/batches` | Sổ lô FEFO, HSD, nhảy sang KK / trả NCC |
| `/store-owner/batches/:batchId/packages` | — | Quản lý khay (repack) của một lô cân kg |
| `/store-owner/goods-receipts*` | `/employee/goods-receipts*` | Nhập kho từ PO → tăng tồn |
| `/store-owner/stocktakes` | `/employee/stocktakes` | Danh sách phiếu kiểm kê |
| `/store-owner/stocktakes/create` · `.../:id/edit` | tương đương employee | Lập / sửa phiếu đếm |
| `/store-owner/stocktakes/:id` | tương đương (không duyệt) | Chi tiết; Owner duyệt / trả NCC |
| `/store-owner/supplier-returns*` | — | Trả / đổi NCC sau kiểm kê hoặc từ Batches cận hạn |
| `/store-owner/products` | — | Master SP (giá RAW / PROCESSED, AllowRepack, ĐVT) |

| Vai trò | Tồn / lô | Lập KK | Duyệt KK | Điều chỉnh tồn |
|---|---|---|---|---|
| **Employee / Staff** | Chỉ CN được gán | Có (CN từ token) | Không | Không |
| **Store Owner / Admin** | Nhiều CN | Có (chọn CN) | Có | Chỉ khi **duyệt** KK (hoặc GRN / POS / chuyển kho / trả NCC / repack) |

---

## 2. Mô hình dữ liệu tồn kho

### 2.1. `BranchStock` (một dòng = một lô tại một CN)

| Trường | Ý nghĩa |
|---|---|
| `BranchId`, `ProductId` | Chi nhánh × sản phẩm |
| `BatchCode`, `ManufactureDate`, `ExpiryDate` | Định danh lô FEFO (SP không quản lô: gom theo CN×SP) |
| `QuantityOnHand` | Tồn vật lý trên sổ — **đơn vị gốc (base / stock unit)** |
| `QuantityReserved` | Giữ chỗ (VD chờ trả NCC) |
| `QuantityQuarantined` | Cách ly (lịch sử; **KK hiện tại không quarantine lúc gửi duyệt**) |
| `LandedCostPerUnit` | Giá vốn / đơn vị tồn |
| `ShelfLocation`, `ZoneArea` | Vị trí kệ / khu |
| `SupplierId` | NCC gắn lô (nếu có) |
| `RowVersion` | Optimistic concurrency |

**Khả dụng bán (RULE-01):**

```text
Available = max(0, OnHand − Reserved − Quarantined)
```

- Lô **hết hạn** (`ExpiryDate < hôm nay`): coi như không bán được (available = 0 trên luồng FEFO).
- SP **cân kg + có khay**: `RawSellableKg = Available − tổng kg khay ACTIVE` (bất biến `QOH ≥ ActivePackageWeight`).

### 2.2. Đơn vị tính

| Khái niệm | Ghi chú |
|---|---|
| **Đơn vị tồn (base)** | `Product.BaseUnit` — mọi `QuantityOnHand` lưu theo đơn vị này |
| **Đơn vị nhập** | DeliveryUoM → IsPurchaseUnit → BaseUnit; UI Batches/KK có thể hiện ĐVT nhập |
| **Tỷ lệ** | `purchaseToStockRate`: 1 ĐVT nhập = N đơn vị tồn |

→ Cột “Tồn hệ thống” trên KK = `QuantityOnHand` (**không** nhân rate). Nếu cột ĐVT hiện “Thùng” trong khi số là chai/cái thì dễ hiểu nhầm.

### 2.3. Entity liên quan (không thay thế BranchStock)

| Entity | Vai trò |
|---|---|
| `Package` | Khay bán sẵn gắn 1 `BranchStockId` (kg net, giá chốt, trạng thái AVAILABLE/SOLD…) |
| `RepackOrder` | Đợt chế biến / chia khay từ nguyên quả |
| `Stocktake` / `StocktakeLine` | Phiếu KK; mỗi dòng gắn tối đa 1 `BranchStockId` |
| `GoodsReceipt` / lines | Nhập kho → tạo/cộng `BranchStock` |
| `SupplierReturn` | Trả NCC; có thể nguồn từ KK |

---

## 3. Chuỗi làm tồn thay đổi (end-to-end)

```text
PO chốt → GRN hoàn tất          →  OnHand ↑ (base)
POS bán (FEFO)                  →  OnHand ↓ đúng lô
Chuyển kho                      →  OnHand CN nguồn ↓ / CN đích ↑
Repack (tạo khay / waste)       →  OnHand ↓ (waste + đóng khay); Package ↑
Bàn giao trả NCC                →  OnHand ↓
Kiểm kê Owner DUYỆT             →  OnHand ± đúng BranchStockId từng dòng
────────────────────────────────────────────────────────────
Lưu nháp KK / Gửi duyệt KK      →  OnHand KHÔNG đổi
```

---

## 4. Nhập kho (GRN) → tồn

1. Lập phiếu từ PO (`/goods-receipts/create?po=...`).
2. Nhập SL thực nhận / thiếu / lý do; quản lý batch (mã lô, NSX, HSD) khi SP `HasBatches`.
3. **Hoàn tất nhập kho** → BE cộng `QuantityOnHand` theo **đơn vị tồn** (`SL nhập × rate`), gắn `BatchCode` / HSD / `LandedCostPerUnit`, trace GRN.

Không hoàn tất GRN = chưa có tồn để kiểm kê / bán.

---

## 5. Sổ lô FEFO (`/batches`)

### 5.1. Hiển thị

- SP `HasBatches = true`: mỗi lô một dòng (có thể merge cùng mã lô + HSD).
- SP không quản lô: gom một dòng / CN × SP.
- Badge HSD: Expired (≤0 ngày) · Critical (1–3) · Warning (4–30) · Normal (>30).
- SP cân kg: có thể hiện **Tồn nguyên quả bán được** (`rawSellable`) + phụ đề số khay; QOH vẫn gồm kg đã đóng khay.

### 5.2. Thao tác nghiệp vụ

| Thao tác | Kết quả |
|---|---|
| Icon kiểm kê trên 1 lô | Mở `/stocktakes/create` + `preselectedBatches` (prefill lô đó) |
| **Cận hạn** | Popup Warning+Critical → tạo phiếu trả/đổi NCC **nháp** (tách theo GRN) nếu policy cho phép |
| **Hết hạn** | Popup Expired → tạo phiếu KK prefill lô (write-off khi Owner duyệt) |
| **Kiểm kê hàng hóa** | Vào create phiếu trống |
| Quản lý khay | `/batches/:batchId/packages` — tạo khay, in tem PDF, trạng thái bán |

**Cố ý chưa có trên Batches:** xuất hủy FE-06 riêng, markdown POS tự áp từ UI lô, sửa tồn tay.

---

## 6. Tồn kho tổng hợp (`/inventory`)

- Góc nhìn **SKU × chi nhánh**: OnHand, committed (reserved+quarantined), available, on order, số lô, giá trị.
- Cột đơn vị: **DVN** (đơn vị nhập) thống nhất với Batches.
- Không highlight SKU đặc biệt; không phải màn đếm kiểm kê.

---

## 7. Kiểm kê hàng hóa (FE-04) — logic hiện tại

### 7.1. Trạng thái phiếu

| Status | Ý nghĩa | Ai làm tiếp |
|---|---|---|
| `DRAFT` | Bản nháp | NV/Owner sửa, gửi duyệt |
| `PENDING_APPROVAL` | Chờ Owner | Owner duyệt / kể lại / từ chối |
| `APPROVED` | Đã chốt tồn | Owner có thể tạo trả NCC (dòng đủ điều kiện) |
| `NEEDS_RECOUNT` | Yêu cầu đếm lại | Sửa số liệu, gửi lại |
| `REJECTED` | Từ chối | Không sửa; lập phiếu mới nếu cần |

### 7.2. Lập phiếu (`/stocktakes/create`)

**Layout** giống GRN create: header thông tin phiếu + bảng đếm + footer ghi chú / Lưu nháp / Gửi duyệt.

**Header (chỉ đọc / Owner chọn CN):**

- Chi nhánh (Employee: khóa theo tài khoản; Owner: chọn CN)
- Mã phiếu (tự sinh khi lưu)
- Người lập, Ngày lập, Trạng thái

**Thêm sản phẩm (không dump cả kho):**

1. Tìm SKU / tên (Enter / Thêm nhanh) **hoặc** modal “Tìm sản phẩm & thêm”.
2. Chọn theo **sản phẩm** → hệ thống tải **toàn bộ lô đang có `QuantityOnHand > 0`** của SP tại CN đó.
3. Mỗi lô = **một dòng** `StocktakeLine` gắn `BranchStockId`.
4. Prefill từ Batches (`preselectedBatches`) vẫn được.

**Bảng đếm (theo lô):**

| Cột | Nguồn |
|---|---|
| SKU, Tên SP, **Mã lô**, ĐVT nhập, Vị trí kệ | Snapshot từ batch |
| Tồn hệ thống | `BranchStock.QuantityOnHand` lúc thêm |
| Số lượng thực tế | User |
| Số lượng hết hạn | User — **phần nằm trong** thực tế |
| Số lượng hư hỏng | User — **phần nằm trong** thực tế → map `damagedQty` |
| Chênh lệch | `Thực tế − Tồn HT` (từng lô) |
| Ảnh minh chứng | Bắt buộc nếu hết hạn hoặc hư hỏng > 0 (upload Cloudinary) |
| Thao tác | Xóa dòng lô khỏi phiếu |

Nhóm theo sản phẩm: dòng tổng **Tồn HT / Thực tế / Chênh lệch** cấp SP (chỉ hiển thị).

**Công thức số lượng:**

```text
goodQty     = actual − expired − damaged   (≥ 0)
actual      = good + expired + damaged     (defectiveQty = 0 trên form hiện tại)
expired + damaged ≤ actual
varianceQty = actual − systemQty
```

### 7.3. Lưu nháp / Gửi duyệt

| Hành động | Status | `BranchStock` |
|---|---|---|
| Lưu nháp | `DRAFT` | **Không đổi** |
| Gửi duyệt (hoặc lưu + autoSubmit) | `PENDING_APPROVAL` | **Không đổi** (đã bỏ quarantine lúc submit) |

Employee: BE **ép** `BranchId` từ token; không tin BranchId FE.  
Update dòng: match theo `StocktakeLine.Id` hoặc `BranchStockId` — **không** fallback `ProductId` (tránh ghi đè nhầm khi 1 SP nhiều lô).

### 7.4. Owner duyệt (`/stocktakes/:id`)

Modal duyệt hiện **chênh lệch từng lô** (SKU · mã lô · HT → TT · variance).

Nếu có dòng `varianceQty > 0`: bắt buộc tick **xác minh nguồn hàng thừa** (`ConfirmSurplusFound`) — không tick → `SURPLUS_CONFIRM_REQUIRED`.

**Khi APPROVE — với từng dòng có `BranchStockId`:**

| Thành phần | Hiệu ứng trên đúng lô đó |
|---|---|
| `DamagedQty + ExpiredQty` | Write-off: `OnHand -= writeOff` |
| `VarianceQty < 0` | Thiếu: `OnHand -= |variance|` |
| `VarianceQty > 0` + đã confirm | Thừa: `OnHand += variance` |
| Lô khác cùng SP | **Không** đụng — không FEFO phân bổ lệch |

Từ chối / Yêu cầu kiểm kê lại: đổi status phiếu; **không** đổi OnHand.

### 7.5. Sau duyệt — trả NCC

- Owner tạo yêu cầu trả từ dòng còn `returnable` (lỗi NCC / cận hạn RETURN — nếu còn trên dữ liệu cũ).
- Form KK mới đang gom “hư hỏng” vào `damagedQty` (write-off tại CH); luồng trả NCC lỗi NCC vẫn hỗ trợ trên chi tiết nếu dòng có `defectiveQty`.

---

## 8. Phân quyền kiểm kê (BE)

| API | Employee | Owner |
|---|---|---|
| List | Chỉ phiếu CN mình | Lọc theo CN tùy chọn |
| Get / Update / Submit | Chỉ phiếu CN mình; sửa khi DRAFT / NEEDS_RECOUNT | Theo tenant |
| Create | BranchId = token; scope thực tế theo `branchStockIds` gửi lên | BranchId từ body (chọn trên UI) |
| Review | **Cấm** | APPROVE / REJECT / NEEDS_RECOUNT |
| Create-return từ KK | **Cấm** | Chỉ khi phiếu APPROVED |

---

## 9. SP cân kg & khay (tóm tắt liên quan tồn)

| Bước | Tồn |
|---|---|
| Tạo khay từ nguyên quả | Trừ waste (+ kg vào Package); QOH vẫn “giữ” kg khay ACTIVE trong bất biến |
| Hiển thị Batches | Ưu tiên `rawSellable` cho cột Tồn bán nguyên quả |
| Bán khay POS | Package → SOLD; trừ QOH đúng trọng lượng khay |
| Kiểm kê | Vẫn theo `BranchStock` / lô; chưa tách dòng “khay” riêng trên form KK (xem plan weight/repack nếu mở rộng) |

Giá: RAW (`SellingPrice`) vs PROCESSED (`ProcessedSellingPricePerKg`) khi `AllowRepack`; giá khay = `Round100(NetWeight × ProcessedPerKg)` do BE tính.

---

## 10. Việc cố ý chưa có / ngoài phạm vi KK

| Hạng mục | Ghi chú |
|---|---|
| Phiếu xuất hủy FE-06 | Chưa có API; đường sống = KK duyệt write-off |
| Markdown lô → POS auto | UI Batches đã ẩn stub |
| Khóa POS khi đang KK | Chưa |
| Quarantine lúc gửi duyệt KK | **Đã bỏ** (2026-11-15) |
| Dump toàn bộ tồn lên phiếu create | Không — chỉ thêm SP → expand lô |
| Sổ thẻ kho (stock movement) UI | Chưa |
| Tồn = 0 vào phiếu KK | Không (lọc QOH > 0) |

---

## 11. Sơ đồ trạng thái phiếu kiểm kê

```text
                    ┌──────────────┐
         tạo/lưu    │    DRAFT     │←──────────────┐
                    └──────┬───────┘               │
                           │ gửi duyệt             │ Owner: NEEDS_RECOUNT
                           ▼                       │
                    ┌──────────────────┐           │
                    │ PENDING_APPROVAL │───────────┤
                    └─────┬──────┬─────┘           │
              duyệt OK    │      │ từ chối         │
                          ▼      ▼                 │
                 ┌──────────┐  ┌──────────┐        │
                 │ APPROVED │  │ REJECTED │        │
                 └────┬─────┘  └──────────┘        │
                      │                            │
                      │ (tuỳ chọn) tạo trả NCC     │
                      ▼                            │
              SupplierReturn                       │
                                                   │
                    ┌─────────────────┐            │
                    │ NEEDS_RECOUNT   │────────────┘
                    └─────────────────┘  (sửa → gửi lại)
```

---

## 12. Checklist UAT nhanh

1. GRN hoàn tất → Batches / Inventory thấy tồn base đúng CN.
2. `/stocktakes/create` → phiếu trống → tìm 1 SP nhiều lô → đủ dòng lô; có mã lô + tổng SP.
3. Nhập thực tế / hết hạn / hư hỏng (hết hạn+hỏng ≤ thực tế); upload ảnh khi cần → Lưu nháp → tồn Batches **không** đổi.
4. Gửi duyệt → status Chờ duyệt → tồn **vẫn không** đổi.
5. Owner mở chi tiết → thấy lệch từng lô → Duyệt (tick thừa nếu có) → chỉ đúng `BranchStock` đó đổi OnHand.
6. Employee không duyệt được; không xem/sửa phiếu CN khác.

---

## 13. File / module tham chiếu code

| Tầng | Đường dẫn chính |
|---|---|
| Entity | `MT_GRMS.Domain/Entities/Inventory/BranchStock.cs`, `Stocktake.cs`, `Package.cs` |
| Availability | `MT_GRMS.Application/Inventory/BranchStockAvailability.cs` |
| KK service | `MT_GRMS.Application/Stocktakes/StocktakeService.cs` |
| GRN → tồn | `MT_GRMS.Application/GoodsReceipts/GoodsReceiptService.cs` |
| Batches FE | `MT_GRMS_FRONTEND/src/features/batch/` |
| KK FE | `MT_GRMS_FRONTEND/src/features/stocktake/` |
| Test KK theo lô | `MT_GRMS.UnitTests/StocktakeLotAdjustmentTests.cs` |
| Plan refactor KK lô | `docs/plan-stocktake-lot-level-refactor.md` |
| Plan giá RAW/PROCESSED | `docs/plan-dual-selling-price-raw-vs-processed.md` |

---

*Tài liệu này thay thế góc nhìn lỗi thời trong `quan-ly-ton-kho-va-kiem-ke-as-is.md` về phần gửi duyệt (quarantine) và cách thêm SP trên form create. Khi nghiệp vụ đổi, cập nhật file này cùng PR.*

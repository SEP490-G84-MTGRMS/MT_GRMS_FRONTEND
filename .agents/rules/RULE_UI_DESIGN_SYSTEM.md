# RULE: QUY CHUẨN THIẾT KẾ GIAO DIỆN ENTERPRISE BACK-OFFICE & DATA TABLE (CHUẨN MT-GRMS)

> **Mã quy tắc**: `RULE-UI-DESIGN-SYSTEM`  
> **Phạm vi áp dụng**: Toàn bộ dự án MT-GRMS (bao gồm toàn bộ mã nguồn Frontend React 19 SPA tại `MT_GRMS_FRONTEND/`).  
> **Màn hình chuẩn mẫu (Gold Standard Reference)**:  
> `http://localhost:5173/store-owner/purchase-orders/branches` (`BranchOrderListPage.tsx` & `BranchOrderTable.tsx`).  
> **Mục tiêu**: Chuẩn hóa toàn bộ màn hình danh sách, bảng biểu, bộ lọc và phân trang quản trị theo phong cách Enterprise compact (chuẩn mực Nhật Bản & SaaS bán lẻ hiện đại); đảm bảo khi sinh (generate) bất kỳ màn hình nào mới cũng đạt chuẩn 100%, không cần phải refactor thủ công nhiều lần.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Lấy Màn Hình Danh Sách Chi Nhánh (`/branches`) Làm Chuẩn Mực Tuyệt Đối**:
   - Mọi trang danh sách quản trị (Sản phẩm, Đơn đặt hàng, Nhà cung cấp, Chi nhánh, Tồn kho, Thu chi, Khách hàng...) **BẮT BUỘC** triển khai cấu trúc, kích thước, thanh công cụ lọc, bảng dữ liệu và phân trang tương đồng 100% với màn hình mẫu.
2. **Quy Chuẩn Chữ Hoa / Thường: BẮT BUỘC Sentence Case**:
   - Toàn bộ tiêu đề trang, tiêu đề cột bảng, nhãn trường, nút bấm **chỉ viết hoa chữ cái đầu tiên** (Sentence case).
   - ✅ Đúng: `Đặt hàng theo chi nhánh`, `Mã chi nhánh`, `Tên chi nhánh`, `Tồn kho thực tế`, `SL đặt hàng`, `Trạng thái`, `Cập nhật gần nhất`, `Thao tác`.
   - ❌ Sai: `Đặt Hàng Theo Chi Nhánh`, `Mã Chi Nhánh`, `Tồn Kho Thực Tế`, `Thao Tác` (Cấm viết hoa mọi chữ cái đầu kiểu Title Case trong giao diện quản trị).
3. **Cơ Chế Bộ Lọc: Tách Rời Draft State & Applied State**:
   - Khi người dùng gõ từ khóa, chọn dropdown hoặc chọn ngày, bảng **KHÔNG ĐƯỢC** tự động lọc real-time giật cục.
   - **Chỉ kích hoạt lọc khi người dùng bấm nút "Tìm kiếm"** (hoặc nhấn phím `Enter` trên ô nhập liệu).
   - Nút **"Đặt lại"** khôi phục toàn bộ các ô nhập liệu và bảng dữ liệu về mặc định ban đầu, đưa về trang 1.
4. **Kiến Trúc Bảng Đơn (Single Semantic Table) Với Sticky Header**:
   - Dùng **1 thẻ `<table>` duy nhất** bọc trong wrapper cuộn nội bộ có `overflow-x: auto; max-height: calc(100vh - 210px);`.
   - Header cố định bằng `thead th { position: sticky; top: 0; z-index: 5; }`.
   - **TUYỆT ĐỐI CẤM** tách rời thành 2 thẻ `<table>` (1 cho header, 1 cho body) vì sẽ gây lỗi lệch cột, giật thanh cuộn trên Windows/Chrome.
5. **Cột Thao Tác Cố Định Độ Rộng (No Action Overflow / No Clipping)**:
   - Cột `Thao tác` phải có độ rộng cố định tối thiểu **`200px - 210px`** trong `<colgroup>`, các nút có `white-space: nowrap; flex-shrink: 0`.
   - Tuyệt đối không để 2 nút thao tác bị ép xuống 2 dòng hoặc bị cắt mép ở cạnh phải màn hình.

---

## 2. Quy Chuẩn Chi Tiết Từng Khu Vực (UI Specifications)

### 2.1. Tiêu Đề Trang (Page Header)
- Bố cục flex nằm ngang (`display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;`).
- **Bên trái**:
  - Icon đại diện nghiệp vụ (`size={20-22}`, màu `var(--blue-primary, #0f766e)`).
  - Thẻ `<h1>`: Font size `20px`, font-weight `800`, màu `var(--text-main)`, chữ chuẩn **Sentence case**.
  - **Không chèn thêm subtitle/mô tả dài** chiếm dụng không gian nếu không có yêu cầu đặc thù.
- **Bên phải**:
  - Nút hành động nhanh phụ trợ (ví dụ: `<button className="po-btn po-btn-outline"><History size={14}/><span>Lịch sử đơn hàng</span></button>` hoặc nút Thêm mới).

---

### 2.2. Thanh Công Cụ Lọc (Unified Filter Bar - `.po-unified-bar`)
- Chiều cao cố định compact: `height: 48px`, nền trắng `#ffffff`, bo góc mềm `8-10px`, đổ bóng mỏng `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);`.
- `display: flex; align-items: center; gap: 6px; padding: 0 10px; width: 100%; box-sizing: border-box;`.
- **Cấu trúc thành phần**:
  1. **Ô tìm kiếm từ khóa (Search Box)**:
     - Độ rộng compact cố định: `width: 175px; flex: 0 0 175px;`. (Không dùng `flex: 1 1 auto` làm phình to ô tìm kiếm lấn át các nút khác).
     - Placeholder ngắn gọn: `Tìm tên, địa chỉ...` hoặc `Tìm kiếm...`.
     - Icon kính lúp `Search` size 14 bên trái.
     - Lắng nghe sự kiện `onKeyDown`: Nếu phím `Enter` thì tự động gọi `handleSearch()`.
  2. **Thanh phân cách (.po-bar-divider)**:
     - `width: 1px; height: 24px; background-color: #e2e8f0; margin: 0 2px; flex-shrink: 0;`.
  3. **Dropdown phân loại / Mã (Category / Code Select)**:
     - Cụm `po-bar-group` gồm Label in đậm 12px (`Mã CN:`, `Kho:`, `Loại:...`) và thẻ `<select className="po-ctrl-select">`.
     - Độ rộng tối thiểu: `min-width: 105px - 120px`, chiều cao `32px`.
  4. **Dropdown trạng thái (Status Select)**:
     - Label `Trạng thái:`, `<select className="po-ctrl-select">` có các tùy chọn `Tất cả trạng thái`, `Đang hoạt động`, `Ngừng hoạt động`...
     - Độ rộng tối thiểu: `min-width: 135px - 145px`, chiều cao `32px`.
  5. **Bộ lọc khoảng ngày cập nhật (Date Range)**:
     - Label có icon Calendar: `<Calendar size={13} /> Cập nhật:`.
     - 2 ô input ngày: `<input type="date" className="po-ctrl-date" style={{ width: 128 }} />` cách nhau dấu gạch ngang `—`.
  6. **CỤM NÚT THAO TÁC CĂN PHẢI (`margin-left: auto`)**:
     - Bọc trong `div` có `style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}`.
     - **Nút "Tìm kiếm" (Primary Button)**:
       - Nền: `var(--blue-primary, #0f766e)`, chữ trắng `#ffffff`, chiều cao `32px`, padding `0 16px`, bo góc `7px`, font-size `12.5px`, font-weight `600`.
       - Icon: `<Search size={14} />`.
     - **Nút "Đặt lại" (Reset Button)**:
       - Nền trắng, viền `#cbd5e1`, chữ `#475569`, chiều cao `32px`, padding `0 14px`, bo góc `7px`, font-size `12.5px`, font-weight `600`.
       - Icon: `<RotateCcw size={13} />`.

---

### 2.3. Bảng Dữ Liệu Enterprise (Data Table - `.po-branch-table`)

#### A. Cấu trúc HTML & Table Layout
```tsx
<div className="po-branch-container">
  <div className="po-branch-table-wrapper">
    <table className="po-branch-table">
      <colgroup>
        <col style={{ width: '10%' }} />   {/* Mã */}
        <col style={{ width: '23%' }} />   {/* Tên & Địa chỉ */}
        <col style={{ width: '16%' }} />   {/* Người phụ trách */}
        <col style={{ width: '10%' }} />   {/* Tồn kho thực tế (số) */}
        <col style={{ width: '8%' }} />    {/* SL đặt hàng (số) */}
        <col style={{ width: '12%' }} />   {/* Trạng thái */}
        <col style={{ width: '10%' }} />   {/* Cập nhật gần nhất */}
        <col style={{ width: 204 }} />      {/* Thao tác (CỐ ĐỊNH 200-204px) */}
      </colgroup>
      <thead>...</thead>
      <tbody>...</tbody>
    </table>
  </div>
  {/* Pagination Footer */}
</div>
```

#### B. Quy tắc căn lề cột (Column Alignment)
| Loại dữ liệu | Căn lề | Định dạng hiển thị | Ghi chú |
|---|---|---|---|
| Mã định danh (Code) | **Trái (Left)** | Badge font monospace, nền `#e0f2fe`, chữ `#0369a1`, padding `2px 7px`, bo góc 4px | Phải tách thành cột riêng, không gộp với Tên |
| Tên & Địa chỉ / Mô tả | **Trái (Left)** | Dòng 1: Tên in đậm 13px (ellipsis có tooltip `title`)<br>Dòng 2: Icon nhỏ + text mờ 11.5px | Không để tràn text sang cột kế tiếp |
| Người phụ trách / Đối tác | **Trái (Left)** | Dòng 1: Họ tên in đậm 12.5px<br>Dòng 2: Icon Phone + SĐT (hoặc `—` nếu thiếu) | Hiển thị gọn gàng 2 dòng |
| Số lượng / Tồn kho / Tiền | **PHẢI (Right)** | `text-align: right`, font monospace `tabular-nums`, format locale `vi-VN` (dấu chấm phân cách) | Số 0 hiển thị là `0`. Cấm dùng icon thừa trong ô số |
| Trạng thái (Status) | **Giữa (Center)** | Badge bo viền mềm: Đang hoạt động (`#ecfdf5`/`#047857`), Ngừng (`#f1f5f9`/`#64748b`) | Chữ ngắn gọn, có icon trạng thái nhỏ |
| Thời gian cập nhật | **Giữa (Center)** | Text mờ 11.5px, `white-space: nowrap` (hoặc `—` nếu null) | Chuẩn ngày/tháng/năm giờ:phút |
| **Thao tác (Actions)** | **PHẢI (Right)** | Cột cố định `200px - 204px`, `white-space: nowrap`. Gồm 2 nút: Chi tiết (Outline) + Nút chính (Teal/Primary) | Luôn vừa vặn trên 1 dòng đơn, không cắt mép |

#### C. Kích thước & Spacing chuẩn
- Header row height: `44px`, nền `#f8fafc`, viền đáy `1px solid #cbd5e1`, font-size `12px`, font-weight `600`, màu `#475569`.
- Body row height: `60px - 66px` cho ô có 2 dòng dữ liệu.
- Cell padding: `padding: 8px 12px; vertical-align: middle;`.
- Viền dòng: `border-bottom: 1px solid #f1f5f9;`.
- Hover dòng: `background-color: #f8fafc; transition: background-color 0.12s ease;`.

#### D. Nút hành động trong cột Thao tác
- Nút phụ (**Chi tiết / Sửa**): `<button className="po-branch-btn-view"><Eye size={12}/><span>Chi tiết</span></button>` (Nền trắng, viền `#cbd5e1`, height 30px, padding `0 9px`, font-size `11.5px`, radius 6px).
- Nút chính (**Đặt hàng / Duyệt**): `<button className="po-branch-btn-order"><ShoppingCart size={12}/><span>Đặt hàng</span></button>` (Nền `var(--blue-primary, #0f766e)`, chữ trắng, height 30px, padding `0 11px`, font-size `11.5px`, radius 6px).
- Trạng thái vô hiệu hóa: Nút chính khi record bị inactive có `disabled`, `opacity: 0.7`, `cursor: not-allowed` và tooltip giải thích lý do.

---

### 2.4. Phân Trang Ở Footer (Pagination Footer)
- Luôn hiển thị khi bảng có dữ liệu (`totalCount > 0`), dính liền chân bảng với `border-top: 1px solid #e2e8f0`.
- Chiều cao compact: Padding `9px 16px`, nền trắng `#ffffff`, `display: flex; justify-content: space-between; align-items: center;`.
- **Khu vực bên trái**:
  - Dòng thông tin số lượng: `Hiển thị [từ] - [đến] trên [tổng] [đối tượng]` (vd: `Hiển thị 1 - 10 trên 11 chi nhánh`).
  - **Bộ chọn số bản ghi / trang**:
    ```tsx
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        style={{
          height: 28,
          padding: '0 8px',
          borderRadius: 5,
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={30}>30</option>
        <option value={50}>50</option>
      </select>
    </div>
    ```
- **Khu vực bên phải**:
  - Nút **Trước** (`<ChevronLeft size={13} /> Trước`), hiển thị **Trang X / Y**, Nút **Sau** (`Sau <ChevronRight size={13} />`).
  - Nút có viền `#cbd5e1`, nền trắng, height 28px, padding `0 8px`, tự động disabled khi ở trang đầu hoặc cuối.

---

## 3. Mẫu Khung Code Tiêu Chuẩn (Boilerplate Template)

Khi AI hoặc Developer tạo bất kỳ màn hình quản trị danh sách mới nào, hãy sao chép trực tiếp khung mẫu sau:

```tsx
import { useState, useMemo, FC } from 'react';
import { Search, RotateCcw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface FilterState {
  keyword: string;
  category: string;
  status: 'all' | 'active' | 'inactive';
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  category: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

export const StandardListPage: FC = () => {
  // 1. Phân tách rõ ràng giữa filterInputs (draft) và appliedFilters (active)
  const [filterInputs, setFilterInputs] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // 2. Chỉ kích hoạt lọc khi bấm nút Tìm kiếm
  const handleSearch = () => {
    setAppliedFilters({ ...filterInputs });
    setPageIndex(1);
  };

  const handleReset = () => {
    setFilterInputs(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageIndex(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPageIndex(1);
  };

  return (
    <div className="po-matrix-container">
      {/* 1. Header Trang - Chuẩn Sentence case */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tên danh sách quản trị</h1>
      </div>

      {/* 2. Thanh công cụ lọc chuẩn */}
      <div className="po-unified-bar">
        {/* Ô tìm kiếm compact */}
        <div className="po-ctrl-search" style={{ width: 175, flex: '0 0 175px' }}>
          <Search size={14} className="po-ctrl-search-icon" />
          <input
            type="text"
            className="po-ctrl-search-input"
            placeholder="Tìm tên, mã..."
            value={filterInputs.keyword}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            onChange={(e) => setFilterInputs((prev) => ({ ...prev, keyword: e.target.value }))}
          />
        </div>

        <div className="po-bar-divider" />

        {/* Dropdown danh mục */}
        <div className="po-bar-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Phân loại:</label>
          <select
            className="po-ctrl-select"
            style={{ minWidth: 110 }}
            value={filterInputs.category}
            onChange={(e) => setFilterInputs((prev) => ({ ...prev, category: e.target.value }))}
          >
            <option value="all">Tất cả</option>
          </select>
        </div>

        <div className="po-bar-divider" />

        {/* Cụm chọn ngày */}
        <div className="po-bar-group">
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={13} /> Cập nhật:
          </label>
          <input
            type="date"
            className="po-ctrl-date"
            style={{ width: 128 }}
            value={filterInputs.dateFrom}
            onChange={(e) => setFilterInputs((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          <input
            type="date"
            className="po-ctrl-date"
            style={{ width: 128 }}
            value={filterInputs.dateTo}
            onChange={(e) => setFilterInputs((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>

        {/* Cụm nút thao tác căn phải */}
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={handleSearch} className="po-ctrl-btn-search" style={{ height: 32, padding: '0 16px' }}>
            <Search size={14} /> <span>Tìm kiếm</span>
          </button>
          <button type="button" onClick={handleReset} className="po-ctrl-btn-reset" style={{ height: 32, padding: '0 14px' }}>
            <RotateCcw size={13} /> <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* 3. Bảng dữ liệu Single Table */}
      {/* ... Sử dụng Table Component theo chuẩn mục 2.3 & 2.4 ... */}
    </div>
  );
};
```

---

## 4. Checklist Bắt Buộc Trước Khi Hoàn Thành Bất Kỳ Màn Hình Nào
- [ ] Tiêu đề trang và toàn bộ header cột bảng đã dùng đúng chuẩn **Sentence case** chưa? (Cấm Title Case như "Tồn Kho Thực Tế").
- [ ] Đã tách riêng cột **Mã** (badge mono) và cột **Tên** chưa?
- [ ] Đã căn lề chuẩn chưa: Cột số lượng/tiền tệ **căn phải**, trạng thái/ngày **căn giữa**, văn bản **căn trái**?
- [ ] Cột số lượng đã format `vi-VN` (phân cách hàng nghìn) và số 0 hiển thị là `0` chưa?
- [ ] Cột **Thao tác** có độ rộng cố định tối thiểu `200px` và chứa đủ cả 2 nút trên 1 hàng đơn chưa?
- [ ] Thanh filter có nút **Tìm kiếm** & **Đặt lại** căn phải (`margin-left: auto`) chưa?
- [ ] Việc lọc chỉ diễn ra khi bấm nút Tìm kiếm (hoặc gõ Enter) chưa?
- [ ] Footer có dropdown chọn số bản ghi / trang (`10`, `20`, `30`, `50`) và hoạt động chuẩn chưa?
- [ ] Màn hình có responsive tốt và không bị vỡ layout khi co kéo trình duyệt chưa?

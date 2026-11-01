import { useRef } from 'react';
import type { FC } from 'react';
import type { SupplierOption, BranchOption } from '../../types/po.types';
import { Search, RotateCcw } from 'lucide-react';

interface OrderMatrixFilterBarProps {
  // Scope selectors
  branches?: BranchOption[];
  selectedBranchId: string;
  onSelectBranch?: (branchId: string) => void;
  hideBranchSelect?: boolean;
  fixedBranchLabel?: string;

  suppliers: SupplierOption[];
  selectedSupplierId: string;
  onSelectSupplier: (supplierId: string) => void;

  // Date range & Presets
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onApplyRange: () => void;
  durationDays?: number;
  onSelectDuration?: (days: number) => void;

  // Secondary filters
  categories: string[];
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  moqOnly: boolean;
  onMoqOnlyChange: (checked: boolean) => void;

  orderedOnly: boolean;
  onOrderedOnlyChange: (checked: boolean) => void;

  ownerModifiedOnly?: boolean;
  onOwnerModifiedOnlyChange?: (checked: boolean) => void;

  moqFailsCount?: number;
  ownerModifiedCount?: number;

  showSoh: boolean;
  onShowSohChange: (checked: boolean) => void;

  onResetFilters: () => void;
  isDirty?: boolean;

  // Toolbar actions
  onShiftWeek?: (deltaWeeks: number) => void;
  onThisWeek?: () => void;
  onCopyPrevWeek: () => void;
  onAutoSuggest?: () => void;
  onExcelDownload: () => void;
  onExcelUpload: (file: File) => void;
}

export const OrderMatrixFilterBar: FC<OrderMatrixFilterBarProps> = ({
  branches = [],
  selectedBranchId,
  onSelectBranch,
  hideBranchSelect = false,
  fixedBranchLabel,
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApplyRange,
  durationDays = 14,
  onSelectDuration,
  categories,
  categoryFilter,
  onCategoryChange,
  keyword,
  onKeywordChange,
  moqOnly,
  onMoqOnlyChange,
  orderedOnly,
  onOrderedOnlyChange,
  ownerModifiedOnly = false,
  onOwnerModifiedOnlyChange,
  moqFailsCount = 0,
  ownerModifiedCount = 0,
  showSoh,
  onShowSohChange,
  onResetFilters,
  isDirty = false,
  onShiftWeek: _onShiftWeek,
  onThisWeek: _onThisWeek,
  onCopyPrevWeek,
  onAutoSuggest,
  onExcelDownload,
  onExcelUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBranchChange = (newId: string) => {
    if (newId === selectedBranchId) return;
    if (isDirty) {
      const ok = window.confirm('Bạn có số lượng chưa lưu! Chuyển Chi nhánh sẽ làm mới ma trận. Tiếp tục?');
      if (!ok) return;
    }
    onSelectBranch?.(newId);
  };

  const handleSupplierChange = (newId: string) => {
    if (newId === selectedSupplierId) return;
    onSelectSupplier(newId);
  };

  return (
    <div className="po-filter-box">
      {/* ── ROW 1: Phạm vi Chi nhánh/NCC & Khung thời gian đặt hàng ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {/* Chi nhánh */}
          {!hideBranchSelect && (
            <div className="po-filter-field">
              <label className="po-filter-label">Chi nhánh:</label>
              <select
                className="po-ctrl-select"
                style={{ width: 175, fontWeight: 600 }}
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                title="Chọn Chi Nhánh"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hideBranchSelect && (
            <div
              className="po-fixed-branch-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                height: 32,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12,
                color: '#334155',
                whiteSpace: 'nowrap',
              }}
              title={`Chi nhánh phân công của nhân viên: ${fixedBranchLabel || 'Chi nhánh làm việc'}`}
            >
              <span style={{ color: '#64748b', fontWeight: 500 }}>Chi nhánh:</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{fixedBranchLabel || 'MT-Mart Chi Nhánh'}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', background: '#e2e8f0', borderRadius: 4, color: '#475569', fontWeight: 600 }}>Cố định</span>
            </div>
          )}

          {/* Nhà cung cấp */}
          <div className="po-filter-field">
            <label className="po-filter-label">Nhà cung cấp:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 210, fontWeight: 600 }}
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              title="Chọn Nhà Cung Cấp"
            >
              <option value="ALL">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="po-bar-divider" />

          {/* Preset khoảng ngày */}
          {onSelectDuration && (
            <div className="po-filter-field">
              <label className="po-filter-label">Khung ngày:</label>
              <div style={{ display: 'inline-flex', gap: 3 }}>
                {[7, 14, 21, 31].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`po-icon-btn ${durationDays === d ? 'po-icon-btn--active' : ''}`}
                    style={{
                      height: 28,
                      padding: '0 8px',
                      fontSize: 11,
                      fontWeight: durationDays === d ? 700 : 500,
                      backgroundColor: durationDays === d ? '#eff6ff' : '#ffffff',
                      color: durationDays === d ? '#1d4ed8' : '#475569',
                      borderColor: durationDays === d ? '#93c5fd' : '#cbd5e1',
                    }}
                    onClick={() => onSelectDuration(d)}
                    title={`Xem ma trận ${d} ngày`}
                  >
                    <span>{d} ngày</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Khoảng ngày Từ - Đến & Nút Áp dụng, Đặt lại (Căn về bên phải màn hình) */}
        <div className="po-filter-row-right">
          <div className="po-filter-field">
            <label className="po-filter-label">Từ:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 122, height: 28, fontSize: 12 }}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
            <label className="po-filter-label">Đến:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 122, height: 28, fontSize: 12 }}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
            <button
              type="button"
              className="po-ctrl-btn-apply"
              onClick={onApplyRange}
              title="Áp dụng khoảng ngày (tối đa 31 ngày)"
              style={{ padding: '0 12px', height: 28, fontSize: 12, fontWeight: 600 }}
            >
              <span>Áp dụng</span>
            </button>
            <button
              type="button"
              className="po-icon-btn"
              onClick={onResetFilters}
              title="Đặt lại các bộ lọc"
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Tìm kiếm, Ngành hàng, Bộ lọc kiểm tra & Nút Thao tác ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {/* Tìm kiếm sản phẩm: có text label & tăng width */}
          <div className="po-filter-field">
            <label className="po-filter-label">Tìm kiếm:</label>
            <div className="po-ctrl-search" style={{ width: 280, height: 28 }}>
              <Search size={13} className="po-ctrl-search-icon" />
              <input
                type="text"
                className="po-ctrl-search-input"
                placeholder="Tìm tên SP, SKU..."
                style={{ fontSize: 12 }}
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
              />
            </div>
          </div>

          {/* Ngành hàng */}
          <div className="po-filter-field">
            <select
              className="po-ctrl-select"
              style={{ width: 155, height: 28, fontSize: 12 }}
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Tất cả ngành hàng</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="po-bar-divider" />

          {/* Checkboxes bộ lọc nhanh */}
          <div className="po-bar-group" style={{ gap: 4 }}>
            <label
              className={`po-bar-checkbox ${orderedOnly ? 'is-checked' : ''}`}
              title="Lọc hiển thị những dòng đã nhập số lượng"
              style={{ height: 28, padding: '0 7px', fontSize: 11 }}
            >
              <input
                type="checkbox"
                checked={orderedOnly}
                onChange={(e) => onOrderedOnlyChange(e.target.checked)}
              />
              <span>Đã nhập</span>
            </label>

            {onOwnerModifiedOnlyChange && (
              <label
                className={`po-bar-checkbox ${ownerModifiedOnly ? 'is-checked' : ''}`}
                title="Lọc hiển thị những dòng Chủ cửa hàng đã điều chỉnh"
                style={{
                  height: 28,
                  padding: '0 7px',
                  fontSize: 11,
                  borderColor: ownerModifiedOnly ? '#f59e0b' : undefined,
                  backgroundColor: ownerModifiedOnly ? '#fffbeb' : undefined,
                  color: ownerModifiedOnly ? '#b45309' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={ownerModifiedOnly}
                  onChange={(e) => onOwnerModifiedOnlyChange(e.target.checked)}
                />
                <span>Chủ sửa</span>
                {ownerModifiedCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '0 4px',
                      borderRadius: 999,
                    }}
                  >
                    {ownerModifiedCount}
                  </span>
                )}
              </label>
            )}

            <label
              className={`po-bar-checkbox po-bar-checkbox--danger ${moqOnly ? 'is-checked' : ''}`}
              title="Lọc hiển thị những dòng có ô cảnh báo vi phạm MOQ"
              style={{ height: 28, padding: '0 7px', fontSize: 11 }}
            >
              <input
                type="checkbox"
                checked={moqOnly}
                onChange={(e) => onMoqOnlyChange(e.target.checked)}
              />
              <span>Lỗi MOQ</span>
              {moqFailsCount > 0 && (
                <span className="po-badge-count-danger" title={`${moqFailsCount} ô vi phạm rule MOQ`}>
                  {moqFailsCount}
                </span>
              )}
            </label>

            <label
              className={`po-bar-checkbox ${showSoh ? 'is-checked' : ''}`}
              title="Hiện cột Tồn kho (SOH) & Bán/Ngày"
              style={{ height: 28, padding: '0 7px', fontSize: 11 }}
            >
              <input
                type="checkbox"
                checked={showSoh}
                onChange={(e) => onShowSohChange(e.target.checked)}
              />
              <span>SOH &amp; Bán</span>
            </label>
          </div>
        </div>

        {/* Thao tác bên phải */}
        <div className="po-filter-row-right">
          {onAutoSuggest && (
            <button
              type="button"
              className="po-icon-btn"
              onClick={onAutoSuggest}
              title="Tự động tính toán số lượng đề xuất dựa trên Tồn kho SOH & Tốc độ bán"
              style={{
                color: '#0d9488',
                borderColor: '#99f6e4',
                backgroundColor: '#f0fdfa',
                padding: '0 8px',
                height: 28,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span>Gợi ý SL</span>
            </button>
          )}

          <button
            type="button"
            className="po-icon-btn"
            onClick={onCopyPrevWeek}
            title="Sao chép số lượng tuần trước sang tuần này"
            style={{
              color: 'var(--blue-primary)',
              borderColor: 'var(--blue-border)',
              padding: '0 8px',
              height: 28,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <span>Sao chép tuần</span>
          </button>

          <button
            type="button"
            className="po-icon-btn"
            onClick={onExcelDownload}
            title="Xuất bảng ma trận Excel (CSV/XLSX)"
            style={{ padding: '0 8px', height: 28, fontSize: 11, fontWeight: 600 }}
          >
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="po-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Nạp dữ liệu từ file Excel"
            style={{ padding: '0 8px', height: 28, fontSize: 11, fontWeight: 600 }}
          >
            <span>Nạp Excel</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) onExcelUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderMatrixFilterBar;

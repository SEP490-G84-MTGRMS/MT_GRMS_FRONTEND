import { useRef } from 'react';
import type { FC } from 'react';
import type { SupplierOption, BranchOption } from '../../types/po.types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  onShiftWeek: (deltaWeeks: number) => void;
  onThisWeek: () => void;
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
  onShiftWeek,
  onThisWeek,
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
    if (isDirty) {
      const ok = window.confirm('Bạn có số lượng chưa lưu! Chuyển NCC sẽ làm mới ma trận. Tiếp tục?');
      if (!ok) return;
    }
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

          {hideBranchSelect && fixedBranchLabel && (
            <div
              className="po-fixed-branch-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                height: 32,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                whiteSpace: 'nowrap',
              }}
              title={`Chi nhánh làm việc: ${fixedBranchLabel}`}
            >
              <span>Chi nhánh: {fixedBranchLabel}</span>
            </div>
          )}

          {/* Nhà cung cấp */}
          <div className="po-filter-field">
            <label className="po-filter-label">Nhà cung cấp:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 250, fontWeight: 600 }}
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
              <div style={{ display: 'inline-flex', gap: 4 }}>
                {[7, 14, 21, 31].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`po-icon-btn ${durationDays === d ? 'po-icon-btn--active' : ''}`}
                    style={{
                      height: 30,
                      padding: '0 10px',
                      fontSize: 12,
                      fontWeight: durationDays === d ? 700 : 500,
                      backgroundColor: durationDays === d ? '#eff6ff' : '#ffffff',
                      color: durationDays === d ? '#1d4ed8' : '#475569',
                      borderColor: durationDays === d ? '#93c5fd' : '#cbd5e1',
                    }}
                    onClick={() => onSelectDuration(d)}
                    title={`Xem ma trận ${d} ngày (${d === 31 ? 'tối đa 1 tháng' : `${d / 7} tuần`})`}
                  >
                    <span>{d === 31 ? '1 tháng (31N)' : `${d} ngày`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Điều hướng tuần */}
          <div className="po-bar-group">
            <button
              type="button"
              className="po-icon-btn"
              onClick={() => onShiftWeek(-1)}
              title="Tuần trước"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="po-icon-btn"
              onClick={onThisWeek}
              title="Về ngày hiện tại"
              style={{ padding: '0 10px', fontWeight: 600 }}
            >
              <span>Hôm nay</span>
            </button>
            <button
              type="button"
              className="po-icon-btn"
              onClick={() => onShiftWeek(1)}
              title="Tuần tới"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="po-bar-divider" />

          {/* Khoảng ngày Từ - Đến */}
          <div className="po-filter-field">
            <label className="po-filter-label">Từ:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 130 }}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
            <label className="po-filter-label">Đến:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 130 }}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
            <button
              type="button"
              className="po-ctrl-btn-apply"
              onClick={onApplyRange}
              title="Áp dụng khoảng ngày (tối đa 31 ngày)"
              style={{ padding: '0 12px', height: 32 }}
            >
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Tìm kiếm, Ngành hàng, Bộ lọc kiểm tra & Nút Thao tác ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {/* Tìm kiếm nhanh */}
          <div className="po-ctrl-search" style={{ width: 240 }}>
            <Search size={14} className="po-ctrl-search-icon" />
            <input
              type="text"
              className="po-ctrl-search-input"
              placeholder="Tìm tên sản phẩm, mã SKU..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
            />
          </div>

          {/* Ngành hàng */}
          <div className="po-filter-field">
            <select
              className="po-ctrl-select"
              style={{ width: 165 }}
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
          <div className="po-bar-group">
            <label
              className={`po-bar-checkbox ${orderedOnly ? 'is-checked' : ''}`}
              title="Lọc hiển thị những dòng đã nhập số lượng"
            >
              <input
                type="checkbox"
                checked={orderedOnly}
                onChange={(e) => onOrderedOnlyChange(e.target.checked)}
              />
              <span>Dòng đã nhập</span>
            </label>

            {onOwnerModifiedOnlyChange && (
              <label
                className={`po-bar-checkbox ${ownerModifiedOnly ? 'is-checked' : ''}`}
                title="Lọc hiển thị những dòng Chủ cửa hàng đã điều chỉnh"
                style={{
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
                <span>Chủ đã sửa</span>
                {ownerModifiedCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '1px 5px',
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
            >
              <input
                type="checkbox"
                checked={moqOnly}
                onChange={(e) => onMoqOnlyChange(e.target.checked)}
              />
              <span>Vi phạm MOQ</span>
              {moqFailsCount > 0 && (
                <span className="po-badge-count-danger" title={`${moqFailsCount} ô vi phạm rule MOQ`}>
                  {moqFailsCount}
                </span>
              )}
            </label>

            <label
              className={`po-bar-checkbox ${showSoh ? 'is-checked' : ''}`}
              title="Hiện cột Tồn kho (SOH) & Bán/Ngày"
            >
              <input
                type="checkbox"
                checked={showSoh}
                onChange={(e) => onShowSohChange(e.target.checked)}
              />
              <span>SOH &amp; Bán/ngày</span>
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
                padding: '0 12px',
                fontWeight: 600,
              }}
            >
              <span>Gợi ý số lượng</span>
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
              padding: '0 12px',
              fontWeight: 600,
            }}
          >
            <span>Sao chép tuần trước</span>
          </button>

          <button
            type="button"
            className="po-icon-btn"
            onClick={onExcelDownload}
            title="Xuất bảng ma trận Excel (CSV/XLSX)"
            style={{ padding: '0 12px', fontWeight: 600 }}
          >
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="po-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Nạp dữ liệu từ file Excel"
            style={{ padding: '0 12px', fontWeight: 600 }}
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

          <button
            type="button"
            className="po-icon-btn"
            onClick={onResetFilters}
            title="Đặt lại các bộ lọc"
            style={{ padding: '0 10px', color: '#64748b' }}
          >
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderMatrixFilterBar;

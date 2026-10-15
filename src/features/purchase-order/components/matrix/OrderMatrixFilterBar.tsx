import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierOption, BranchOption } from '../../types/po.types';
import {
  Check,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Copy,
  Calendar,
  ChevronDown,
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

  // Date range
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onApplyRange: () => void;

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

  moqFailsCount?: number;

  showSoh: boolean;
  onShowSohChange: (checked: boolean) => void;

  onResetFilters: () => void;
  isDirty?: boolean;

  // Toolbar actions (merged from OrderMatrixToolbar)
  onShiftWeek: (deltaWeeks: number) => void;
  onThisWeek: () => void;
  onCopyPrevWeek: () => void;
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
  categories,
  categoryFilter,
  onCategoryChange,
  keyword,
  onKeywordChange,
  moqOnly,
  onMoqOnlyChange,
  orderedOnly,
  onOrderedOnlyChange,
  moqFailsCount = 0,
  showSoh,
  onShowSohChange,
  onResetFilters,
  isDirty = false,
  onShiftWeek,
  onThisWeek,
  onCopyPrevWeek,
  onExcelDownload,
  onExcelUpload,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Count active secondary filters
  const activeFilters = [categoryFilter !== '', moqOnly, orderedOnly, showSoh].filter(Boolean).length;

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

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="po-unified-bar">
      {/* ── Left group: Chi nhánh + NCC ── */}
      <div className="po-bar-group">
        {!hideBranchSelect && (
          <select
            className="po-ctrl-select"
            style={{ width: 132, fontWeight: 600 }}
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            title="Chọn Chi Nhánh"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                CN: {b.name}
              </option>
            ))}
          </select>
        )}
        {hideBranchSelect && fixedBranchLabel && (
          <div
            className="po-fixed-branch-chip"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              height: 32,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              whiteSpace: 'nowrap',
            }}
            title={`Chi nhánh làm việc: ${fixedBranchLabel}`}
          >
            <span style={{ color: '#0d9488' }}>🏪</span>
            <span>CN: {fixedBranchLabel}</span>
          </div>
        )}

        <select
          className="po-ctrl-select"
          style={{ width: 148, fontWeight: 600 }}
          value={selectedSupplierId}
          onChange={(e) => handleSupplierChange(e.target.value)}
          title="Chọn Nhà Cung Cấp"
        >
          <option value="ALL">NCC: Tất cả</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="po-bar-divider" />

      {/* ── Navigation tuần ── */}
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
          className="po-icon-btn po-icon-btn--labeled"
          onClick={onThisWeek}
          title="Về tuần hiện tại"
        >
          <Calendar size={13} />
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

      {/* ── Search nhanh ── */}
      <div className="po-ctrl-search" style={{ flex: '1 1 150px', minWidth: 120, maxWidth: 220 }}>
        <Search size={13} className="po-ctrl-search-icon" />
        <input
          type="text"
          className="po-ctrl-search-input"
          placeholder="Tìm Tên / SKU..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

      <div className="po-bar-divider" />

      {/* ── 2 Checkboxes lọc nhanh: Dòng đã nhập & Cảnh báo đỏ vi phạm rule ── */}
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

        <label
          className={`po-bar-checkbox po-bar-checkbox--danger ${moqOnly ? 'is-checked' : ''}`}
          title="Lọc hiển thị những dòng có ô cảnh báo đỏ khi vi phạm rule nhập số lượng (MOQ)"
        >
          <input
            type="checkbox"
            checked={moqOnly}
            onChange={(e) => onMoqOnlyChange(e.target.checked)}
          />
          <span>Cảnh báo vi phạm</span>
          {moqFailsCount > 0 && (
            <span className="po-badge-count-danger" title={`${moqFailsCount} ô vi phạm rule MOQ`}>
              {moqFailsCount}
            </span>
          )}
        </label>
      </div>

      <div className="po-bar-divider" />

      {/* ── Actions: Copy, Excel, Status ── */}
      <div className="po-bar-group">
        <button
          type="button"
          className="po-icon-btn po-icon-btn--labeled"
          onClick={onCopyPrevWeek}
          title="Sao chép số lượng tuần trước"
          style={{ color: 'var(--blue-primary)', borderColor: 'var(--blue-border)' }}
        >
          <Copy size={13} />
          <span>Copy tuần</span>
        </button>

        <button
          type="button"
          className="po-icon-btn"
          onClick={onExcelDownload}
          title="Xuất Excel"
        >
          <Download size={14} />
        </button>

        <button
          type="button"
          className="po-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Nạp Excel"
        >
          <Upload size={14} />
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

      <div className="po-bar-divider" />

      {/* ── Bộ lọc mở rộng (dropdown panel) ── */}
      <div style={{ position: 'relative' }}>
        <button
          ref={btnRef}
          type="button"
          className={`po-icon-btn po-icon-btn--labeled ${filterOpen || activeFilters > 0 ? 'po-icon-btn--active' : ''}`}
          onClick={() => setFilterOpen((v) => !v)}
          title="Mở bộ lọc nâng cao"
        >
          <SlidersHorizontal size={13} />
          <span>Bộ lọc{activeFilters > 0 ? ` (${activeFilters})` : ''}</span>
          <ChevronDown size={11} style={{ opacity: 0.6, transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {filterOpen && (
          <div ref={panelRef} className="po-filter-panel">
            {/* Row 1: Ngày + Áp dụng */}
            <div className="po-fp-row">
              <label className="po-fp-label">Từ ngày</label>
              <input
                type="date"
                className="po-ctrl-date"
                style={{ width: 130 }}
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
              <label className="po-fp-label">Đến ngày</label>
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
                onClick={() => { onApplyRange(); setFilterOpen(false); }}
              >
                <Check size={13} />
                <span>Áp dụng</span>
              </button>
            </div>

            {/* Row 2: Ngành hàng */}
            <div className="po-fp-row">
              <label className="po-fp-label">Ngành hàng</label>
              <select
                className="po-ctrl-select"
                style={{ flex: 1 }}
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="">Tất cả ngành hàng</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Row 3: Toggles */}
            <div className="po-fp-row po-fp-row--pills">
              <label
                className={`po-ctrl-pill ${orderedOnly ? 'active' : ''}`}
                title="Lọc hiển thị những dòng đã nhập số lượng"
              >
                <input
                  type="checkbox"
                  checked={orderedOnly}
                  onChange={(e) => onOrderedOnlyChange(e.target.checked)}
                  style={{ accentColor: 'var(--blue-primary)', cursor: 'pointer', margin: 0 }}
                />
                <span>Dòng đã nhập</span>
              </label>

              <label
                className={`po-ctrl-pill ${moqOnly ? 'active active-danger' : ''}`}
                title="Lọc hiển thị những dòng có cảnh báo đỏ khi vi phạm rule nhập số lượng (MOQ)"
              >
                <input
                  type="checkbox"
                  checked={moqOnly}
                  onChange={(e) => onMoqOnlyChange(e.target.checked)}
                  style={{ accentColor: '#ef4444', cursor: 'pointer', margin: 0 }}
                />
                <span>⚠ Cảnh báo vi phạm {moqFailsCount > 0 ? `(${moqFailsCount})` : ''}</span>
              </label>

              <label
                className={`po-ctrl-pill ${showSoh ? 'active' : ''}`}
                title="Hiện cột Tồn kho (SOH) & Bán/Ngày"
              >
                <input type="checkbox" checked={showSoh} onChange={(e) => onShowSohChange(e.target.checked)} style={{ display: 'none' }} />
                <span>SOH & Bán/Ngày</span>
              </label>

              <button
                type="button"
                className="po-ctrl-btn-reset"
                onClick={() => { onResetFilters(); setFilterOpen(false); }}
              >
                <RotateCcw size={12} />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderMatrixFilterBar;

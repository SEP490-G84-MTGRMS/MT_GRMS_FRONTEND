import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import type { SupplierOption, BranchOption, OrderMatrixProduct } from '../../types/po.types';
import { RotateCcw, X, ChevronsUpDown } from 'lucide-react';
import { MatrixTokenFilter } from './MatrixTokenFilter';

interface OrderMatrixFilterBarProps {
  branches?: BranchOption[];
  selectedBranchId: string;
  onSelectBranch?: (branchId: string) => void;
  hideBranchSelect?: boolean;
  fixedBranchLabel?: string;

  suppliers: SupplierOption[];
  /** Token mã NCC đã chọn (multi). */
  supplierCodes: string[];
  onSupplierCodesChange: (codes: string[]) => void;
  /** Token tên NCC đã chọn (multi). */
  supplierNames: string[];
  onSupplierNamesChange: (names: string[]) => void;

  products: OrderMatrixProduct[];
  productSkus: string[];
  onProductSkusChange: (skus: string[]) => void;
  productNames: string[];
  onProductNamesChange: (names: string[]) => void;

  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onApplyRange: () => void;
  durationDays?: number;
  onSelectDuration?: (days: number) => void;

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

  onShiftWeek?: (deltaWeeks: number) => void;
  onThisWeek?: () => void;
  onCopyPrevWeek: () => void;
  onAutoSuggest?: () => void;
  onExcelDownload: () => void;
  onExcelUpload: (file: File) => void;
}

type SearchOption = {
  id: string;
  primary: string;
  secondary?: string;
};

const CTRL_H = 32;

function highlightMatch(text: string, query: string) {
  if (!text || !query.trim()) return <span>{text}</span>;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const qLower = q.toLowerCase();
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === qLower ? (
          <mark
            key={`${part}-${i}`}
            style={{
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              fontWeight: 700,
              padding: '0 2px',
              borderRadius: 2,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        )
      )}
    </span>
  );
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: SearchOption[];
  selectedId: string;
  selectedLabel?: string;
  allowClearToId?: string;
  clearLabel?: string;
  /** Chiều rộng cố định (px). */
  width?: number;
  /** @deprecated dùng width */
  minWidth?: number;
  /** Chỉ lọc theo primary (vd: ô mã chỉ theo mã, ô tên chỉ theo tên). */
  matchPrimaryOnly?: boolean;
  onSelect: (id: string) => boolean | void;
}

const SearchableSelect: FC<SearchableSelectProps> = ({
  label,
  placeholder,
  options,
  selectedId,
  selectedLabel,
  allowClearToId,
  clearLabel,
  width,
  minWidth = 160,
  matchPrimaryOnly = false,
  onSelect,
}) => {
  const boxWidth = width ?? minWidth;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === selectedId);
  const chipText = selectedLabel || selected?.primary || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      if (o.primary.toLowerCase().includes(q)) return true;
      if (matchPrimaryOnly) return false;
      return (
        (o.secondary && o.secondary.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [options, query, matchPrimaryOnly]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      // Cho phép gõ tìm ngay khi mở — không bị chip chiếm chỗ
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const pick = (id: string) => {
    const ok = onSelect(id);
    if (ok === false) return;
    setQuery('');
    setOpen(false);
  };

  const enterSearchMode = () => {
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open && filtered.length) {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === 'ArrowUp' && open && filtered.length) {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[focusedIndex]) {
        pick(filtered[focusedIndex].id);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
    if (e.key === 'Backspace' && !query && allowClearToId && selectedId !== allowClearToId) {
      pick(allowClearToId);
    }
  };

  const hasSelection = Boolean(chipText) && selectedId !== (allowClearToId ?? '');
  // Khi mở/đang gõ: full input để tìm & đổi CN linh hoạt (Store Owner)
  const searchMode = open || Boolean(query);

  return (
    <div ref={rootRef} className="po-filter-field" style={{ position: 'relative', flexShrink: 0 }}>
      <label className="po-filter-label">{label}</label>
      <div style={{ position: 'relative', width: boxWidth, flexShrink: 0 }}>
        <div
          onClick={enterSearchMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 4,
            width: boxWidth,
            height: CTRL_H,
            padding: '0 28px 0 6px',
            borderRadius: 6,
            border: open || hasSelection ? '1px solid #0d9488' : '1px solid #cbd5e1',
            backgroundColor: hasSelection && !searchMode ? '#f0fdfa' : '#ffffff',
            boxShadow: open ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
            boxSizing: 'border-box',
            cursor: 'text',
            overflow: 'hidden',
          }}
        >
          {hasSelection && !searchMode && (
            <span
              title={chipText}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                height: 22,
                padding: '0 4px 0 8px',
                borderRadius: 4,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid #99f6e4',
                whiteSpace: 'nowrap',
              }}
            >
              Đã chọn
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (allowClearToId !== undefined && selectedId !== allowClearToId) {
                    pick(allowClearToId);
                    return;
                  }
                  enterSearchMode();
                }}
                title={
                  allowClearToId !== undefined
                    ? clearLabel || 'Xóa lựa chọn'
                    : 'Tìm / đổi chi nhánh'
                }
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  border: 'none',
                  background: 'transparent',
                  color: '#0f766e',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={11} />
              </button>
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={
              searchMode
                ? placeholder
                : hasSelection
                  ? 'Đổi'
                  : placeholder
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={enterSearchMode}
            onKeyDown={handleKeyDown}
            style={{
              flex: searchMode || !hasSelection ? '1 1 auto' : '0 0 40px',
              minWidth: searchMode || !hasSelection ? 48 : 40,
              width: 0,
              height: 24,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 12.5,
              color: '#0f172a',
            }}
          />
        </div>
        <ChevronsUpDown
          size={13}
          style={{ position: 'absolute', right: 8, top: 9, color: '#94a3b8', pointerEvents: 'none' }}
        />

        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: Math.max(boxWidth, 320),
              marginTop: 4,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
              zIndex: 90,
              maxHeight: 300,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {hasSelection && (
              <div
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  padding: '8px 12px',
                  backgroundColor: '#f0fdfa',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                    marginBottom: 4,
                  }}
                >
                  Đang chọn
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.35,
                  }}
                >
                  {chipText}
                </div>
                {selected?.secondary && selected.secondary !== chipText && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#64748b',
                      marginTop: 2,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selected.secondary}
                  </div>
                )}
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: '#64748b' }}>
                Không tìm thấy kết quả
              </div>
            ) : (
              filtered.map((item, index) => {
                const active = index === focusedIndex;
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setFocusedIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      backgroundColor: active || isSelected ? '#f0fdfa' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {highlightMatch(item.primary, query)}
                    </div>
                    {item.secondary && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: '#64748b',
                          marginTop: 2,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.35,
                        }}
                      >
                        {highlightMatch(item.secondary, query)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const OrderMatrixFilterBar: FC<OrderMatrixFilterBarProps> = ({
  branches = [],
  selectedBranchId,
  onSelectBranch,
  hideBranchSelect = false,
  fixedBranchLabel,
  suppliers,
  supplierCodes,
  onSupplierCodesChange,
  supplierNames,
  onSupplierNamesChange,
  products,
  productSkus,
  onProductSkusChange,
  productNames,
  onProductNamesChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApplyRange,
  durationDays = 14,
  onSelectDuration,
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

  const branchCodeOptions: SearchOption[] = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        primary: b.code,
        secondary: b.name,
      })),
    [branches]
  );

  const branchNameOptions: SearchOption[] = useMemo(
    () =>
      branches.map((b) => ({
        id: b.id,
        primary: b.name,
        secondary: b.code,
      })),
    [branches]
  );

  const supplierCodeOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        id: s.id,
        value: s.code,
        primary: s.code,
        secondary: s.name,
      })),
    [suppliers]
  );

  const supplierNameOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        id: s.id,
        value: s.name,
        primary: s.name,
        secondary: s.code,
      })),
    [suppliers]
  );

  const productSkuOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; value: string; primary: string; secondary?: string }[] = [];
    for (const p of products) {
      const sku = (p.sku || '').trim();
      if (!sku) continue;
      const key = sku.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ id: p.id, value: sku, primary: sku, secondary: p.name });
    }
    return list;
  }, [products]);

  const productNameOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; value: string; primary: string; secondary?: string }[] = [];
    for (const p of products) {
      const name = (p.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ id: `${p.id}-${name}`, value: name, primary: name, secondary: p.sku });
    }
    return list;
  }, [products]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const handleBranchChange = (newId: string) => {
    if (newId === selectedBranchId) return true;
    if (isDirty) {
      const ok = window.confirm('Bạn có số lượng chưa lưu! Chuyển Chi nhánh sẽ làm mới ma trận. Tiếp tục?');
      if (!ok) return false;
    }
    onSelectBranch?.(newId);
    return true;
  };

  const handleApply = () => {
    onApplyRange();
  };

  const handleReset = () => {
    onResetFilters();
  };

  return (
    <div className="po-filter-box">
      {/* ── DÒNG 1: Phạm vi CN / NCC / khung ngày / khoảng ngày ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {!hideBranchSelect && (
            <>
              <SearchableSelect
                label="Mã CN:"
                placeholder="Mã CN..."
                options={branchCodeOptions}
                selectedId={selectedBranchId}
                selectedLabel={selectedBranch?.code}
                width={120}
                matchPrimaryOnly
                onSelect={handleBranchChange}
              />
              <SearchableSelect
                label="Tên CN:"
                placeholder="Tên CN..."
                options={branchNameOptions}
                selectedId={selectedBranchId}
                selectedLabel={selectedBranch?.name}
                width={200}
                matchPrimaryOnly
                onSelect={handleBranchChange}
              />
            </>
          )}

          {hideBranchSelect && (
            <div
              className="po-fixed-branch-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                width: 200,
                padding: '0 12px',
                height: CTRL_H,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12,
                color: '#334155',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
              title={`Chi nhánh phân công: ${fixedBranchLabel || 'Chi nhánh làm việc'}`}
            >
              <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>CN:</span>
              <span style={{ color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Đã chọn
              </span>
            </div>
          )}

          <MatrixTokenFilter
            label="Mã NCC:"
            placeholder="Mã NCC..."
            width={140}
            tokens={supplierCodes}
            options={supplierCodeOptions}
            onChange={onSupplierCodesChange}
            matchPrimaryOnly
          />
          <MatrixTokenFilter
            label="Tên NCC:"
            placeholder="Tên NCC..."
            width={180}
            tokens={supplierNames}
            options={supplierNameOptions}
            onChange={onSupplierNamesChange}
            matchPrimaryOnly
          />

          <div className="po-bar-divider" />

          {onSelectDuration && (
            <div className="po-filter-field">
              <label className="po-filter-label">Khung:</label>
              <div style={{ display: 'inline-flex', gap: 3 }}>
                {[7, 14, 21, 31].map((d) => {
                  const active = durationDays === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`po-icon-btn ${active ? 'po-icon-btn--active' : ''}`}
                      onClick={() => onSelectDuration(d)}
                      title={`Xem ma trận ${d} ngày`}
                      style={{
                        height: CTRL_H,
                        padding: '0 8px',
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? '#eff6ff' : '#ffffff',
                        color: active ? '#1d4ed8' : '#475569',
                        borderColor: active ? '#93c5fd' : '#cbd5e1',
                      }}
                    >
                      {d} ngày
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="po-bar-divider" />

          <div className="po-filter-field">
            <label className="po-filter-label">Từ:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 118, height: CTRL_H, fontSize: 12 }}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
            <label className="po-filter-label">Đến:</label>
            <input
              type="date"
              className="po-ctrl-date"
              style={{ width: 118, height: CTRL_H, fontSize: 12 }}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
            <button
              type="button"
              className="po-ctrl-btn-apply"
              onClick={handleApply}
              title="Áp dụng khoảng ngày và tìm kiếm sản phẩm"
              style={{ padding: '0 10px', height: CTRL_H, fontSize: 12, fontWeight: 600 }}
            >
              Áp dụng
            </button>
            <button
              type="button"
              className="po-icon-btn"
              onClick={handleReset}
              title="Đặt lại các bộ lọc"
              style={{
                height: CTRL_H,
                padding: '0 8px',
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

      {/* ── DÒNG 2: Sản phẩm / checkbox / thao tác Excel ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          <MatrixTokenFilter
            label="Mã SP:"
            placeholder="SKU..."
            width={140}
            tokens={productSkus}
            options={productSkuOptions}
            onChange={onProductSkusChange}
            matchPrimaryOnly
          />
          <MatrixTokenFilter
            label="Tên SP:"
            placeholder="Tên SP..."
            width={200}
            tokens={productNames}
            options={productNameOptions}
            onChange={onProductNamesChange}
            matchPrimaryOnly
          />

          <div className="po-bar-divider" />

          <div className="po-bar-group" style={{ gap: 4 }}>
            <label
              className={`po-bar-checkbox ${orderedOnly ? 'is-checked' : ''}`}
              title="Lọc hiển thị những dòng đã nhập số lượng"
              style={{ height: CTRL_H, padding: '0 7px', fontSize: 11 }}
            >
              <input type="checkbox" checked={orderedOnly} onChange={(e) => onOrderedOnlyChange(e.target.checked)} />
              <span>Đã nhập</span>
            </label>

            {onOwnerModifiedOnlyChange && (
              <label
                className={`po-bar-checkbox ${ownerModifiedOnly ? 'is-checked' : ''}`}
                title="Lọc hiển thị những dòng Chủ cửa hàng đã điều chỉnh"
                style={{
                  height: CTRL_H,
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
              style={{ height: CTRL_H, padding: '0 7px', fontSize: 11 }}
            >
              <input type="checkbox" checked={moqOnly} onChange={(e) => onMoqOnlyChange(e.target.checked)} />
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
              style={{ height: CTRL_H, padding: '0 7px', fontSize: 11 }}
            >
              <input type="checkbox" checked={showSoh} onChange={(e) => onShowSohChange(e.target.checked)} />
              <span>SOH &amp; Bán</span>
            </label>
          </div>
        </div>

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
                height: CTRL_H,
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
              height: CTRL_H,
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
            title="Xuất / tải mẫu Excel ma trận theo bộ lọc hiện tại"
            style={{ padding: '0 8px', height: CTRL_H, fontSize: 11, fontWeight: 600 }}
          >
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            className="po-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Nạp dữ liệu từ file Excel (kiểm tra trên máy chủ)"
            style={{ padding: '0 8px', height: CTRL_H, fontSize: 11, fontWeight: 600 }}
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

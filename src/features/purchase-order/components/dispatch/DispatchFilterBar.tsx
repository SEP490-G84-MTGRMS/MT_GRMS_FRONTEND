import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X, Loader2, Filter } from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

export type DispatchTabType = 'all' | 'critical' | 'today' | 'later' | 'completed';

export interface DispatchFilterValues {
  codes: string[];
  names: string[];
  products: string[];
  branches: string[];
  urgency: DispatchTabType;
}

export const DEFAULT_DISPATCH_FILTERS: DispatchFilterValues = {
  codes: [],
  names: [],
  products: [],
  branches: [],
  urgency: 'all',
};

type FieldKey = 'code' | 'name' | 'product' | 'branch';
type TokenMap = Record<FieldKey, string[]>;
type QueryMap = Record<FieldKey, string>;

type Suggestion = {
  id: string;
  value: string;
  primary: string;
  secondary?: string;
};

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  minWidth: number;
}

const FIELDS: FieldConfig[] = [
  { key: 'code', label: 'Mã nhà cung cấp', placeholder: 'Nhập mã, Enter để thêm...', minWidth: 220 },
  { key: 'name', label: 'Tên nhà cung cấp', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 270 },
  { key: 'product', label: 'Sản phẩm / SKU', placeholder: 'Nhập tên SP/SKU, Enter để thêm...', minWidth: 260 },
  { key: 'branch', label: 'Chi nhánh nhận', placeholder: 'Nhập tên/mã CN, Enter để thêm...', minWidth: 240 },
];

const EMPTY_TOKENS: TokenMap = { code: [], name: [], product: [], branch: [] };
const EMPTY_QUERIES: QueryMap = { code: '', name: '', product: '', branch: '' };

export interface DispatchFilterBarProps {
  filters?: DispatchFilterValues;
  suppliers?: SupplierDispatchGroup[];
  counts: Record<DispatchTabType, number>;
  onSearch?: (appliedFilters: DispatchFilterValues) => void;
  onReset?: () => void;

  /** Tương thích ngược */
  activeTab?: DispatchTabType;
  onTabChange?: (tab: DispatchTabType) => void;
  keyword?: string;
  onKeywordChange?: (kw: string) => void;
  onResetFilters?: () => void;
}

function uniqueTokens(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function tokensFromFilters(filters: DispatchFilterValues): TokenMap {
  return {
    code: uniqueTokens(filters.codes ?? []),
    name: uniqueTokens(filters.names ?? []),
    product: uniqueTokens(filters.products ?? []),
    branch: uniqueTokens(filters.branches ?? []),
  };
}

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

export const DispatchFilterBar: FC<DispatchFilterBarProps> = ({
  filters = DEFAULT_DISPATCH_FILTERS,
  suppliers = [],
  counts,
  onSearch,
  onReset,
  activeTab,
  onTabChange,
  onResetFilters,
}) => {
  const effectiveUrgency = activeTab ?? filters.urgency ?? 'all';

  const [draftFilters, setDraftFilters] = useState<DispatchFilterValues>({
    ...filters,
    urgency: effectiveUrgency,
  });
  const [prevFilters, setPrevFilters] = useState<DispatchFilterValues>(filters);
  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(filters));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [loadingField, setLoadingField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const barRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});
  const chipBoxRefs = useRef<Partial<Record<FieldKey, HTMLDivElement | null>>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ field: FieldKey; startX: number; startScroll: number; moved: boolean } | null>(null);
  const skipFocusRef = useRef(false);

  const scrollChipBoxToEnd = (field: FieldKey) => {
    requestAnimationFrame(() => {
      const el = chipBoxRefs.current[field];
      if (el) el.scrollLeft = el.scrollWidth;
    });
  };

  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraftFilters({ ...filters, urgency: effectiveUrgency });
    setTokens(tokensFromFilters(filters));
    setQueries(EMPTY_QUERIES);
  }

  // Click outside listener to close suggestions
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenField(null);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Horizontal wheel scroll on chip box
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    (Object.keys(EMPTY_TOKENS) as FieldKey[]).forEach((field) => {
      const el = chipBoxRefs.current[field];
      if (!el) return;
      const onWheel = (event: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth) return;
        event.preventDefault();
        el.scrollLeft += event.deltaY + event.deltaX;
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      cleanups.push(() => el.removeEventListener('wheel', onWheel));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [tokens]);

  const addTokens = (field: FieldKey, values: string[]) => {
    const incoming = uniqueTokens(values);
    if (!incoming.length) return;
    setTokens((prev) => ({
      ...prev,
      [field]: uniqueTokens([...prev[field], ...incoming]),
    }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setOpenField(null);
    setSuggestions([]);
    setFocusedIndex(-1);
    scrollChipBoxToEnd(field);
  };

  const removeToken = (field: FieldKey, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item.toLowerCase() !== value.toLowerCase()),
    }));
  };

  // Build suggestions from supplier dispatch list
  const loadSuggestions = useCallback(
    (field: FieldKey, query: string, selected: string[]) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        setOpenField(null);
        setLoadingField(null);
        return;
      }

      setLoadingField(field);
      try {
        const qLower = trimmed.toLowerCase();
        const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
        const seen = new Set<string>();
        const mapped: Suggestion[] = [];

        if (field === 'code') {
          for (const s of suppliers) {
            if (!s.code || selectedSet.has(s.code.toLowerCase()) || seen.has(s.code.toLowerCase())) continue;
            if (s.code.toLowerCase().includes(qLower) || s.name.toLowerCase().includes(qLower)) {
              seen.add(s.code.toLowerCase());
              mapped.push({
                id: `code-${s.id}-${s.code}`,
                value: s.code,
                primary: s.code,
                secondary: s.name,
              });
            }
          }
        } else if (field === 'name') {
          for (const s of suppliers) {
            if (!s.name || selectedSet.has(s.name.toLowerCase()) || seen.has(s.name.toLowerCase())) continue;
            if (s.name.toLowerCase().includes(qLower) || s.code.toLowerCase().includes(qLower)) {
              seen.add(s.name.toLowerCase());
              mapped.push({
                id: `name-${s.id}-${s.name}`,
                value: s.name,
                primary: s.name,
                secondary: s.code,
              });
            }
          }
        } else if (field === 'product') {
          for (const s of suppliers) {
            for (const it of s.items || []) {
              const val = it.name || it.sku;
              if (!val || selectedSet.has(val.toLowerCase()) || seen.has(val.toLowerCase())) continue;
              if (it.name.toLowerCase().includes(qLower) || it.sku.toLowerCase().includes(qLower)) {
                seen.add(val.toLowerCase());
                mapped.push({
                  id: `prod-${it.id || it.sku}-${val}`,
                  value: val,
                  primary: it.name,
                  secondary: `SKU: ${it.sku} • NCC: ${s.name}`,
                });
              }
            }
          }
        } else if (field === 'branch') {
          for (const s of suppliers) {
            for (const b of s.branches || []) {
              const val = b.branchName || b.branchCode;
              if (!val || selectedSet.has(val.toLowerCase()) || seen.has(val.toLowerCase())) continue;
              if (b.branchName.toLowerCase().includes(qLower) || b.branchCode.toLowerCase().includes(qLower)) {
                seen.add(val.toLowerCase());
                mapped.push({
                  id: `br-${b.branchId}-${val}`,
                  value: val,
                  primary: b.branchName,
                  secondary: `Mã CN: ${b.branchCode}`,
                });
              }
            }
          }
        }

        const limited = mapped.slice(0, 8);
        setSuggestions(limited);
        setOpenField(limited.length > 0 ? field : null);
        setFocusedIndex(limited.length > 0 ? 0 : -1);
      } catch {
        setSuggestions([]);
        setOpenField(null);
      } finally {
        setLoadingField(null);
      }
    },
    [suppliers]
  );

  const scheduleSuggestions = (field: FieldKey, value: string, selected: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        loadSuggestions(field, value, selected);
      }, 150);
    } else {
      setSuggestions([]);
      setOpenField(null);
    }
  };

  const handleFieldChange = (field: FieldKey, value: string) => {
    if (/[,;]/.test(value)) {
      const parts = value.split(/[,;]/);
      const remainder = parts.pop() ?? '';
      addTokens(field, parts);
      setQueries((prev) => ({ ...prev, [field]: remainder }));
      if (remainder.trim()) {
        scheduleSuggestions(field, remainder, uniqueTokens([...tokens[field], ...parts]));
      }
      return;
    }

    setQueries((prev) => ({ ...prev, [field]: value }));
    setFocusedIndex(-1);
    scheduleSuggestions(field, value, tokens[field]);
  };

  const handleSelect = (field: FieldKey, value: string) => {
    addTokens(field, [value]);
  };

  const handleClearField = (field: FieldKey) => {
    setTokens((prev) => ({ ...prev, [field]: [] }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    if (openField === field) {
      setOpenField(null);
      setSuggestions([]);
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (field: FieldKey, e: KeyboardEvent<HTMLInputElement>) => {
    const isOpen = openField === field && suggestions.length > 0;
    const query = queries[field];

    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Backspace' && !query && tokens[field].length > 0) {
      e.preventDefault();
      setTokens((prev) => ({ ...prev, [field]: prev[field].slice(0, -1) }));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
        handleSelect(field, suggestions[focusedIndex].value);
        return;
      }
      if (query.trim()) {
        addTokens(field, [query]);
        return;
      }
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setOpenField(null);
      setFocusedIndex(-1);
    }
  };

  const collectTokens = (): TokenMap => ({
    code: uniqueTokens([...tokens.code, queries.code]),
    name: uniqueTokens([...tokens.name, queries.name]),
    product: uniqueTokens([...tokens.product, queries.product]),
    branch: uniqueTokens([...tokens.branch, queries.branch]),
  });

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const next = collectTokens();
    setTokens(next);
    setQueries(EMPTY_QUERIES);
    setOpenField(null);

    const newFilterValues: DispatchFilterValues = {
      ...draftFilters,
      codes: next.code,
      names: next.name,
      products: next.product,
      branches: next.branch,
      urgency: draftFilters.urgency,
    };

    if (onSearch) {
      onSearch(newFilterValues);
    }
  };

  const handleResetClick = () => {
    setOpenField(null);
    setSuggestions([]);
    setTokens(EMPTY_TOKENS);
    setQueries(EMPTY_QUERIES);
    setDraftFilters(DEFAULT_DISPATCH_FILTERS);

    if (onReset) {
      onReset();
    } else if (onResetFilters) {
      onResetFilters();
    }
  };

  const handleUrgencyChange = (newUrgency: DispatchTabType) => {
    setDraftFilters((prev) => ({ ...prev, urgency: newUrgency }));
    if (onTabChange) {
      onTabChange(newUrgency);
    }
    // Auto-search on tab/urgency change
    const next = collectTokens();
    if (onSearch) {
      onSearch({
        ...draftFilters,
        codes: next.code,
        names: next.name,
        products: next.product,
        branches: next.branch,
        urgency: newUrgency,
      });
    }
  };

  const hasActiveFilters = Boolean(
    tokens.code.length ||
    tokens.name.length ||
    tokens.product.length ||
    tokens.branch.length ||
    queries.code.trim() ||
    queries.name.trim() ||
    queries.product.trim() ||
    queries.branch.trim() ||
    draftFilters.urgency !== 'all'
  );

  const safeCounts: Record<DispatchTabType, number> = {
    all: counts?.all ?? 0,
    critical: counts?.critical ?? 0,
    today: counts?.today ?? 0,
    later: counts?.later ?? 0,
    completed: counts?.completed ?? 0,
    pending_changes: counts?.pending_changes ?? 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  return (
    <div ref={barRef} className="so-list-filter">
      {/* ── Dòng 1: Danh sách các trường tìm kiếm dạng Chip + Gợi ý (như các màn hình trước) ── */}
      <div
        className="so-list-filter-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        {FIELDS.map((field) => {
          const query = queries[field.key];
          const fieldTokens = tokens[field.key];
          const hasValues = fieldTokens.length > 0;
          const isOpen = openField === field.key && suggestions.length > 0;

          return (
            <div
              key={field.key}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                flex: '1 1 270px',
                minWidth: field.minWidth,
                maxWidth: 480,
              }}
            >
              <label style={labelStyle}>{field.label}:</label>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <div
                  ref={(el) => {
                    chipBoxRefs.current[field.key] = el;
                  }}
                  className="supplier-chip-input so-list-chip-box"
                  onClick={() => {
                    if (skipFocusRef.current) {
                      skipFocusRef.current = false;
                      return;
                    }
                    inputRefs.current[field.key]?.focus();
                  }}
                  onWheel={(e) => {
                    const el = chipBoxRefs.current[field.key];
                    if (!el || el.scrollWidth <= el.clientWidth) return;
                    e.preventDefault();
                    el.scrollLeft += e.deltaY + e.deltaX;
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('button, input')) return;
                    const el = chipBoxRefs.current[field.key];
                    if (!el) return;
                    dragRef.current = {
                      field: field.key,
                      startX: e.clientX,
                      startScroll: el.scrollLeft,
                      moved: false,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const drag = dragRef.current;
                    if (!drag || drag.field !== field.key) return;
                    const el = chipBoxRefs.current[field.key];
                    if (!el) return;
                    const dx = e.clientX - drag.startX;
                    if (Math.abs(dx) > 3) drag.moved = true;
                    el.scrollLeft = drag.startScroll - dx;
                  }}
                  onPointerUp={() => {
                    if (dragRef.current?.moved) skipFocusRef.current = true;
                    dragRef.current = null;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'nowrap',
                    gap: 4,
                    height: 32,
                    maxHeight: 32,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    padding: '0 28px 0 6px',
                    borderRadius: 6,
                    border: hasValues || isOpen ? '1px solid #0d9488' : '1px solid #cbd5e1',
                    backgroundColor: hasValues ? '#f0fdfa' : '#ffffff',
                    boxSizing: 'border-box',
                    boxShadow: isOpen ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
                    cursor: 'text',
                    userSelect: 'none',
                  }}
                >
                  {fieldTokens.map((token) => (
                    <span
                      key={`${field.key}-${token}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        gap: 4,
                        height: 22,
                        padding: '0 4px 0 8px',
                        borderRadius: 4,
                        backgroundColor: '#ccfbf1',
                        color: '#0f766e',
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1px solid #99f6e4',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 160,
                        }}
                        title={token}
                      >
                        {token}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeToken(field.key, token);
                        }}
                        title="Xóa giá trị"
                        style={{
                          width: 16,
                          height: 16,
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
                  ))}

                  <input
                    ref={(el) => {
                      inputRefs.current[field.key] = el;
                    }}
                    type="text"
                    value={query}
                    placeholder={fieldTokens.length ? 'Thêm giá trị...' : field.placeholder}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(field.key, e)}
                    onFocus={() => {
                      if (query.trim()) {
                        scheduleSuggestions(field.key, query, fieldTokens);
                      }
                    }}
                    style={{
                      flex: '1 0 70px',
                      minWidth: 70,
                      height: 24,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 12.5,
                      color: '#0f172a',
                      padding: 0,
                    }}
                  />
                </div>

                {/* Clear field button (X) or Loader */}
                {loadingField === field.key ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#0f766e',
                    }}
                  />
                ) : hasValues || query ? (
                  <button
                    type="button"
                    onClick={() => handleClearField(field.key)}
                    title="Xóa tất cả giá trị trường này"
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 18,
                      height: 18,
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={13} />
                  </button>
                ) : null}

                {/* Suggestions Dropdown */}
                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      minWidth: '100%',
                      width: Math.max(field.minWidth, 260),
                      marginTop: 4,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                      zIndex: 80,
                      maxHeight: 260,
                      overflowY: 'auto',
                      padding: '4px 0',
                    }}
                  >
                    {suggestions.map((item, index) => {
                      const active = index === focusedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setFocusedIndex(index)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelect(field.key, item.value)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            backgroundColor: active ? '#f0fdfa' : 'transparent',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                            {highlightMatch(item.primary, query)}
                          </div>
                          {item.secondary && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                              {highlightMatch(item.secondary, query)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dòng 2: Footer Toolbar (Trạng thái + Badge + Nút Tìm kiếm & Đặt lại) ── */}
      <div className="so-list-filter-row so-list-filter-row--footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Trạng thái / Mức độ ưu tiên */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label className="so-list-filter-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} color="#64748b" />
              <span>Trạng thái:</span>
            </label>
            <select
              className={`so-list-filter-select ${draftFilters.urgency !== 'all' ? 'so-list-filter-select--active' : ''}`}
              value={draftFilters.urgency}
              onChange={(e) => handleUrgencyChange(e.target.value as DispatchTabType)}
              style={{ minWidth: 170 }}
              title="Lọc theo mức độ ưu tiên hoặc trạng thái chốt PO"
            >
              <option value="all">Tất cả ({safeCounts.all})</option>
              <option value="critical">🔴 Cần chốt gấp ({safeCounts.critical})</option>
              <option value="today">🟡 Hôm nay ({safeCounts.today})</option>
              <option value="later">🔵 Đợt tới ({safeCounts.later})</option>
              <option value="completed">🟢 Đã gửi PO ({safeCounts.completed})</option>
            </select>
          </div>

          {/* Badge đang áp dụng bộ lọc */}
          {hasActiveFilters && (
            <span className="so-list-filter-badge">
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div className="so-list-filter-actions">
          <button
            type="button"
            className="so-list-filter-search"
            onClick={() => handleSubmit()}
            title="Áp dụng bộ lọc tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="so-list-filter-reset"
            onClick={handleResetClick}
            title="Đặt lại toàn bộ tiêu chí lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchFilterBar;

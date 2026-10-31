import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import type { StoreProductFilterValues, StoreSummary, StoreProductItem } from '../types/storeProduct.types';

export interface StoreProductFilterBarProps {
  initialValues: StoreProductFilterValues;
  stores: StoreSummary[];
  categories: string[];
  products: StoreProductItem[];
  totalCount: number;
  filteredCount: number;
  onSearch: (values: StoreProductFilterValues) => void;
  onReset: () => void;
}

type FieldKey = 'sku' | 'name' | 'storeName' | 'category';
type TokenMap = Record<FieldKey, string[]>;
type QueryMap = Record<FieldKey, string>;

type Suggestion = {
  id: string;
  value: string;
  primary: string;
};

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  minWidth: number;
}

const FIELDS: FieldConfig[] = [
  { key: 'sku', label: 'Mã SKU', placeholder: 'Nhập SKU, Enter để thêm...', minWidth: 200 },
  { key: 'name', label: 'Tên sản phẩm', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 280 },
  { key: 'storeName', label: 'Cửa hàng', placeholder: 'Nhập tên CH, Enter để thêm...', minWidth: 220 },
  { key: 'category', label: 'Ngành hàng', placeholder: 'Nhập ngành hàng, Enter để thêm...', minWidth: 220 },
];

const EMPTY_TOKENS: TokenMap = {
  sku: [],
  name: [],
  storeName: [],
  category: [],
};

const EMPTY_QUERIES: QueryMap = {
  sku: '',
  name: '',
  storeName: '',
  category: '',
};

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

function tokensFromFilters(filters: StoreProductFilterValues): TokenMap {
  return {
    sku: uniqueTokens(filters.skus?.length ? filters.skus : []),
    name: uniqueTokens(filters.names?.length ? filters.names : []),
    storeName: uniqueTokens(filters.storeNames?.length ? filters.storeNames : []),
    category: uniqueTokens(
      filters.categories?.length
        ? filters.categories
        : filters.categoryFilter && filters.categoryFilter !== 'ALL'
          ? [filters.categoryFilter]
          : []
    ),
  };
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        style={{
          backgroundColor: '#ccfbf1',
          color: '#0f766e',
          fontWeight: 700,
          padding: 0,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const StoreProductFilterBar: FC<StoreProductFilterBarProps> = ({
  initialValues,
  stores,
  categories,
  products,
  totalCount,
  filteredCount,
  onSearch,
  onReset,
}) => {
  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(initialValues));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [status, setStatus] = useState<StoreProductFilterValues['statusFilter']>(
    initialValues.statusFilter || 'ALL'
  );

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    sku: null,
    name: null,
    storeName: null,
    category: null,
  });

  useEffect(() => {
    setTokens(tokensFromFilters(initialValues));
    setStatus(initialValues.statusFilter || 'ALL');
  }, [initialValues]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTokens = (field: FieldKey, newValues: string[]) => {
    setTokens((prev) => ({
      ...prev,
      [field]: uniqueTokens([...prev[field], ...newValues]),
    }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setSuggestions([]);
    setOpenField(null);
    setFocusedIndex(-1);
  };

  const removeToken = (field: FieldKey, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item.toLowerCase() !== value.toLowerCase()),
    }));
  };

  const loadSuggestions = useCallback(
    (field: FieldKey, query: string, selected: string[]) => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) {
        setSuggestions([]);
        setOpenField(null);
        return;
      }

      const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
      const mapped: Suggestion[] = [];
      const seen = new Set<string>();

      if (field === 'sku') {
        for (const item of products) {
          const val = item.sku;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `sku-${item.id}-${val}`,
            value: val,
            primary: val,
          });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'name') {
        for (const item of products) {
          const val = item.name;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `name-${item.id}-${val}`,
            value: val,
            primary: val,
          });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'storeName') {
        for (const item of stores) {
          const val = item.name;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `store-${item.id}-${val}`,
            value: val,
            primary: val,
          });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'category') {
        for (const cat of categories) {
          if (!cat?.trim()) continue;
          const key = cat.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `cat-${cat}`,
            value: cat,
            primary: cat,
          });
          if (mapped.length >= 8) break;
        }
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
    },
    [products, stores, categories]
  );

  const handleFieldChange = (field: FieldKey, rawValue: string) => {
    if (rawValue.includes(',')) {
      const parts = rawValue.split(',').map((p) => p.trim()).filter(Boolean);
      const remainder = rawValue.endsWith(',') ? '' : parts.pop() || '';
      if (parts.length) {
        addTokens(field, parts);
      }
      setQueries((prev) => ({ ...prev, [field]: remainder }));
      if (remainder.trim()) {
        loadSuggestions(field, remainder, uniqueTokens([...tokens[field], ...parts]));
      } else {
        setSuggestions([]);
        setOpenField(null);
      }
      return;
    }

    setQueries((prev) => ({ ...prev, [field]: rawValue }));
    loadSuggestions(field, rawValue, tokens[field]);
  };

  const handleKeyDown = (field: FieldKey, e: KeyboardEvent<HTMLInputElement>) => {
    const isDropdownOpen = openField === field && suggestions.length > 0;

    if (e.key === 'ArrowDown') {
      if (!isDropdownOpen) return;
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!isDropdownOpen) return;
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
        addTokens(field, [suggestions[focusedIndex].value]);
        return;
      }
      const trimmed = queries[field].trim();
      if (trimmed) {
        addTokens(field, [trimmed]);
      } else {
        handleSubmit();
      }
      return;
    }

    if (e.key === 'Backspace' && !queries[field] && tokens[field].length > 0) {
      e.preventDefault();
      const last = tokens[field][tokens[field].length - 1];
      removeToken(field, last);
      return;
    }

    if (e.key === 'Escape') {
      setOpenField(null);
      setSuggestions([]);
    }
  };

  const handleClearField = (field: FieldKey) => {
    setTokens((prev) => ({ ...prev, [field]: [] }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setSuggestions([]);
    setOpenField(null);
    inputRefs.current[field]?.focus();
  };

  const buildCurrentValues = (): StoreProductFilterValues => {
    const effectiveTokens: TokenMap = {
      sku: [...tokens.sku],
      name: [...tokens.name],
      storeName: [...tokens.storeName],
      category: [...tokens.category],
    };

    (Object.keys(queries) as FieldKey[]).forEach((k) => {
      const q = queries[k].trim();
      if (q && !effectiveTokens[k].some((t) => t.toLowerCase() === q.toLowerCase())) {
        effectiveTokens[k].push(q);
      }
    });

    return {
      skus: effectiveTokens.sku,
      names: effectiveTokens.name,
      storeNames: effectiveTokens.storeName,
      categories: effectiveTokens.category,
      storeId: initialValues.storeId || 'ALL',
      categoryFilter: effectiveTokens.category[0] || 'ALL',
      statusFilter: status,
      searchTerm: '',
    };
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const finalValues = buildCurrentValues();
    setTokens(tokensFromFilters(finalValues));
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    onSearch(finalValues);
  };

  const handleResetClick = () => {
    setTokens(EMPTY_TOKENS);
    setQueries(EMPTY_QUERIES);
    setStatus('ALL');
    setOpenField(null);
    setSuggestions([]);
    onReset();
  };

  const totalActiveTokens =
    tokens.sku.length +
    tokens.name.length +
    tokens.storeName.length +
    tokens.category.length;

  const isFiltered = totalActiveTokens > 0 || status !== 'ALL';

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '12px 14px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* ── ROW 1: 4 ô tìm kiếm chip/token (Text ngang hàng với ô input) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '10px 16px',
        }}
      >
        {FIELDS.map((field) => {
          const fieldTokens = tokens[field.key];
          const query = queries[field.key];
          const isOpen = openField === field.key && suggestions.length > 0;
          const hasValues = fieldTokens.length > 0;

          return (
            <div
              key={field.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
                minWidth: 0,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  userSelect: 'none',
                }}
              >
                <span>{field.label}:</span>
                {hasValues && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#0f766e',
                      backgroundColor: '#ccfbf1',
                      padding: '0 5px',
                      borderRadius: 8,
                    }}
                  >
                    {fieldTokens.length}
                  </span>
                )}
              </label>

              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <div
                  onClick={() => inputRefs.current[field.key]?.focus()}
                  style={{
                    minHeight: 34,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 4,
                    padding: '3px 26px 3px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    cursor: 'text',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {fieldTokens.map((token) => (
                    <span
                      key={token}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 6px',
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
                          maxWidth: 150,
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
                          width: 14,
                          height: 14,
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
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={(el) => {
                      inputRefs.current[field.key] = el;
                    }}
                    type="text"
                    value={query}
                    placeholder={fieldTokens.length ? 'Thêm...' : field.placeholder}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    onFocus={() => {
                      if (query.trim()) loadSuggestions(field.key, query, fieldTokens);
                    }}
                    onKeyDown={(e) => handleKeyDown(field.key, e)}
                    style={{
                      flex: '1 1 60px',
                      minWidth: 50,
                      height: 24,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 12.5,
                      color: '#0f172a',
                    }}
                  />
                </div>
                {hasValues || query ? (
                  <button
                    type="button"
                    onClick={() => handleClearField(field.key)}
                    title="Xóa toàn bộ giá trị của ô này"
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 5,
                      width: 22,
                      height: 22,
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

                {/* Dropdown suggestions (Chỉ hiển thị giá trị chính primary, không có secondary) */}
                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                      zIndex: 80,
                      maxHeight: 240,
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
                          onClick={() => addTokens(field.key, [item.value])}
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

      {/* ── ROW 2: Trạng thái & Nút Tìm kiếm, Đặt lại ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px dashed #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StoreProductFilterValues['statusFilter'])}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="Active">Đang bán</option>
              <option value="Inactive">Tạm ngừng</option>
            </select>
          </div>

          {isFiltered && (
            <span
              style={{
                fontSize: 12,
                color: '#0f766e',
                fontWeight: 700,
                backgroundColor: '#ccfbf1',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}

          <span style={{ fontSize: 12, color: '#64748b' }}>
            Hiển thị <b>{filteredCount}</b> trên <b>{totalCount}</b> sản phẩm
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#115e59';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0f766e';
            }}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreProductFilterBar;

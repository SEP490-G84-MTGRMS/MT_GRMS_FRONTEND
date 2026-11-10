import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import type { StoreProductFilterValues, StoreSummary, StoreProductItem } from '../types/storeProduct.types';
import type { SupplierSummary } from '../../supplier/types/supplier.types';

export interface StoreProductFilterBarProps {
  initialValues: StoreProductFilterValues;
  stores: StoreSummary[];
  suppliers?: SupplierSummary[];
  products: StoreProductItem[];
  totalCount?: number;
  filteredCount?: number;
  onSearch: (values: StoreProductFilterValues) => void;
  onReset: () => void;
}

type FieldKey = 'sku' | 'name' | 'supplierCode' | 'supplierName';
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
  { key: 'name', label: 'Tên sản phẩm', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 240 },
  { key: 'supplierCode', label: 'Mã NCC', placeholder: 'Nhập mã NCC, Enter để thêm...', minWidth: 200 },
  { key: 'supplierName', label: 'Nhà cung cấp', placeholder: 'Nhập tên NCC, Enter để thêm...', minWidth: 240 },
];

const EMPTY_TOKENS: TokenMap = {
  sku: [],
  name: [],
  supplierCode: [],
  supplierName: [],
};

const EMPTY_QUERIES: QueryMap = {
  sku: '',
  name: '',
  supplierCode: '',
  supplierName: '',
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
    supplierCode: uniqueTokens(filters.supplierCodes?.length ? filters.supplierCodes : []),
    supplierName: uniqueTokens(filters.supplierNames?.length ? filters.supplierNames : []),
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
  suppliers,
  products,
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
    supplierCode: null,
    supplierName: null,
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

  const executeSearch = (updatedTokens: TokenMap, currentStatus = status) => {
    setTokens(updatedTokens);
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    setSuggestions([]);
    setFocusedIndex(-1);
    onSearch({
      skus: updatedTokens.sku,
      names: updatedTokens.name,
      storeCodes: [],
      storeNames: [],
      supplierCodes: updatedTokens.supplierCode,
      supplierNames: updatedTokens.supplierName,
      storeId: initialValues.storeId || 'ALL',
      statusFilter: currentStatus,
      searchTerm: '',
    });
  };

  const addTokens = (field: FieldKey, newValues: string[]) => {
    const nextTokens = {
      ...tokens,
      [field]: uniqueTokens([...tokens[field], ...newValues]),
    };
    executeSearch(nextTokens);
  };

  const handleSelectSuggestion = (field: FieldKey, val: string) => {
    const nextTokens = {
      ...tokens,
      [field]: uniqueTokens([...tokens[field], val]),
    };
    executeSearch(nextTokens);
  };

  const removeToken = (field: FieldKey, value: string) => {
    const updated = tokens[field].filter((item) => item.toLowerCase() !== value.toLowerCase());
    const nextTokens = { ...tokens, [field]: updated };
    executeSearch(nextTokens);
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
      } else if (field === 'supplierCode') {
        if (suppliers?.length) {
          for (const item of suppliers) {
            const val = item.code;
            if (!val?.trim()) continue;
            const key = val.toLowerCase();
            if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
            seen.add(key);
            mapped.push({
              id: `suppcode-${item.id}-${val}`,
              value: val,
              primary: `${val} (${item.name})`,
            });
            if (mapped.length >= 8) break;
          }
        }
        for (const item of products) {
          const val = item.primarySupplierCode;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `prod-sc-${item.id}-${val}`,
            value: val,
            primary: `${val} (${item.primarySupplierName})`,
          });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'supplierName') {
        if (suppliers?.length) {
          for (const item of suppliers) {
            const val = item.name;
            if (!val?.trim()) continue;
            const key = val.toLowerCase();
            if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
            seen.add(key);
            mapped.push({
              id: `suppname-${item.id}-${val}`,
              value: val,
              primary: val,
            });
            if (mapped.length >= 8) break;
          }
        }
        for (const item of products) {
          const val = item.primarySupplierName;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `prod-sn-${item.id}-${val}`,
            value: val,
            primary: val,
          });
          if (mapped.length >= 8) break;
        }
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
    },
    [products, stores, suppliers]
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
        handleSelectSuggestion(field, suggestions[focusedIndex].value);
        return;
      }
      handleSubmit();
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
    const nextTokens = { ...tokens, [field]: [] };
    inputRefs.current[field]?.focus();
    executeSearch(nextTokens);
  };

  const buildCurrentValues = (): StoreProductFilterValues => {
    const effectiveTokens: TokenMap = {
      sku: [...tokens.sku],
      name: [...tokens.name],
      supplierCode: [...tokens.supplierCode],
      supplierName: [...tokens.supplierName],
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
      storeCodes: [],
      storeNames: [],
      supplierCodes: effectiveTokens.supplierCode,
      supplierNames: effectiveTokens.supplierName,
      storeId: initialValues.storeId || 'ALL',
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
    tokens.supplierCode.length +
    tokens.supplierName.length;

  const isFiltered = totalActiveTokens > 0 || status !== 'ALL';

  const renderField = (field: typeof FIELDS[number]) => {
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
          flex: 1,
        }}
      >
        <label
          style={{
            width: 84,
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
            className="supplier-chip-input so-list-chip-box"
            onClick={() => inputRefs.current[field.key]?.focus()}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 4,
              padding: '0 28px 0 6px',
              borderRadius: 6,
              border: hasValues || isOpen ? '1px solid #0d9488' : '1px solid #cbd5e1',
              backgroundColor: hasValues ? '#f0fdfa' : '#ffffff',
              cursor: 'text',
              boxSizing: 'border-box',
              height: 32,
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

          {/* Dropdown suggestions */}
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
                    onClick={() => handleSelectSuggestion(field.key, item.value)}
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
  };

  return (
    <div ref={containerRef} className="so-list-filter">
      {/* ── ROW 1: 4 ô lọc sản phẩm & nhà cung cấp (Mã SKU, Tên SP, Mã NCC, Nhà cung cấp) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px 14px',
          marginBottom: 10,
        }}
      >
        {FIELDS.map(renderField)}
      </div>

      {/* ── ROW 2: Trạng thái & Nút thao tác ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px 14px',
          paddingTop: 8,
          borderTop: '1px dashed #f1f5f9',
          flexWrap: 'wrap',
        }}
      >
        {/* Trạng thái & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Trạng thái:</span>
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value as StoreProductFilterValues['statusFilter'];
              setStatus(newStatus);
              const current = buildCurrentValues();
              onSearch({ ...current, statusFilter: newStatus });
            }}
            style={{
              height: 32,
              flex: 1,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1e293b',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              minWidth: 180,
            }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Active">Đang bán</option>
            <option value="Inactive">Tạm ngừng</option>
          </select>

          {isFiltered && (
            <span
              style={{
                fontSize: 11,
                color: '#0f766e',
                fontWeight: 700,
                backgroundColor: '#ccfbf1',
                padding: '2px 8px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              Đang lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div className="so-list-filter-actions" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="so-list-filter-search"
            onClick={handleSubmit}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="so-list-filter-reset"
            onClick={handleResetClick}
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

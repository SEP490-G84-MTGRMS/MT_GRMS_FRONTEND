import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X, Download, Upload } from 'lucide-react';
import type { SupplierSummary, SupplierProductItem } from '../../types/supplier.types';

export interface SupplierProductFilterValues {
  searchTerm?: string;
  skus?: string[];
  names?: string[];
  supplierCodes?: string[];
  supplierNames?: string[];
  /** @deprecated dùng skus/names */
  productSearch?: string;
  /** @deprecated dùng supplierCodes/supplierNames */
  supplierSearch?: string;
  supplierId: string;
  categoryFilter: string;
  statusFilter: 'ALL' | 'Active' | 'Inactive' | string;
}

interface SupplierProductFilterBarProps {
  initialValues: SupplierProductFilterValues;
  suppliers: SupplierSummary[];
  products: SupplierProductItem[];
  /** Nguồn gợi ý SKU/tên (master) — không bị thu hẹp theo bộ lọc đang apply */
  suggestionProducts?: Array<{ id?: string; sku?: string; name?: string; productCode?: string }>;
  categories: string[];
  totalCount?: number;
  filteredCount?: number;
  onSearch: (values: SupplierProductFilterValues) => void;
  onReset: () => void;
  /** Xuất Excel giá nhập sỉ + MOQ — cần chọn 1 NCC cụ thể */
  onExportExcel?: (supplierId: string) => void;
  /** Import Excel — cần chọn 1 NCC cụ thể */
  onImportExcel?: (supplierId: string, file: File) => void;
  excelBusy?: boolean;
  /** NCC đang ngữ cảnh (URL / mặc định Active) — dùng khi chưa lọc đúng 1 mã/tên NCC */
  fallbackSupplierId?: string | null;
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
}

const FIELDS: FieldConfig[] = [
  { key: 'sku', label: 'Mã SKU', placeholder: 'Nhập SKU, Enter để thêm...' },
  { key: 'name', label: 'Tên sản phẩm', placeholder: 'Nhập tên, Enter để thêm...' },
  { key: 'supplierCode', label: 'Mã NCC', placeholder: 'Nhập mã NCC, Enter để thêm...' },
  { key: 'supplierName', label: 'Nhà cung cấp', placeholder: 'Nhập tên NCC, Enter để thêm...' },
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

function tokensFromFilters(filters: SupplierProductFilterValues): TokenMap {
  const legacyProduct = filters.productSearch?.trim() ? [filters.productSearch.trim()] : [];
  const legacySupplier = filters.supplierSearch?.trim() ? [filters.supplierSearch.trim()] : [];
  return {
    sku: uniqueTokens(filters.skus?.length ? filters.skus : []),
    name: uniqueTokens(filters.names?.length ? filters.names : legacyProduct),
    supplierCode: uniqueTokens(filters.supplierCodes?.length ? filters.supplierCodes : []),
    supplierName: uniqueTokens(
      filters.supplierNames?.length ? filters.supplierNames : legacySupplier
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

export const SupplierProductFilterBar: FC<SupplierProductFilterBarProps> = ({
  initialValues,
  suppliers,
  products,
  suggestionProducts,
  categories,
  onSearch,
  onReset,
  onExportExcel,
  onImportExcel,
  excelBusy = false,
  fallbackSupplierId = null,
}) => {
  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(initialValues));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [status, setStatus] = useState(initialValues.statusFilter || 'ALL');
  const [category, setCategory] = useState(initialValues.categoryFilter || 'ALL');

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    sku: null,
    name: null,
    supplierCode: null,
    supplierName: null,
  });

  useEffect(() => {
    setTokens(tokensFromFilters(initialValues));
    setStatus(initialValues.statusFilter || 'ALL');
    setCategory(initialValues.categoryFilter || 'ALL');
  }, [initialValues]);

  const resolveExcelSupplierId = (): string | null => {
    if (initialValues.supplierId && initialValues.supplierId !== 'ALL') {
      return initialValues.supplierId;
    }
    const codes = tokens.supplierCode;
    if (codes.length === 1) {
      const hit = suppliers.find((s) => s.code.toLowerCase() === codes[0].toLowerCase());
      if (hit) return hit.id;
    }
    const names = tokens.supplierName;
    if (names.length === 1) {
      const hit = suppliers.find((s) => s.name.toLowerCase() === names[0].toLowerCase());
      if (hit) return hit.id;
    }
    // Tất cả SP đang hiện cùng 1 NCC
    const productSupplierIds = [
      ...new Set(products.map((p) => p.supplierId).filter(Boolean)),
    ];
    if (productSupplierIds.length === 1) return productSupplierIds[0];

    if (fallbackSupplierId && fallbackSupplierId !== 'ALL') {
      return fallbackSupplierId;
    }
    return null;
  };

  const showExcel = Boolean(onExportExcel || onImportExcel);
  const excelSupplierId = resolveExcelSupplierId();
  const canExcel = showExcel && Boolean(excelSupplierId);
  const excelHint = canExcel
    ? 'Xuất/Nhập Excel theo bộ lọc màn hình của NCC đang chọn'
    : 'Chọn/lọc đúng 1 nhà cung cấp (mã hoặc tên NCC) rồi bấm Xuất/Nhập Excel';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Chỉ cập nhật chip local — chưa gọi API; bấm "Tìm kiếm" mới apply. */
  const addToken = (field: FieldKey, raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setTokens((prev) => {
      if (prev[field].some((t) => t.toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, [field]: [...prev[field], value] };
    });
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setSuggestions([]);
    setOpenField(null);
    setFocusedIndex(-1);
    requestAnimationFrame(() => inputRefs.current[field]?.focus());
  };

  const addTokens = (field: FieldKey, newValues: string[]) => {
    const cleaned = uniqueTokens(newValues);
    if (!cleaned.length) return;
    setTokens((prev) => ({
      ...prev,
      [field]: uniqueTokens([...prev[field], ...cleaned]),
    }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setSuggestions([]);
    setOpenField(null);
    setFocusedIndex(-1);
    requestAnimationFrame(() => inputRefs.current[field]?.focus());
  };

  const handleSelectSuggestion = (field: FieldKey, val: string) => {
    addToken(field, val);
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

      // Gộp list NCC–SP đang hiện + master catalog (kể cả Ngừng KD) — không ưu tiên chỉ Active master.
      const skuNameSource = [
        ...products,
        ...((suggestionProducts && suggestionProducts.length > 0 ? suggestionProducts : []) as Array<
          SupplierProductItem | { sku?: string; productCode?: string; name?: string; id?: string }
        >),
      ];

      if (field === 'sku') {
        for (const item of skuNameSource) {
          const val = (item as { sku?: string; productCode?: string }).sku
            || (item as { productCode?: string }).productCode
            || '';
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          const id = (item as { id?: string }).id || key;
          mapped.push({ id: `sku-${id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'name') {
        for (const item of skuNameSource) {
          const val = (item as { name?: string }).name || '';
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          const id = (item as { id?: string }).id || key;
          mapped.push({ id: `name-${id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'supplierCode') {
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
        for (const item of products) {
          const val = item.supplierCode;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({
            id: `prod-sc-${item.id}-${val}`,
            value: val,
            primary: `${val} (${item.supplierName || ''})`,
          });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'supplierName') {
        for (const item of suppliers) {
          const val = item.name;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({ id: `suppname-${item.id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
        for (const item of products) {
          const val = item.supplierName;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({ id: `prod-sn-${item.id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
    },
    [products, suggestionProducts, suppliers]
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
      if (queries[field].trim()) {
        addToken(field, queries[field]);
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

  const buildCurrentValues = (): SupplierProductFilterValues => {
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
      supplierCodes: effectiveTokens.supplierCode,
      supplierNames: effectiveTokens.supplierName,
      productSearch: '',
      supplierSearch: '',
      searchTerm: '',
      supplierId: initialValues.supplierId || 'ALL',
      categoryFilter: category,
      statusFilter: status,
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
    setCategory('ALL');
    setOpenField(null);
    setSuggestions([]);
    onReset();
  };

  const renderField = (field: FieldConfig) => {
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

          {isOpen && (
            <div
              className="so-list-filter-suggest"
              onWheel={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                zIndex: 200,
                maxHeight: 240,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px 14px',
          alignItems: 'center',
          paddingTop: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            Ngành hàng:
          </span>
          <select
            value={category}
            onChange={(e) => {
              const newCategory = e.target.value;
              setCategory(newCategory);
              const current = buildCurrentValues();
              onSearch({ ...current, categoryFilter: newCategory });
            }}
            style={{
              height: 32,
              flex: 1,
              padding: '0 8px',
              borderRadius: 6,
              border: category !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: category !== 'ALL' ? '#0f766e' : '#1e293b',
              backgroundColor: category !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <option value="ALL">-- Tất cả ngành hàng ({categories.length}) --</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            Trạng thái:
          </span>
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
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
              minWidth: 0,
            }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Active">Hoạt động</option>
            <option value="Inactive">Tạm ngưng</option>
          </select>
        </div>

        <div
          className="so-list-filter-actions"
          style={{
            gridColumn: '3 / span 2',
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%',
            flexWrap: 'nowrap',
            gap: 8,
            minWidth: 0,
          }}
        >
          {showExcel && onExportExcel && (
            <button
              type="button"
              className="so-list-filter-reset"
              onClick={() => excelSupplierId && onExportExcel(excelSupplierId)}
              disabled={!canExcel || excelBusy}
              title={excelHint || 'Xuất Excel SP Active của NCC (giá nhập sỉ + MOQ)'}
              style={{ opacity: !canExcel || excelBusy ? 0.55 : 1, flexShrink: 0 }}
            >
              <Download size={13} />
              <span>{excelBusy ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          )}

          {showExcel && onImportExcel && (
            <>
              <button
                type="button"
                className="so-list-filter-reset"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canExcel || excelBusy}
                title={excelHint || 'Nhập Excel để cập nhật giá nhập sỉ + MOQ'}
                style={{ opacity: !canExcel || excelBusy ? 0.55 : 1, flexShrink: 0 }}
              >
                <Upload size={13} />
                <span>{excelBusy ? 'Đang xử lý...' : 'Nhập Excel'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && excelSupplierId) onImportExcel(excelSupplierId, file);
                  e.target.value = '';
                }}
              />
            </>
          )}

          <button
            type="button"
            className="so-list-filter-search"
            onClick={handleSubmit}
            style={{ flexShrink: 0 }}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="so-list-filter-reset"
            onClick={handleResetClick}
            style={{ flexShrink: 0 }}
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierProductFilterBar;

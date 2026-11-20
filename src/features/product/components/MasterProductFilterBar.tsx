import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X, Download, Upload, Printer } from 'lucide-react';
import type { Category, ProductItem } from '../types';

export interface MasterProductFilterValues {
  skus: string[];
  names: string[];
  barcodes: string[];
  categoryId: string;
  statusFilter: 'ALL' | 'Active' | 'Discontinued' | string;
}

interface MasterProductFilterBarProps {
  initialValues: MasterProductFilterValues;
  products: ProductItem[];
  categories: Category[];
  onSearch: (values: MasterProductFilterValues) => void;
  onReset: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  excelBusy?: boolean;
  onPrintBarcode?: () => void;
}

type FieldKey = 'sku' | 'name' | 'barcode';
type TokenMap = Record<FieldKey, string[]>;
type QueryMap = Record<FieldKey, string>;

type Suggestion = { id: string; value: string; primary: string };

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'sku', label: 'Mã SKU', placeholder: 'Nhập SKU, Enter để thêm...' },
  { key: 'name', label: 'Tên hàng', placeholder: 'Nhập tên, Enter để thêm...' },
  { key: 'barcode', label: 'Mã vạch', placeholder: 'Nhập barcode, Enter để thêm...' },
];

const EMPTY_TOKENS: TokenMap = { sku: [], name: [], barcode: [] };
const EMPTY_QUERIES: QueryMap = { sku: '', name: '', barcode: '' };

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

function tokensFromFilters(filters: MasterProductFilterValues): TokenMap {
  return {
    sku: uniqueTokens(filters.skus || []),
    name: uniqueTokens(filters.names || []),
    barcode: uniqueTokens(filters.barcodes || []),
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

export const MasterProductFilterBar: FC<MasterProductFilterBarProps> = ({
  initialValues,
  products,
  categories,
  onSearch,
  onReset,
  onExport,
  onImport,
  onPrintBarcode,
  excelBusy = false,
}) => {
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(initialValues));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [status, setStatus] = useState(initialValues.statusFilter || 'ALL');
  const [categoryId, setCategoryId] = useState(initialValues.categoryId || 'ALL');
  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    sku: null,
    name: null,
    barcode: null,
  });

  useEffect(() => {
    setTokens(tokensFromFilters(initialValues));
    setStatus(initialValues.statusFilter || 'ALL');
    setCategoryId(initialValues.categoryId || 'ALL');
  }, [initialValues]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenField(null);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const loadSuggestions = useCallback(
    (key: FieldKey, query: string, exclude: string[]) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        setSuggestions([]);
        return;
      }
      const excludeSet = new Set(exclude.map((x) => x.toLowerCase()));
      const seen = new Set<string>();
      const list: Suggestion[] = [];
      for (const p of products) {
        let value = '';
        if (key === 'sku') value = p.productCode || '';
        if (key === 'name') value = p.productName || '';
        if (key === 'barcode') value = p.barcode || '';
        const v = value.trim();
        if (!v) continue;
        const lower = v.toLowerCase();
        if (excludeSet.has(lower) || seen.has(lower)) continue;
        if (!lower.includes(q)) continue;
        seen.add(lower);
        list.push({ id: `${key}-${p.id}-${v}`, value: v, primary: v });
        if (list.length >= 8) break;
      }
      setSuggestions(list);
      setFocusedIndex(list.length ? 0 : -1);
    },
    [products]
  );

  const addToken = (key: FieldKey, raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setTokens((prev) => {
      if (prev[key].some((t) => t.toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, [key]: [...prev[key], value] };
    });
    setQueries((prev) => ({ ...prev, [key]: '' }));
    setSuggestions([]);
    setOpenField(null);
  };

  const removeToken = (key: FieldKey, token: string) => {
    setTokens((prev) => ({
      ...prev,
      [key]: prev[key].filter((t) => t !== token),
    }));
  };

  const handleClearField = (key: FieldKey) => {
    setTokens((prev) => ({ ...prev, [key]: [] }));
    setQueries((prev) => ({ ...prev, [key]: '' }));
  };

  const handleFieldChange = (key: FieldKey, value: string) => {
    setQueries((prev) => ({ ...prev, [key]: value }));
    setOpenField(key);
    loadSuggestions(key, value, tokens[key]);
  };

  const handleSelectSuggestion = (key: FieldKey, value: string) => {
    addToken(key, value);
  };

  const handleKeyDown = (key: FieldKey, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && suggestions[focusedIndex]) {
        addToken(key, suggestions[focusedIndex].value);
      } else if (queries[key].trim()) {
        addToken(key, queries[key]);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Backspace' && !queries[key] && tokens[key].length) {
      removeToken(key, tokens[key][tokens[key].length - 1]);
    }
  };

  const buildCurrentValues = (): MasterProductFilterValues => {
    const effective: TokenMap = {
      sku: [...tokens.sku],
      name: [...tokens.name],
      barcode: [...tokens.barcode],
    };
    (Object.keys(queries) as FieldKey[]).forEach((k) => {
      const q = queries[k].trim();
      if (q && !effective[k].some((t) => t.toLowerCase() === q.toLowerCase())) {
        effective[k].push(q);
      }
    });
    return {
      skus: effective.sku,
      names: effective.name,
      barcodes: effective.barcode,
      categoryId,
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
    setCategoryId('ALL');
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
            width: 72,
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
                    maxWidth: 120,
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
                  title="Xóa"
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
          {(hasValues || query) && (
            <button
              type="button"
              onClick={() => handleClearField(field.key)}
              title="Xóa toàn bộ"
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
          )}

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
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px 14px',
          marginBottom: 10,
        }}
      >
        {FIELDS.map(renderField)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 1.5fr)',
          gap: '10px 14px',
          alignItems: 'center',
          paddingTop: 2,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            Nhóm hàng:
          </span>
          <select
            value={categoryId}
            onChange={(e) => {
              const next = e.target.value;
              setCategoryId(next);
              onSearch({ ...buildCurrentValues(), categoryId: next });
            }}
            style={{
              height: 32,
              flex: 1,
              padding: '0 8px',
              borderRadius: 6,
              border: categoryId !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: categoryId !== 'ALL' ? '#0f766e' : '#1e293b',
              backgroundColor: categoryId !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <option value="ALL">-- Tất cả nhóm hàng ({categories.length}) --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
              const next = e.target.value;
              setStatus(next);
              onSearch({ ...buildCurrentValues(), statusFilter: next });
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
            <option value="ALL">-- Tất cả --</option>
            <option value="Active">Đang kinh doanh</option>
            <option value="Discontinued">Ngừng kinh doanh</option>
          </select>
        </div>

        <div
          className="so-list-filter-actions"
          style={{
            justifyContent: 'flex-end',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <button type="button" className="so-list-filter-search" onClick={handleSubmit}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          {onExport && (
            <button type="button" className="so-list-filter-reset" onClick={onExport} disabled={excelBusy}>
              <Download size={13} />
              <span>{excelBusy ? 'Đang xử lý...' : 'Xuất file'}</span>
            </button>
          )}
          {onImport && (
            <>
              <button
                type="button"
                className="so-list-filter-reset"
                onClick={() => excelFileInputRef.current?.click()}
                disabled={excelBusy}
              >
                <Upload size={13} />
                <span>Import</span>
              </button>
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImport(file);
                  event.target.value = '';
                }}
              />
            </>
          )}
          {onPrintBarcode && (
            <button type="button" className="so-list-filter-reset" onClick={onPrintBarcode}>
              <Printer size={13} />
              <span>In mã vạch</span>
            </button>
          )}
          <button type="button" className="so-list-filter-reset" onClick={handleResetClick}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterProductFilterBar;

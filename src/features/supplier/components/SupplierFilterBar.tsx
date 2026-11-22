import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import type { SupplierFilterState } from '../types/supplier.types';
import { supplierApi } from '../api/supplierApi';
import { Search, RotateCcw, X, Download } from 'lucide-react';

type FieldKey = 'code' | 'name' | 'contactPerson' | 'phone';
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
  { key: 'code', label: 'Mã NCC', placeholder: 'Nhập mã, Enter để thêm...', minWidth: 200 },
  { key: 'name', label: 'Tên NCC', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 220 },
  { key: 'contactPerson', label: 'Người LH', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 200 },
  { key: 'phone', label: 'SĐT', placeholder: 'Nhập SĐT, Enter để thêm...', minWidth: 180 },
];

const EMPTY_TOKENS: TokenMap = { code: [], name: [], contactPerson: [], phone: [] };
const EMPTY_QUERIES: QueryMap = { code: '', name: '', contactPerson: '', phone: '' };

interface Props {
  filters: SupplierFilterState;
  onSearch: (appliedFilters: SupplierFilterState) => void;
  onReset: () => void;
  onExportExcel?: () => void;
  excelBusy?: boolean;
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

function tokensFromFilters(filters: SupplierFilterState): TokenMap {
  return {
    code: uniqueTokens(filters.codes?.length ? filters.codes : filters.code ? [filters.code] : []),
    name: uniqueTokens(filters.names?.length ? filters.names : filters.name ? [filters.name] : []),
    contactPerson: uniqueTokens(
      filters.contactPersons?.length ? filters.contactPersons : filters.contactPerson ? [filters.contactPerson] : []
    ),
    phone: uniqueTokens(filters.phones?.length ? filters.phones : filters.phone ? [filters.phone] : []),
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

export const SupplierFilterBar: FC<Props> = ({
  filters,
  onSearch,
  onReset,
  onExportExcel,
  excelBusy = false,
}) => {
  const [draftFilters, setDraftFilters] = useState<SupplierFilterState>(filters);
  const [prevFilters, setPrevFilters] = useState<SupplierFilterState>(filters);
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
  const scrollChipBoxToEnd = (field: FieldKey) => {
    requestAnimationFrame(() => {
      const el = chipBoxRefs.current[field];
      if (el) el.scrollLeft = el.scrollWidth;
    });
  };

  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraftFilters(filters);
    setTokens(tokensFromFilters(filters));
    setQueries(EMPTY_QUERIES);
  }

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

  const loadSuggestions = useCallback(async (field: FieldKey, query: string, selected: string[]) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setOpenField(null);
      setLoadingField(null);
      return;
    }

    setLoadingField(field);
    try {
      const res = await supplierApi.getSuppliers({
        [field]: trimmed,
        pageIndex: 1,
        pageSize: 8,
        supplierType: '',
        debtStatus: '',
        ratingFilter: '',
        status: '',
      });

      const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
      const mapped: Suggestion[] = [];
      const seen = new Set<string>();
      for (const item of res.items) {
        const value =
          field === 'code'
            ? item.code
            : field === 'name'
              ? item.name
              : field === 'contactPerson'
                ? item.contactPerson
                : item.phone;
        if (!value?.trim()) continue;
        const key = value.toLowerCase();
        if (selectedSet.has(key) || seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: `${field}-${item.id}-${value}`,
          value,
          primary: value,
        });
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
    } catch {
      setSuggestions([]);
      setOpenField(null);
    } finally {
      setLoadingField(null);
    }
  }, []);

  const scheduleSuggestions = (field: FieldKey, value: string, selected: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        loadSuggestions(field, value, selected);
      }, 250);
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
    contactPerson: uniqueTokens([...tokens.contactPerson, queries.contactPerson]),
    phone: uniqueTokens([...tokens.phone, queries.phone]),
  });

  const buildSearchPayload = (nextTokens: TokenMap, statusOverride?: string): SupplierFilterState => ({
    ...draftFilters,
    searchTerm: '',
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    codes: nextTokens.code,
    names: nextTokens.name,
    contactPersons: nextTokens.contactPerson,
    phones: nextTokens.phone,
    supplierType: '',
    supplierIds: undefined,
    productIds: undefined,
    tags: [],
    status: statusOverride !== undefined ? statusOverride : draftFilters.status,
    pageIndex: 1,
  });

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const next = collectTokens();
    setTokens(next);
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    onSearch(buildSearchPayload(next));
  };

  const handleStatusChange = (nextStatus: string) => {
    setDraftFilters((prev) => ({ ...prev, status: nextStatus }));
    const next = collectTokens();
    setTokens(next);
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    onSearch(buildSearchPayload(next, nextStatus));
  };

  const handleResetClick = () => {
    setOpenField(null);
    setSuggestions([]);
    setTokens(EMPTY_TOKENS);
    setQueries(EMPTY_QUERIES);
    const emptyFilters: SupplierFilterState = {
      searchTerm: '',
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      codes: [],
      names: [],
      contactPersons: [],
      phones: [],
      supplierType: '',
      debtStatus: '',
      ratingFilter: '',
      status: '',
      supplierIds: undefined,
      productIds: undefined,
      tags: [],
      pageIndex: 1,
      pageSize: filters.pageSize || 15,
    };
    setDraftFilters(emptyFilters);
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
            ref={(el) => {
              chipBoxRefs.current[field.key] = el;
            }}
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
              overflowX: 'auto',
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
                  flexShrink: 0,
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
                if (query.trim()) scheduleSuggestions(field.key, query, fieldTokens);
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
              {loadingField === field.key ? (
                <div style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>Đang tải...</div>
              ) : (
                suggestions.map((item, index) => {
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

  return (
    <div ref={barRef} className="so-list-filter">
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
            Trạng thái:
          </span>
          <select
            value={draftFilters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              height: 32,
              flex: 1,
              padding: '0 8px',
              borderRadius: 6,
              border: draftFilters.status ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: draftFilters.status ? '#0f766e' : '#1e293b',
              backgroundColor: draftFilters.status ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Active">Đang hợp tác</option>
            <option value="Inactive">Ngừng hợp tác</option>
          </select>
        </div>

        <div />

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
          {onExportExcel && (
            <button
              type="button"
              className="so-list-filter-reset"
              onClick={onExportExcel}
              disabled={excelBusy}
              style={{ opacity: excelBusy ? 0.55 : 1, flexShrink: 0 }}
            >
              <Download size={13} />
              <span>{excelBusy ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
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

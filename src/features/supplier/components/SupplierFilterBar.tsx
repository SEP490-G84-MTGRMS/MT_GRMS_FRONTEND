import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import type { SupplierFilterState } from '../types/supplier.types';
import { supplierApi } from '../api/supplierApi';
import { Search, RotateCcw, X, Loader2 } from 'lucide-react';

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
  { key: 'code', label: 'Mã nhà cung cấp', placeholder: 'Nhập mã, Enter để thêm...', minWidth: 240 },
  { key: 'name', label: 'Tên nhà cung cấp', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 300 },
  { key: 'contactPerson', label: 'Người liên hệ', placeholder: 'Nhập tên, Enter để thêm...', minWidth: 250 },
  { key: 'phone', label: 'Số điện thoại', placeholder: 'Nhập SĐT, Enter để thêm...', minWidth: 230 },
];

const EMPTY_TOKENS: TokenMap = { code: [], name: [], contactPerson: [], phone: [] };
const EMPTY_QUERIES: QueryMap = { code: '', name: '', contactPerson: '', phone: '' };

interface Props {
  filters: SupplierFilterState;
  onSearch: (appliedFilters: SupplierFilterState) => void;
  onReset: () => void;
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

export const SupplierFilterBar: FC<Props> = ({ filters, onSearch, onReset }) => {
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
        category: '',
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
          secondary:
            field === 'code'
              ? item.name
              : field === 'name'
                ? item.code
                : `${item.code} · ${item.name}`,
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

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const next = collectTokens();
    setTokens(next);
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    onSearch({
      ...draftFilters,
      searchTerm: '',
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      codes: next.code,
      names: next.name,
      contactPersons: next.contactPerson,
      phones: next.phone,
      supplierIds: undefined,
      productIds: undefined,
      tags: [],
      pageIndex: 1,
    });
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
      category: '',
      debtStatus: '',
      ratingFilter: '',
      status: '',
      supplierIds: undefined,
      productIds: undefined,
      tags: [],
      pageIndex: 1,
      pageSize: filters.pageSize || 12,
    };
    setDraftFilters(emptyFilters);
    onReset();
  };

  const hasActiveFilters = Boolean(
    tokens.code.length ||
      tokens.name.length ||
      tokens.contactPerson.length ||
      tokens.phone.length ||
      queries.code.trim() ||
      queries.name.trim() ||
      queries.contactPerson.trim() ||
      queries.phone.trim() ||
      draftFilters.supplierType ||
      draftFilters.status
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const selectStyle = (isActive: boolean): React.CSSProperties => ({
    height: 32,
    padding: '0 10px',
    borderRadius: 6,
    border: isActive ? '1px solid #0d9488' : '1px solid #cbd5e1',
    fontSize: 12.5,
    fontWeight: 600,
    color: isActive ? '#0f766e' : '#334155',
    backgroundColor: isActive ? '#f0fdfa' : '#ffffff',
    cursor: 'pointer',
    outline: 'none',
  });

  return (
    <div
      ref={barRef}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 0,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
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
                flex: '1 1 320px',
                minWidth: field.minWidth,
                maxWidth: 520,
              }}
            >
              <label style={labelStyle}>{field.label}:</label>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <div
                  ref={(el) => {
                    chipBoxRefs.current[field.key] = el;
                  }}
                  className="supplier-chip-input"
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
                    onFocus={() => {
                      if (query.trim()) {
                        loadSuggestions(field.key, query, fieldTokens);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(field.key, e)}
                    style={{
                      flex: '0 0 auto',
                      minWidth: 72,
                      width: fieldTokens.length ? 88 : '100%',
                      height: 24,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 12.5,
                      color: '#0f172a',
                    }}
                  />
                </div>
                {loadingField === field.key ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                    style={{ position: 'absolute', right: 8, top: 9, color: '#0f766e' }}
                  />
                ) : hasValues || query ? (
                  <button
                    type="button"
                    onClick={() => handleClearField(field.key)}
                    title="Xóa toàn bộ giá trị của ô này"
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      width: 24,
                      height: 24,
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
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      minWidth: '100%',
                      width: Math.max(field.minWidth, 240),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Phân loại:</label>
            <select
              value={draftFilters.supplierType || ''}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierType: e.target.value }))}
              style={{ ...selectStyle(Boolean(draftFilters.supplierType)), minWidth: 150 }}
            >
              <option value="">-- Tất cả phân loại --</option>
              <option value="Goods">Hàng hóa</option>
              <option value="Service">Dịch vụ</option>
              <option value="Both">Cả hai</option>
            </select>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Trạng thái:</label>
            <select
              value={draftFilters.status || ''}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
              style={{ ...selectStyle(Boolean(draftFilters.status)), minWidth: 150 }}
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="Active">Hoạt động</option>
              <option value="Inactive">Tạm ngưng</option>
            </select>
          </div>

          {hasActiveFilters && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 4,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #ccfbf1',
                whiteSpace: 'nowrap',
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
            }}
            title="Áp dụng bộ lọc tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 32,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
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

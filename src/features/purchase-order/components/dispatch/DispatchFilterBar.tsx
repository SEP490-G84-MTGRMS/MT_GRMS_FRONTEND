import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

export type DispatchTabType =
  | 'all'
  | 'critical'
  | 'today'
  | 'later'
  | 'completed'
  | 'pending_changes';

/** Chip filter theo NCC / chi nhánh — không lọc SP (hub không có danh mục SP). */
export interface DispatchFilterValues {
  codes: string[];
  names: string[];
  branchCodes: string[];
  branchNames: string[];
  urgency: DispatchTabType;
}

export const DEFAULT_DISPATCH_FILTERS: DispatchFilterValues = {
  codes: [],
  names: [],
  branchCodes: [],
  branchNames: [],
  urgency: 'all',
};

type FieldKey = 'code' | 'name' | 'branchCode' | 'branchName';
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
  { key: 'code', label: 'Mã NCC', placeholder: 'Nhập mã NCC, Enter để thêm...' },
  { key: 'name', label: 'Tên nhà cung cấp', placeholder: 'Nhập tên NCC, Enter để thêm...' },
  { key: 'branchCode', label: 'Mã chi nhánh', placeholder: 'Nhập mã CN, Enter để thêm...' },
  { key: 'branchName', label: 'Tên chi nhánh', placeholder: 'Nhập tên CN, Enter để thêm...' },
];

const EMPTY_TOKENS: TokenMap = {
  code: [],
  name: [],
  branchCode: [],
  branchName: [],
};

const EMPTY_QUERIES: QueryMap = {
  code: '',
  name: '',
  branchCode: '',
  branchName: '',
};

export interface DispatchFilterBarProps {
  /** Bộ lọc đang áp dụng (từ page) — đồng bộ chip khi reset/apply. */
  initialValues?: DispatchFilterValues;
  /** @deprecated dùng initialValues */
  filters?: DispatchFilterValues;
  /** Pool gợi ý — page nên truyền full list (không bị thu hẹp sau khi lọc). */
  suppliers?: SupplierDispatchGroup[];
  counts: Record<DispatchTabType, number>;
  onSearch: (appliedFilters: DispatchFilterValues) => void;
  onReset: () => void;
  pendingChangeCount?: number;
  pendingChangeLineCount?: number;
  onViewPendingChanges?: () => void;
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
    branchCode: uniqueTokens(filters.branchCodes ?? []),
    branchName: uniqueTokens(filters.branchNames ?? []),
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

export const DispatchFilterBar: FC<DispatchFilterBarProps> = ({
  initialValues,
  filters,
  suppliers = [],
  counts,
  onSearch,
  onReset,
  pendingChangeCount = 0,
  pendingChangeLineCount = 0,
  onViewPendingChanges,
}) => {
  const applied = initialValues ?? filters ?? DEFAULT_DISPATCH_FILTERS;

  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(applied));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [urgency, setUrgency] = useState<DispatchTabType>(applied.urgency || 'all');

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    code: null,
    name: null,
    branchCode: null,
    branchName: null,
  });

  useEffect(() => {
    setTokens(tokensFromFilters(applied));
    setUrgency(applied.urgency || 'all');
  }, [applied]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Gộp dần NCC đã tải — gợi ý không bị thu hẹp sau khi đã lọc (giống StoreProductFilterBar). */
  const supplierSuggestPoolRef = useRef<SupplierDispatchGroup[]>([]);
  useEffect(() => {
    const map = new Map(supplierSuggestPoolRef.current.map((s) => [s.id, s]));
    for (const s of suppliers) map.set(s.id, s);
    supplierSuggestPoolRef.current = Array.from(map.values());
  }, [suppliers]);

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

      const pool =
        supplierSuggestPoolRef.current.length > 0 ? supplierSuggestPoolRef.current : suppliers;
      const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
      const mapped: Suggestion[] = [];
      const seen = new Set<string>();

      if (field === 'code') {
        for (const s of pool) {
          const val = s.code;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          // Chỉ hiện mã — không chú thích tên
          mapped.push({ id: `code-${s.id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'name') {
        for (const s of pool) {
          const val = s.name;
          if (!val?.trim()) continue;
          const key = val.toLowerCase();
          if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
          seen.add(key);
          mapped.push({ id: `name-${s.id}-${val}`, value: val, primary: val });
          if (mapped.length >= 8) break;
        }
      } else if (field === 'branchCode') {
        for (const s of pool) {
          for (const b of s.branches || []) {
            const val = b.branchCode;
            if (!val?.trim()) continue;
            const key = val.toLowerCase();
            if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
            seen.add(key);
            mapped.push({ id: `bc-${b.branchId}-${val}`, value: val, primary: val });
            if (mapped.length >= 8) break;
          }
          if (mapped.length >= 8) break;
        }
      } else if (field === 'branchName') {
        for (const s of pool) {
          for (const b of s.branches || []) {
            const val = b.branchName;
            if (!val?.trim()) continue;
            const key = val.toLowerCase();
            if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
            seen.add(key);
            mapped.push({ id: `bn-${b.branchId}-${val}`, value: val, primary: val });
            if (mapped.length >= 8) break;
          }
          if (mapped.length >= 8) break;
        }
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
    },
    [suppliers]
  );

  const handleFieldChange = (field: FieldKey, rawValue: string) => {
    if (rawValue.includes(',')) {
      const parts = rawValue
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const remainder = rawValue.endsWith(',') ? '' : parts.pop() || '';
      if (parts.length) addTokens(field, parts);
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
        addToken(field, suggestions[focusedIndex].value);
        return;
      }
      if (queries[field].trim()) {
        addToken(field, queries[field]);
      }
      return;
    }

    if (e.key === 'Backspace' && !queries[field] && tokens[field].length > 0) {
      e.preventDefault();
      removeToken(field, tokens[field][tokens[field].length - 1]);
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

  const buildCurrentValues = (): DispatchFilterValues => {
    const effective: TokenMap = {
      code: [...tokens.code],
      name: [...tokens.name],
      branchCode: [...tokens.branchCode],
      branchName: [...tokens.branchName],
    };

    (Object.keys(queries) as FieldKey[]).forEach((k) => {
      const q = queries[k].trim();
      if (q && !effective[k].some((t) => t.toLowerCase() === q.toLowerCase())) {
        effective[k].push(q);
      }
    });

    return {
      codes: effective.code,
      names: effective.name,
      branchCodes: effective.branchCode,
      branchNames: effective.branchName,
      urgency,
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
    setUrgency('all');
    setOpenField(null);
    setSuggestions([]);
    onReset();
  };

  const hasActiveFilters = Boolean(
    tokens.code.length ||
      tokens.name.length ||
      tokens.branchCode.length ||
      tokens.branchName.length ||
      queries.code.trim() ||
      queries.name.trim() ||
      queries.branchCode.trim() ||
      queries.branchName.trim() ||
      urgency !== 'all'
  );

  const safeCounts: Record<DispatchTabType, number> = {
    all: counts?.all ?? 0,
    critical: counts?.critical ?? 0,
    today: counts?.today ?? 0,
    later: counts?.later ?? 0,
    completed: counts?.completed ?? 0,
    pending_changes: counts?.pending_changes ?? 0,
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
            width: 88,
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: '#475569',
            whiteSpace: 'nowrap',
          }}
        >
          {field.label}:
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
                    maxWidth: 140,
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
                if (query.trim()) loadSuggestions(field.key, query, fieldTokens);
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

          {(hasValues || query) && (
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
          )}

          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: '100%',
                width: 280,
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
                    onClick={() => addToken(field.key, item.value)}
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
      {/* ROW 1: Mã NCC | Tên NCC | Mã CN | Tên CN */}
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

      {/* ROW 2: Trạng thái + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            <Filter size={13} color="#64748b" />
            Trạng thái:
          </label>
          <select
            value={urgency}
            onChange={(e) => {
              const newUrgency = e.target.value as DispatchTabType;
              setUrgency(newUrgency);
              const current = buildCurrentValues();
              onSearch({ ...current, urgency: newUrgency });
            }}
            className={`so-list-filter-select ${urgency !== 'all' ? 'so-list-filter-select--active' : ''}`}
            style={{
              height: 32,
              flex: 1,
              minWidth: 140,
              padding: '0 8px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
            }}
            title="Lọc theo mức độ ưu tiên hoặc trạng thái chốt PO"
          >
            <option value="all">Tất cả ({safeCounts.all})</option>
            <option value="pending_changes">
              Cần cập nhật SL ({safeCounts.pending_changes ?? 0})
            </option>
            <option value="critical">Cần chốt gấp ({safeCounts.critical})</option>
            <option value="today">Hôm nay ({safeCounts.today})</option>
            <option value="later">Đợt tới ({safeCounts.later})</option>
            <option value="completed">Đã gửi PO ({safeCounts.completed})</option>
          </select>

          {onViewPendingChanges && (
            <button
              type="button"
              onClick={onViewPendingChanges}
              title={
                pendingChangeCount > 0
                  ? `Có ${pendingChangeCount} NCC cần cập nhật SL`
                  : 'Không có NCC nào cần cập nhật số lượng'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 32,
                padding: '0 10px',
                borderRadius: 6,
                border: pendingChangeCount > 0 ? '1px solid #ea580c' : '1px solid #16a34a',
                background: pendingChangeCount > 0 ? '#ea580c' : '#16a34a',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {pendingChangeCount > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
              <span>
                {pendingChangeCount > 0
                  ? `Cần cập nhật (${pendingChangeCount}${
                      pendingChangeLineCount > 0 ? ` · ${pendingChangeLineCount}` : ''
                    })`
                  : 'SL khớp PO'}
              </span>
            </button>
          )}

          {hasActiveFilters && <span className="so-list-filter-badge">Đang lọc</span>}
        </div>

        <div
          className="so-list-filter-actions"
          style={{
            justifyContent: 'flex-end',
            width: 'max-content',
            flexWrap: 'nowrap',
            gap: 8,
            marginLeft: 0,
          }}
        >
          <button type="button" className="so-list-filter-search" onClick={() => handleSubmit()}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button type="button" className="so-list-filter-reset" onClick={handleResetClick}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchFilterBar;

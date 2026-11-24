import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, KeyboardEvent } from 'react';
import { Search, RotateCcw, X, Filter, Calendar } from 'lucide-react';
import type { PoListFilterState, PurchaseOrderStatus } from '../../types/po-list.types';
import { DEFAULT_PO_LIST_FILTERS } from '../../types/po-list.types';

type FieldKey = 'poCode' | 'supplierCode' | 'supplierName' | 'branchCode' | 'branchName';
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
  { key: 'poCode', label: 'Mã PO', placeholder: 'Nhập mã PO, Enter để tìm...' },
  { key: 'supplierCode', label: 'Mã NCC', placeholder: 'Nhập mã NCC, Enter để tìm...' },
  { key: 'supplierName', label: 'Tên NCC', placeholder: 'Nhập tên NCC, Enter để tìm...' },
  { key: 'branchCode', label: 'Mã CN', placeholder: 'Nhập mã CN, Enter để tìm...' },
  { key: 'branchName', label: 'Tên CN', placeholder: 'Nhập tên CN, Enter để tìm...' },
];

const EMPTY_TOKENS: TokenMap = {
  poCode: [],
  supplierCode: [],
  supplierName: [],
  branchCode: [],
  branchName: [],
};

const EMPTY_QUERIES: QueryMap = {
  poCode: '',
  supplierCode: '',
  supplierName: '',
  branchCode: '',
  branchName: '',
};

interface PoListFilterBarProps {
  initialValues?: PoListFilterState;
  lockBranch?: boolean;
  branches: { id: string; code: string; name: string }[];
  suppliers: { id: string; code: string; name: string }[];
  /** Pool gợi ý mã PO (từ danh sách đã tải). */
  poCodeSuggestions?: string[];
  onSearch: (applied: PoListFilterState) => void;
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

function tokensFromFilters(filters: PoListFilterState): TokenMap {
  return {
    poCode: uniqueTokens(filters.poCodes ?? []),
    supplierCode: uniqueTokens(filters.supplierCodes ?? []),
    supplierName: uniqueTokens(filters.supplierNames ?? []),
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

export const PoListFilterBar: FC<PoListFilterBarProps> = ({
  initialValues,
  lockBranch = false,
  branches = [],
  suppliers = [],
  poCodeSuggestions = [],
  onSearch,
  onReset,
}) => {
  const applied = initialValues ?? DEFAULT_PO_LIST_FILTERS;

  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(applied));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [status, setStatus] = useState<'all' | PurchaseOrderStatus>(applied.status || 'all');
  const [dateFrom, setDateFrom] = useState(applied.dateFrom || '');
  const [dateTo, setDateTo] = useState(applied.dateTo || '');

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    poCode: null,
    supplierCode: null,
    supplierName: null,
    branchCode: null,
    branchName: null,
  });

  const supplierPoolRef = useRef(suppliers);
  const branchPoolRef = useRef(branches);
  const poCodePoolRef = useRef<string[]>([]);

  useEffect(() => {
    setTokens(tokensFromFilters(applied));
    setStatus(applied.status || 'all');
    setDateFrom(applied.dateFrom || '');
    setDateTo(applied.dateTo || '');
    setQueries(EMPTY_QUERIES);
  }, [applied]);

  useEffect(() => {
    const map = new Map(supplierPoolRef.current.map((s) => [s.id, s]));
    for (const s of suppliers) map.set(s.id, s);
    supplierPoolRef.current = Array.from(map.values());
  }, [suppliers]);

  useEffect(() => {
    const map = new Map(branchPoolRef.current.map((b) => [b.id, b]));
    for (const b of branches) map.set(b.id, b);
    branchPoolRef.current = Array.from(map.values());
  }, [branches]);

  useEffect(() => {
    const seen = new Set(poCodePoolRef.current.map((c) => c.toLowerCase()));
    const next = [...poCodePoolRef.current];
    for (const code of poCodeSuggestions) {
      const key = (code || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      next.push(code.trim());
    }
    poCodePoolRef.current = next;
  }, [poCodeSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const loadSuggestions = useCallback((field: FieldKey, query: string, selected: string[]) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSuggestions([]);
      setOpenField(null);
      return;
    }

    const selectedSet = new Set(selected.map((item) => item.toLowerCase()));
    const mapped: Suggestion[] = [];
    const seen = new Set<string>();

    if (field === 'poCode') {
      const pool = poCodePoolRef.current;
      for (const code of pool) {
        if (!code?.trim()) continue;
        const key = code.toLowerCase();
        if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
        seen.add(key);
        mapped.push({ id: `po-${code}`, value: code, primary: code });
        if (mapped.length >= 8) break;
      }
      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(mapped.length > 0 ? 0 : -1);
      return;
    }

    if (field === 'supplierCode' || field === 'supplierName') {
      const pool = supplierPoolRef.current.length ? supplierPoolRef.current : suppliers;
      for (const s of pool) {
        const val = field === 'supplierCode' ? s.code : s.name;
        if (!val?.trim()) continue;
        const key = val.toLowerCase();
        if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
        seen.add(key);
        mapped.push({
          id: `${field}-${s.id}-${val}`,
          value: val,
          primary: val,
        });
        if (mapped.length >= 8) break;
      }
    } else {
      const pool = branchPoolRef.current.length ? branchPoolRef.current : branches;
      for (const b of pool) {
        const val = field === 'branchCode' ? b.code : b.name;
        if (!val?.trim()) continue;
        const key = val.toLowerCase();
        if (selectedSet.has(key) || seen.has(key) || !key.includes(trimmed)) continue;
        seen.add(key);
        mapped.push({
          id: `${field}-${b.id}-${val}`,
          value: val,
          primary: val,
        });
        if (mapped.length >= 8) break;
      }
    }

    setSuggestions(mapped);
    setOpenField(mapped.length > 0 ? field : null);
    setFocusedIndex(mapped.length > 0 ? 0 : -1);
  }, [suppliers, branches]);

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

  const buildValuesFrom = (
    tokenMap: TokenMap,
    queryMap: QueryMap,
    nextStatus: 'all' | PurchaseOrderStatus = status,
    nextDateFrom = dateFrom,
    nextDateTo = dateTo
  ): PoListFilterState => {
    const effective: TokenMap = {
      poCode: [...tokenMap.poCode],
      supplierCode: [...tokenMap.supplierCode],
      supplierName: [...tokenMap.supplierName],
      branchCode: [...tokenMap.branchCode],
      branchName: [...tokenMap.branchName],
    };

    (Object.keys(queryMap) as FieldKey[]).forEach((k) => {
      const q = queryMap[k].trim();
      if (q && !effective[k].some((t) => t.toLowerCase() === q.toLowerCase())) {
        effective[k].push(q);
      }
    });

    return {
      poCodes: effective.poCode,
      supplierCodes: effective.supplierCode,
      supplierNames: effective.supplierName,
      branchCodes: effective.branchCode,
      branchNames: effective.branchName,
      status: nextStatus,
      dateFrom: nextDateFrom,
      dateTo: nextDateTo,
      pageIndex: 1,
      pageSize: applied.pageSize || 10,
    };
  };

  const commitAndSearch = (tokenMap: TokenMap, queryMap: QueryMap = EMPTY_QUERIES) => {
    const finalValues = buildValuesFrom(tokenMap, queryMap);
    setTokens(tokensFromFilters(finalValues));
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    setSuggestions([]);
    setFocusedIndex(-1);
    onSearch(finalValues);
  };

  const handleKeyDown = (field: FieldKey, e: KeyboardEvent<HTMLInputElement>) => {
    if (lockBranch && (field === 'branchCode' || field === 'branchName')) return;
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
      // Commit draft → chip rồi tìm ngay (không cần bấm Tìm kiếm thêm)
      const nextTokens: TokenMap = {
        poCode: [...tokens.poCode],
        supplierCode: [...tokens.supplierCode],
        supplierName: [...tokens.supplierName],
        branchCode: [...tokens.branchCode],
        branchName: [...tokens.branchName],
      };
      const nextQueries: QueryMap = { ...queries, [field]: '' };

      let toAdd = '';
      if (isDropdownOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
        toAdd = suggestions[focusedIndex].value;
      } else if (queries[field].trim()) {
        toAdd = queries[field].trim();
      }

      if (toAdd) {
        nextTokens[field] = uniqueTokens([...nextTokens[field], toAdd]);
      }

      // Gộp draft các ô khác (nếu đang gõ dở)
      commitAndSearch(nextTokens, nextQueries);
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
    if (lockBranch && (field === 'branchCode' || field === 'branchName')) return;
    setTokens((prev) => ({ ...prev, [field]: [] }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    setSuggestions([]);
    setOpenField(null);
    inputRefs.current[field]?.focus();
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    commitAndSearch(tokens, queries);
  };

  const handleResetClick = () => {
    setTokens(EMPTY_TOKENS);
    setQueries(EMPTY_QUERIES);
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    setOpenField(null);
    setSuggestions([]);
    onReset();
  };

  // Chỉ hiện "Đang lọc" khi bộ lọc đã apply (không tính chữ đang gõ dở)
  const hasActiveFilters = Boolean(
    (applied.poCodes?.length ?? 0) > 0 ||
      (applied.supplierCodes?.length ?? 0) > 0 ||
      (applied.supplierNames?.length ?? 0) > 0 ||
      (applied.branchCodes?.length ?? 0) > 0 ||
      (applied.branchNames?.length ?? 0) > 0 ||
      applied.status !== 'all' ||
      applied.dateFrom ||
      applied.dateTo
  );

  const renderField = (field: FieldConfig) => {
    const fieldTokens = tokens[field.key];
    const query = queries[field.key];
    const isOpen = openField === field.key && suggestions.length > 0;
    const hasValues = fieldTokens.length > 0;
    const locked =
      lockBranch && (field.key === 'branchCode' || field.key === 'branchName');

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
          opacity: locked ? 0.75 : 1,
        }}
      >
        <label
          style={{
            width: 72,
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
            onClick={() => {
              if (!locked) inputRefs.current[field.key]?.focus();
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
              backgroundColor: locked ? '#f1f5f9' : hasValues ? '#f0fdfa' : '#ffffff',
              boxSizing: 'border-box',
              boxShadow: isOpen ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : 'none',
              cursor: locked ? 'not-allowed' : 'text',
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
              disabled={locked}
              value={query}
              placeholder={
                locked
                  ? 'Cố định theo chi nhánh'
                  : fieldTokens.length
                    ? 'Thêm giá trị...'
                    : field.placeholder
              }
              onChange={(e) => {
                if (!locked) handleFieldChange(field.key, e.target.value);
              }}
              onKeyDown={(e) => handleKeyDown(field.key, e)}
              onFocus={() => {
                if (!locked && query.trim()) loadSuggestions(field.key, query, fieldTokens);
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
      {/* ROW 1: 5 chip fields */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '10px 12px',
          marginBottom: 10,
        }}
      >
        {FIELDS.map(renderField)}
      </div>

      {/* ROW 2: Status + dates + actions */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
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
            value={status}
            onChange={(e) => {
              const next = e.target.value as 'all' | PurchaseOrderStatus;
              setStatus(next);
              const finalValues = buildValuesFrom(tokens, queries, next);
              setTokens(tokensFromFilters(finalValues));
              setQueries(EMPTY_QUERIES);
              onSearch(finalValues);
            }}
            className={`so-list-filter-select ${status !== 'all' ? 'so-list-filter-select--active' : ''}`}
            style={{
              height: 32,
              minWidth: 160,
              padding: '0 8px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <option value="all">-- Tất cả trạng thái --</option>
            <option value="PENDING_APPROVAL">Chờ nhập</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="DISPATCHED">Đã gửi NCC (DISPATCHED)</option>
            <option value="SENT">Đã gửi NCC (SENT)</option>
            <option value="CONFIRMED">NCC đã chốt</option>
            <option value="PARTIALLY_RECEIVED">Nhận 1 phần</option>
            <option value="RECEIVED">Đã nhập kho xong</option>
            <option value="COMPLETED">Hoàn tất nhập kho</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color="#64748b" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

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

export default PoListFilterBar;

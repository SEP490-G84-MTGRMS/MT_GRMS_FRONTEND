import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import type {
  SupplierReturnFilterState,
  SupplierReturnListItem,
  SupplierReturnStatus,
} from '../types/supplierReturn.types';
import '../../../styles/so-list-page.css';

export interface SupplierReturnLookupOption {
  id: string;
  code: string;
  name: string;
}

interface Props {
  initialValues: SupplierReturnFilterState;
  lockBranch?: boolean;
  suppliers: SupplierReturnLookupOption[];
  branches: SupplierReturnLookupOption[];
  items: SupplierReturnListItem[];
  onSearch: (next: SupplierReturnFilterState) => void;
  onReset: () => void;
}

type FieldKey = 'returnCode' | 'grnCode' | 'supplierCode' | 'supplierName' | 'branchName';
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

const ROW1_FIELDS: FieldConfig[] = [
  { key: 'returnCode', label: 'Mã phiếu trả', placeholder: 'Nhập mã RTV, Enter để thêm...' },
  { key: 'grnCode', label: 'Mã phiếu nhập', placeholder: 'Nhập mã GRN, Enter để thêm...' },
  { key: 'supplierCode', label: 'Mã NCC', placeholder: 'Nhập mã NCC, Enter để thêm...' },
  { key: 'supplierName', label: 'Nhà cung cấp', placeholder: 'Nhập tên NCC, Enter để thêm...' },
];

const BRANCH_FIELD: FieldConfig = {
  key: 'branchName',
  label: 'Chi nhánh',
  placeholder: 'Nhập mã/tên chi nhánh, Enter để thêm...',
};

const EMPTY_TOKENS: TokenMap = {
  returnCode: [],
  grnCode: [],
  supplierCode: [],
  supplierName: [],
  branchName: [],
};

const EMPTY_QUERIES: QueryMap = {
  returnCode: '',
  grnCode: '',
  supplierCode: '',
  supplierName: '',
  branchName: '',
};

const STATUS_OPTIONS: { value: '' | SupplierReturnStatus; label: string }[] = [
  { value: '', label: '-- Tất cả trạng thái --' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PENDING_SUPPLIER', label: 'Chờ NCC duyệt' },
  { value: 'APPROVED', label: 'Đã xác nhận' },
  { value: 'PARTIALLY_HANDED_OVER', label: 'Đã giao một phần' },
  { value: 'COMPLETED', label: 'Đã bàn giao' },
  { value: 'REJECTED', label: 'NCC từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

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

function tokensFromFilters(filters: SupplierReturnFilterState): TokenMap {
  return {
    returnCode: uniqueTokens(filters.returnCodes ?? []),
    grnCode: uniqueTokens(filters.grnCodes ?? []),
    supplierCode: uniqueTokens(filters.supplierCodes ?? []),
    supplierName: uniqueTokens(filters.supplierNames ?? []),
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

export const SupplierReturnFilterBar: FC<Props> = ({
  initialValues,
  lockBranch,
  suppliers,
  branches,
  items,
  onSearch,
  onReset,
}) => {
  const [tokens, setTokens] = useState<TokenMap>(() => tokensFromFilters(initialValues));
  const [queries, setQueries] = useState<QueryMap>(EMPTY_QUERIES);
  const [branchId, setBranchId] = useState(initialValues.branchId || '');
  const [status, setStatus] = useState<'' | SupplierReturnStatus>(initialValues.status || '');

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<FieldKey, HTMLInputElement | null>>({
    returnCode: null,
    grnCode: null,
    supplierCode: null,
    supplierName: null,
    branchName: null,
  });

  useEffect(() => {
    setTokens(tokensFromFilters(initialValues));
    setBranchId(initialValues.branchId || '');
    setStatus(initialValues.status || '');
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

      const selectedSet = new Set(selected.map((v) => v.toLowerCase()));
      const mapped: Suggestion[] = [];
      const seen = new Set<string>();

      const pushIfMatch = (id: string, value: string, primary: string) => {
        if (!value?.trim()) return;
        const key = value.toLowerCase();
        if (selectedSet.has(key) || seen.has(key)) return;
        if (!key.includes(trimmed) && !primary.toLowerCase().includes(trimmed)) return;
        seen.add(key);
        mapped.push({ id, value, primary });
      };

      if (field === 'returnCode') {
        for (const item of items) {
          pushIfMatch(`rtv-${item.id}`, item.code, item.code);
          if (mapped.length >= 8) break;
        }
      } else if (field === 'grnCode') {
        for (const item of items) {
          pushIfMatch(`grn-${item.id}-${item.goodsReceiptCode}`, item.goodsReceiptCode, item.goodsReceiptCode);
          if (mapped.length >= 8) break;
        }
      } else if (field === 'supplierCode') {
        for (const s of suppliers) {
          pushIfMatch(`supc-${s.id}`, s.code, s.name ? `${s.code} (${s.name})` : s.code);
          if (mapped.length >= 8) break;
        }
        for (const item of items) {
          if (mapped.length >= 8) break;
          pushIfMatch(
            `item-supc-${item.id}`,
            item.supplierCode,
            item.supplierName ? `${item.supplierCode} (${item.supplierName})` : item.supplierCode
          );
        }
      } else if (field === 'supplierName') {
        for (const s of suppliers) {
          pushIfMatch(`supn-${s.id}`, s.name, s.code ? `${s.name} (${s.code})` : s.name);
          if (mapped.length >= 8) break;
        }
        for (const item of items) {
          if (mapped.length >= 8) break;
          pushIfMatch(
            `item-supn-${item.id}`,
            item.supplierName,
            item.supplierCode ? `${item.supplierName} (${item.supplierCode})` : item.supplierName
          );
        }
      } else if (field === 'branchName') {
        for (const b of branches) {
          pushIfMatch(`br-${b.id}`, b.name || b.code, b.code ? `${b.code} — ${b.name}` : b.name);
          if (mapped.length >= 8) break;
        }
        for (const item of items) {
          if (mapped.length >= 8) break;
          pushIfMatch(
            `item-br-${item.id}`,
            item.branchName || item.branchCode,
            item.branchCode ? `${item.branchCode} — ${item.branchName}` : item.branchName
          );
        }
      }

      setSuggestions(mapped);
      setOpenField(mapped.length > 0 ? field : null);
      setFocusedIndex(-1);
    },
    [items, suppliers, branches]
  );

  const handleFieldChange = (field: FieldKey, value: string) => {
    setQueries((prev) => ({ ...prev, [field]: value }));
    loadSuggestions(field, value, tokens[field]);
  };

  const handleClearField = (field: FieldKey) => {
    setTokens((prev) => ({ ...prev, [field]: [] }));
    setQueries((prev) => ({ ...prev, [field]: '' }));
    if (openField === field) {
      setOpenField(null);
      setSuggestions([]);
    }
  };

  const buildMergedValues = (overrides?: Partial<SupplierReturnFilterState>): SupplierReturnFilterState => {
    const merged: TokenMap = {
      returnCode: uniqueTokens([...tokens.returnCode, ...(queries.returnCode.trim() ? [queries.returnCode] : [])]),
      grnCode: uniqueTokens([...tokens.grnCode, ...(queries.grnCode.trim() ? [queries.grnCode] : [])]),
      supplierCode: uniqueTokens([...tokens.supplierCode, ...(queries.supplierCode.trim() ? [queries.supplierCode] : [])]),
      supplierName: uniqueTokens([...tokens.supplierName, ...(queries.supplierName.trim() ? [queries.supplierName] : [])]),
      branchName: lockBranch
        ? []
        : uniqueTokens([...tokens.branchName, ...(queries.branchName.trim() ? [queries.branchName] : [])]),
    };

    return {
      ...initialValues,
      keyword: '',
      returnCodes: merged.returnCode,
      grnCodes: merged.grnCode,
      supplierCodes: merged.supplierCode,
      supplierNames: merged.supplierName,
      branchNames: merged.branchName,
      branchId: lockBranch ? branchId : '',
      supplierId: '',
      status,
      pageIndex: 1,
      ...overrides,
    };
  };

  const handleSubmit = () => {
    const next = buildMergedValues();
    setTokens({
      returnCode: next.returnCodes ?? [],
      grnCode: next.grnCodes ?? [],
      supplierCode: next.supplierCodes ?? [],
      supplierName: next.supplierNames ?? [],
      branchName: next.branchNames ?? [],
    });
    setQueries(EMPTY_QUERIES);
    setOpenField(null);
    setSuggestions([]);
    onSearch(next);
  };

  const handleResetClick = () => {
    setTokens(EMPTY_TOKENS);
    setQueries(EMPTY_QUERIES);
    setStatus('');
    if (!lockBranch) setBranchId('');
    setOpenField(null);
    setSuggestions([]);
    onReset();
  };

  const handleKeyDown = (field: FieldKey, e: KeyboardEvent<HTMLInputElement>) => {
    const isOpen = openField === field && suggestions.length > 0;
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }
    if (e.key === 'Escape') {
      setOpenField(null);
      return;
    }
    if (e.key === 'Backspace' && !queries[field] && tokens[field].length > 0) {
      const last = tokens[field][tokens[field].length - 1];
      removeToken(field, last);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
        addToken(field, suggestions[focusedIndex].value);
        return;
      }
      if (queries[field].trim()) {
        addToken(field, queries[field]);
        return;
      }
      handleSubmit();
    }
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
          minWidth: 0,
        }}
      >
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#475569',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {field.label}:
        </label>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div
            className="so-list-chip-box"
            onClick={() => inputRefs.current[field.key]?.focus()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 26px 0 8px',
              borderRadius: 6,
              border: hasValues ? '1px solid #0d9488' : '1px solid #cbd5e1',
              backgroundColor: hasValues ? '#f0fdfa' : '#ffffff',
              cursor: 'text',
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {fieldTokens.map((token) => (
              <span
                key={token}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 4,
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{token}</span>
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

  const lockedBranchLabel = lockBranch
    ? (() => {
        const hit = branches.find((b) => b.id === branchId);
        return hit ? (hit.code ? `${hit.code} — ${hit.name}` : hit.name) : branchId;
      })()
    : '';

  return (
    <div ref={containerRef} className="so-list-filter">
      {/* Row 1: 4 ô tìm kiếm tách riêng theo trường (không gộp) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px 14px',
          marginBottom: 2,
        }}
      >
        {ROW1_FIELDS.map(renderField)}
      </div>

      {/* Row 2: Chi nhánh (search chip giống Mã phiếu trả), Trạng thái + Tìm kiếm & Đặt lại */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px 14px',
          alignItems: 'center',
          paddingTop: 2,
        }}
      >
        {lockBranch ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              Chi nhánh:
            </span>
            <input
              type="text"
              readOnly
              disabled
              value={lockedBranchLabel}
              className="so-list-filter-input"
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: '#f8fafc',
                color: '#475569',
                cursor: 'not-allowed',
              }}
            />
          </div>
        ) : (
          renderField(BRANCH_FIELD)
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            Trạng thái:
          </span>
          <select
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value as '' | SupplierReturnStatus;
              setStatus(nextStatus);
              onSearch(buildMergedValues({ status: nextStatus }));
            }}
            style={{
              height: 32,
              flex: 1,
              padding: '0 8px',
              borderRadius: 6,
              border: status ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              color: status ? '#0f766e' : '#1e293b',
              backgroundColor: status ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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

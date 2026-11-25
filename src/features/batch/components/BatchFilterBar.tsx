import { useCallback, useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { Search, RotateCcw, Filter, Printer, Building2 } from 'lucide-react';
import type { BatchBranchOption, BatchFilterState, BatchStatus, UserRole } from '../types/batch.types';
import { branchApi } from '../../purchase-order/api/branchApi';
import { productApi } from '../../product/api/productApi';

export type BatchSuggestProduct = { sku: string; productName: string };

type SuggestField = 'sku' | 'productName';

type Suggestion = {
  id: string;
  value: string;
  primary: string;
  secondary?: string;
};

interface BatchFilterBarProps {
  filterInputs: BatchFilterState;
  role: UserRole;
  employeeBranchId?: string;
  suggestionProducts?: BatchSuggestProduct[];
  onFilterChange: <K extends keyof BatchFilterState>(key: K, value: BatchFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
  onPrint: () => void;
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

export const BatchFilterBar: FC<BatchFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = '',
  suggestionProducts = [],
  onFilterChange,
  onSearch,
  onReset,
  onPrint,
}) => {
  const isEmployee = role === 'employee';
  const [branches, setBranches] = useState<BatchBranchOption[]>([]);
  const [openField, setOpenField] = useState<SuggestField | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const productPoolRef = useRef<BatchSuggestProduct[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    const map = new Map(
      productPoolRef.current.map((p) => [`${p.sku.toLowerCase()}|${p.productName.toLowerCase()}`, p])
    );
    for (const p of suggestionProducts) {
      if (!p.sku?.trim() && !p.productName?.trim()) continue;
      map.set(`${(p.sku || '').toLowerCase()}|${(p.productName || '').toLowerCase()}`, p);
    }
    productPoolRef.current = Array.from(map.values());
  }, [suggestionProducts]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await branchApi.getBranches({
          keyword: '',
          branchCode: 'all',
          status: 'all',
          pageIndex: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        setBranches(
          items.map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code,
          }))
        );
      } catch {
        if (!cancelled) setBranches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenField(null);
        setSuggestions([]);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const employeeBranchName =
    branches.find((b) => b.id === employeeBranchId)?.name ||
    branches.find((b) => b.code === employeeBranchId)?.name ||
    employeeBranchId ||
    'Chi nhánh được phân công';

  const buildSuggestions = useCallback((field: SuggestField, query: string): Suggestion[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const mapped: Suggestion[] = [];
    const seen = new Set<string>();
    const pool = productPoolRef.current;

    for (const p of pool) {
      const sku = (p.sku || '').trim();
      const name = (p.productName || '').trim();

      if (field === 'sku') {
        if (!sku.toLowerCase().includes(trimmed)) continue;
        const key = sku.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: `sku-${key}`,
          value: sku,
          primary: sku,
        });
      } else {
        if (!name.toLowerCase().includes(trimmed) && !sku.toLowerCase().includes(trimmed)) continue;
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: `name-${key}`,
          value: name,
          primary: name,
          secondary: sku || undefined,
        });
      }

      if (mapped.length >= 8) break;
    }

    if (field === 'sku') {
      mapped.sort((a, b) => {
        const aSku = a.primary.toLowerCase().includes(trimmed) ? 0 : 1;
        const bSku = b.primary.toLowerCase().includes(trimmed) ? 0 : 1;
        return aSku - bSku;
      });
    }

    return mapped;
  }, []);

  const applySuggestions = useCallback((field: SuggestField, query: string) => {
    const mapped = buildSuggestions(field, query);
    setSuggestions(mapped);
    setOpenField(mapped.length > 0 ? field : null);
    setFocusedIndex(mapped.length > 0 ? 0 : -1);
  }, [buildSuggestions]);

  const loadSuggestions = useCallback(
    (field: SuggestField, query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setSuggestions([]);
        setOpenField(null);
        setFocusedIndex(-1);
        return;
      }

      applySuggestions(field, trimmed);

      // Bổ sung gợi ý từ API khi gõ ≥ 2 ký tự (catalog lớn hơn pool local)
      if (trimmed.length < 2) return;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      const seq = ++searchSeqRef.current;
      searchTimerRef.current = setTimeout(async () => {
        try {
          const page = await productApi.getProductsPaged({
            searchTerm: trimmed,
            status: 'Active',
            pageIndex: 1,
            pageSize: 30,
          });
          if (seq !== searchSeqRef.current) return;

          const map = new Map(
            productPoolRef.current.map((p) => [
              `${p.sku.toLowerCase()}|${p.productName.toLowerCase()}`,
              p,
            ])
          );
          for (const p of page.items || []) {
            const sku = (p.productCode || '').trim();
            const productName = (p.name || '').trim();
            if (!sku && !productName) continue;
            map.set(`${sku.toLowerCase()}|${productName.toLowerCase()}`, { sku, productName });
          }
          productPoolRef.current = Array.from(map.values());
          applySuggestions(field, trimmed);
        } catch {
          // giữ gợi ý local
        }
      }, 250);
    },
    [applySuggestions]
  );

  const selectSuggestion = (field: SuggestField, value: string) => {
    onFilterChange(field, value);
    setSuggestions([]);
    setOpenField(null);
    setFocusedIndex(-1);
  };

  const handleSuggestKeyDown = (field: SuggestField, e: KeyboardEvent<HTMLInputElement>) => {
    const isOpen = openField === field && suggestions.length > 0;

    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === 'Escape') {
      setOpenField(null);
      setSuggestions([]);
      setFocusedIndex(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
        selectSuggestion(field, suggestions[focusedIndex].value);
        return;
      }
      onSearch();
    }
  };

  const onEnterPlain = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  const hasActiveFilters = Boolean(
    filterInputs.productName.trim() ||
      filterInputs.sku.trim() ||
      filterInputs.batchCode.trim() ||
      filterInputs.supplierName.trim() ||
      filterInputs.keyword.trim() ||
      filterInputs.branchId !== 'ALL' ||
      filterInputs.status !== 'ALL'
  );

  const renderSuggestField = (
    field: SuggestField,
    opts: {
      id: string;
      label: string;
      labelWidth: number;
      placeholder: string;
      mono?: boolean;
      value: string;
    }
  ) => {
    const isOpen = openField === field && suggestions.length > 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <label
          htmlFor={opts.id}
          style={{
            width: opts.labelWidth,
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: '#475569',
            whiteSpace: 'nowrap',
          }}
        >
          {opts.label}
        </label>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            id={opts.id}
            className="so-list-filter-input"
            type="text"
            value={opts.value}
            autoComplete="off"
            onChange={(e) => {
              onFilterChange(field, e.target.value);
              loadSuggestions(field, e.target.value);
            }}
            onFocus={() => {
              if (opts.value.trim()) loadSuggestions(field, opts.value);
            }}
            onKeyDown={(e) => handleSuggestKeyDown(field, e)}
            placeholder={opts.placeholder}
            style={{
              width: '100%',
              height: 32,
              fontFamily: opts.mono ? 'var(--font-mono, monospace)' : undefined,
              borderColor: isOpen ? '#0d9488' : undefined,
              boxShadow: isOpen ? '0 0 0 3px rgba(13, 148, 136, 0.12)' : undefined,
            }}
          />
          {isOpen && (
            <div
              className="so-list-filter-suggest"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: '100%',
                width: 300,
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
                    onClick={() => selectSuggestion(field, item.value)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      backgroundColor: active ? '#f0fdfa' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0f172a',
                        fontFamily:
                          field === 'sku' ? 'var(--font-mono, monospace)' : undefined,
                      }}
                    >
                      {highlightMatch(item.primary, opts.value.trim())}
                    </div>
                    {item.secondary && (
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        {item.secondary}
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
  };

  return (
    <div ref={containerRef} className="so-list-filter">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px 14px',
          marginBottom: 10,
        }}
      >
        {renderSuggestField('sku', {
          id: 'batch-sku',
          label: 'Mã hàng:',
          labelWidth: 72,
          placeholder: 'Nhập mã hàng...',
          mono: true,
          value: filterInputs.sku,
        })}

        {renderSuggestField('productName', {
          id: 'batch-product-name',
          label: 'Tên SP:',
          labelWidth: 88,
          placeholder: 'Nhập tên sản phẩm...',
          value: filterInputs.productName,
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-code"
            style={{
              width: 56,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            Mã lô:
          </label>
          <input
            id="batch-code"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.batchCode}
            onChange={(e) => onFilterChange('batchCode', e.target.value)}
            onKeyDown={onEnterPlain}
            placeholder="Nhập mã lô / phiếu nhập..."
            style={{ flex: 1, minWidth: 0, height: 32, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-supplier"
            style={{
              width: 72,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            NCC:
          </label>
          <input
            id="batch-supplier"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.supplierName}
            onChange={(e) => onFilterChange('supplierName', e.target.value)}
            onKeyDown={onEnterPlain}
            placeholder="Nhập tên nhà cung cấp..."
            style={{ flex: 1, minWidth: 0, height: 32 }}
          />
        </div>
      </div>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="batch-branch"
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
              <Building2 size={13} color="#64748b" />
              Chi nhánh:
            </label>
            {isEmployee ? (
              <div
                className="so-list-filter-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 32,
                  padding: '0 10px',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  fontSize: 12.5,
                  minWidth: 140,
                }}
                title="Nhân viên chỉ xem dữ liệu chi nhánh được phân công"
              >
                {employeeBranchName}
              </div>
            ) : (
              <select
                id="batch-branch"
                className={`so-list-filter-select ${filterInputs.branchId !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
                value={filterInputs.branchId}
                onChange={(e) => onFilterChange('branchId', e.target.value)}
                style={{ height: 32, minWidth: 160, fontSize: 12.5, fontWeight: 600 }}
              >
                <option value="ALL">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.code} — ${b.name}` : b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="batch-status"
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
              id="batch-status"
              className={`so-list-filter-select ${filterInputs.status !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
              value={filterInputs.status}
              onChange={(e) => onFilterChange('status', e.target.value as 'ALL' | BatchStatus)}
              style={{ height: 32, minWidth: 160, fontSize: 12.5, fontWeight: 600 }}
            >
              <option value="ALL">-- Tất cả --</option>
              <option value="Expired">Quá hạn (≤ 0 ngày)</option>
              <option value="Critical">Khẩn cấp (≤ 3 ngày trong ngưỡng SP)</option>
              <option value="Warning">Cận hạn (theo ngưỡng SP)</option>
              <option value="Normal">An toàn (ngoài ngưỡng SP)</option>
            </select>
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
          <button type="button" className="so-list-filter-search" onClick={onSearch}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button type="button" className="so-list-filter-reset" onClick={onReset}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
          <button type="button" className="so-list-filter-reset" onClick={onPrint} title="In báo cáo">
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

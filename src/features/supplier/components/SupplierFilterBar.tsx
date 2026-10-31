import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC, FormEvent } from 'react';
import type {
  SupplierFilterState,
  SearchTag,
  SupplierSearchSuggestions,
} from '../types/supplier.types';
import { supplierApi } from '../api/supplierApi';
import {
  Search,
  RotateCcw,
  Building2,
  Package,
  User,
  Phone,
  X,
  Loader2,
  Tag,
} from 'lucide-react';

interface Props {
  filters: SupplierFilterState;
  onSearch: (appliedFilters: SupplierFilterState) => void;
  onReset: () => void;
}

export const SupplierFilterBar: FC<Props> = ({
  filters,
  onSearch,
  onReset,
}) => {
  // Draft filter state
  const [draftFilters, setDraftFilters] = useState<SupplierFilterState>(filters);
  const [prevFilters, setPrevFilters] = useState<SupplierFilterState>(filters);

  // Selected tags for multi-entity filtering
  const [selectedTags, setSelectedTags] = useState<SearchTag[]>(filters.tags || []);

  // Autocomplete search state
  const [searchInputValue, setSearchInputValue] = useState<string>(filters.searchTerm || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SupplierSearchSuggestions>({
    suppliers: [],
    products: [],
    contactPersons: [],
    phones: [],
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft state if external filters change
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraftFilters(filters);
    setSelectedTags(filters.tags || []);
    setSearchInputValue(filters.searchTerm || '');
  }

  // Handle outside click to close suggestions dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Fetch suggestions when searchInputValue changes (debounced)
  const fetchSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions({ suppliers: [], products: [], contactPersons: [], phones: [] });
      setIsDropdownOpen(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const data = await supplierApi.getSearchSuggestions(trimmed, 8);
      setSuggestions(data);
      const hasAny =
        data.suppliers.length > 0 ||
        data.products.length > 0 ||
        data.contactPersons.length > 0 ||
        data.phones.length > 0;
      setIsDropdownOpen(hasAny);
    } catch {
      setSuggestions({ suppliers: [], products: [], contactPersons: [], phones: [] });
      setIsDropdownOpen(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleSearchInputChange = (val: string) => {
    setSearchInputValue(val);
    setDraftFilters((prev) => ({ ...prev, searchTerm: val }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 250);
    } else {
      setIsDropdownOpen(false);
      setSuggestions({ suppliers: [], products: [], contactPersons: [], phones: [] });
    }
  };

  // Add tag selection
  const handleSelectSuggestion = (tag: SearchTag) => {
    if (!selectedTags.some((t) => t.id === tag.id)) {
      const nextTags = [...selectedTags, tag];
      setSelectedTags(nextTags);
      applyFilterWithTags(nextTags);
    }
    setSearchInputValue('');
    setIsDropdownOpen(false);
  };

  // Remove individual tag
  const handleRemoveTag = (tagId: string) => {
    const nextTags = selectedTags.filter((t) => t.id !== tagId);
    setSelectedTags(nextTags);
    applyFilterWithTags(nextTags);
  };

  // Clear all tags
  const handleClearAllTags = () => {
    setSelectedTags([]);
    applyFilterWithTags([]);
  };

  const applyFilterWithTags = (tags: SearchTag[]) => {
    const supplierIds = tags.filter((t) => t.type === 'supplier').map((t) => t.value);
    const productIds = tags.filter((t) => t.type === 'product').map((t) => t.value);
    const contactPersons = tags.filter((t) => t.type === 'contact').map((t) => t.value);
    const phones = tags.filter((t) => t.type === 'phone').map((t) => t.value);

    const updated: SupplierFilterState = {
      ...draftFilters,
      supplierIds: supplierIds.length ? supplierIds : undefined,
      productIds: productIds.length ? productIds : undefined,
      contactPersons: contactPersons.length ? contactPersons : undefined,
      phones: phones.length ? phones : undefined,
      tags,
      pageIndex: 1,
    };
    setDraftFilters(updated);
    onSearch(updated);
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsDropdownOpen(false);

    const supplierIds = selectedTags.filter((t) => t.type === 'supplier').map((t) => t.value);
    const productIds = selectedTags.filter((t) => t.type === 'product').map((t) => t.value);
    const contactPersons = selectedTags.filter((t) => t.type === 'contact').map((t) => t.value);
    const phones = selectedTags.filter((t) => t.type === 'phone').map((t) => t.value);

    onSearch({
      ...draftFilters,
      supplierIds: supplierIds.length ? supplierIds : undefined,
      productIds: productIds.length ? productIds : undefined,
      contactPersons: contactPersons.length ? contactPersons : undefined,
      phones: phones.length ? phones : undefined,
      tags: selectedTags,
      pageIndex: 1,
    });
  };

  const handleResetClick = () => {
    setSelectedTags([]);
    setSearchInputValue('');
    setIsDropdownOpen(false);
    const emptyFilters: SupplierFilterState = {
      searchTerm: '',
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      supplierType: '',
      category: '',
      debtStatus: '',
      ratingFilter: '',
      status: '',
      supplierIds: undefined,
      productIds: undefined,
      contactPersons: undefined,
      phones: undefined,
      tags: [],
      pageIndex: 1,
      pageSize: filters.pageSize || 12,
    };
    setDraftFilters(emptyFilters);
    onReset();
  };

  // Helper function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!text || !query.trim()) return <span>{text}</span>;
    const q = query.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                backgroundColor: '#fef08a',
                color: '#854d0e',
                fontWeight: 700,
                padding: '0 2px',
                borderRadius: 2,
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const hasActiveFilters = Boolean(
    selectedTags.length > 0 ||
    (draftFilters.code || '').trim() ||
    (draftFilters.name || '').trim() ||
    (draftFilters.contactPerson || '').trim() ||
    (draftFilters.phone || '').trim() ||
    (draftFilters.searchTerm || '').trim() ||
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
    border: isActive ? '1px solid #0066FF' : '1px solid #cbd5e1',
    fontSize: 12.5,
    fontWeight: 600,
    color: isActive ? '#0066FF' : '#334155',
    backgroundColor: isActive ? '#eff6ff' : '#ffffff',
    cursor: 'pointer',
    outline: 'none',
  });

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* ── DÒNG 1: Ô TÌM KIẾM THÔNG MINH AUTOCOMPLETE VỚI TEXT HIGHLIGHTING (REQ-SEARCH-01) ── */}
      <div style={{ position: 'relative' }} ref={searchContainerRef}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 12,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: '#64748b',
            }}
          >
            {isLoadingSuggestions ? (
              <Loader2 size={16} className="animate-spin text-blue-600" />
            ) : (
              <Search size={16} />
            )}
          </div>

          <input
            type="text"
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={() => {
              if (
                searchInputValue.trim() &&
                (suggestions.suppliers.length > 0 ||
                  suggestions.products.length > 0 ||
                  suggestions.contactPersons.length > 0 ||
                  suggestions.phones.length > 0)
              ) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              } else if (e.key === 'Escape') {
                setIsDropdownOpen(false);
              }
            }}
            placeholder="Tìm kiếm đa thực thể: Nhập từ khóa để gợi ý & chọn nhiều NCC, Sản phẩm, Người liên hệ, SĐT..."
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 38,
              paddingRight: searchInputValue ? 36 : 14,
              borderRadius: 8,
              border: isDropdownOpen ? '2px solid #0066FF' : '1px solid #cbd5e1',
              fontSize: 13.5,
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              outline: 'none',
              transition: 'all 0.15s ease',
              boxShadow: isDropdownOpen ? '0 0 0 3px rgba(0, 102, 255, 0.12)' : 'none',
            }}
          />

          {searchInputValue && (
            <button
              type="button"
              onClick={() => {
                setSearchInputValue('');
                setIsDropdownOpen(false);
                setDraftFilters((prev) => ({ ...prev, searchTerm: '' }));
              }}
              style={{
                position: 'absolute',
                right: 10,
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
              title="Xóa từ khóa"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── DROPDOWN GỢI Ý PHÂN NHÓM KÈM HIGHLIGHT KẾT QUẢ ── */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              maxHeight: 420,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            <div
              style={{
                padding: '4px 12px 6px',
                fontSize: 11.5,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Kết quả gợi ý theo từ khóa "{searchInputValue}"</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
                Nhấn để thêm vào bộ lọc đa tiêu chí
              </span>
            </div>

            {/* 1. Nhóm Nhà cung cấp */}
            {suggestions.suppliers.length > 0 && (
              <div style={{ padding: '6px 0' }}>
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0066FF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#f0f7ff',
                  }}
                >
                  <Building2 size={13} />
                  <span>NHÀ CUNG CẤP ({suggestions.suppliers.length})</span>
                </div>
                {suggestions.suppliers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() =>
                      handleSelectSuggestion({
                        id: `supplier-${s.id}`,
                        type: 'supplier',
                        value: s.id,
                        label: s.name,
                        subLabel: s.code,
                      })
                    }
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono, monospace)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          fontWeight: 600,
                        }}
                      >
                        {highlightMatch(s.code, searchInputValue)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {highlightMatch(s.name, searchInputValue)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#0066FF', fontWeight: 500 }}>+ Chọn NCC</span>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Nhóm Sản phẩm */}
            {suggestions.products.length > 0 && (
              <div style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#faf5ff',
                  }}
                >
                  <Package size={13} />
                  <span>SẢN PHẨM CUNG ỨNG ({suggestions.products.length})</span>
                </div>
                {suggestions.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() =>
                      handleSelectSuggestion({
                        id: `product-${p.id}`,
                        type: 'product',
                        value: p.id,
                        label: p.name,
                        subLabel: `SKU: ${p.sku}`,
                      })
                    }
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f3ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {highlightMatch(p.name, searchInputValue)}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', gap: 8 }}>
                        <span>Mã SKU: {highlightMatch(p.sku, searchInputValue)}</span>
                        <span>•</span>
                        <span>Cung cấp bởi: <b>{p.supplierName}</b></span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 500 }}>+ Chọn SP</span>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Nhóm Người liên hệ */}
            {suggestions.contactPersons.length > 0 && (
              <div style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#ecfdf5',
                  }}
                >
                  <User size={13} />
                  <span>NGƯỜI LIÊN HỆ ({suggestions.contactPersons.length})</span>
                </div>
                {suggestions.contactPersons.map((c, idx) => (
                  <div
                    key={`${c.supplierId}-${c.name}-${idx}`}
                    onClick={() =>
                      handleSelectSuggestion({
                        id: `contact-${c.name}`,
                        type: 'contact',
                        value: c.name,
                        label: c.name,
                        subLabel: c.supplierName,
                      })
                    }
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {highlightMatch(c.name, searchInputValue)}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                        (NCC: {c.supplierName})
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 500 }}>+ Chọn liên hệ</span>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Nhóm Số điện thoại */}
            {suggestions.phones.length > 0 && (
              <div style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#fffbeb',
                  }}
                >
                  <Phone size={13} />
                  <span>SỐ ĐIỆN THOẠI ({suggestions.phones.length})</span>
                </div>
                {suggestions.phones.map((ph, idx) => (
                  <div
                    key={`${ph.supplierId}-${ph.phone}-${idx}`}
                    onClick={() =>
                      handleSelectSuggestion({
                        id: `phone-${ph.phone}`,
                        type: 'phone',
                        value: ph.phone,
                        label: ph.phone,
                        subLabel: ph.supplierName,
                      })
                    }
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fffbeb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0f172a',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {highlightMatch(ph.phone, searchInputValue)}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                        (NCC: {ph.supplierName})
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#d97706', fontWeight: 500 }}>+ Chọn SĐT</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DÒNG 2: DANH SÁCH CÁC THẺ TAGS / CHIPS ĐÃ CHỌN (MULTI-SELECT TOKENS) ── */}
      {selectedTags.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '6px 10px',
            backgroundColor: '#f1f5f9',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#475569', fontSize: 12, fontWeight: 600 }}>
            <Tag size={13} />
            <span>Tiêu chí đang lọc ({selectedTags.length}):</span>
          </div>

          {selectedTags.map((t) => {
            let bg = '#eff6ff';
            let border = '#bfdbfe';
            let text = '#1d4ed8';
            let prefix = 'NCC:';

            if (t.type === 'product') {
              bg = '#f5f3ff';
              border = '#ddd6fe';
              text = '#6d28d9';
              prefix = 'SP:';
            } else if (t.type === 'contact') {
              bg = '#ecfdf5';
              border = '#a7f3d0';
              text = '#047857';
              prefix = 'Liên hệ:';
            } else if (t.type === 'phone') {
              bg = '#fffbeb';
              border = '#fde68a';
              text = '#b45309';
              prefix = 'SĐT:';
            }

            return (
              <span
                key={t.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 20,
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  color: text,
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontSize: 10.5, opacity: 0.85, textTransform: 'uppercase' }}>{prefix}</span>
                <span>{t.label}</span>
                {t.subLabel && <span style={{ opacity: 0.65, fontSize: 11 }}>({t.subLabel})</span>}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: text,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: 0,
                    marginLeft: 2,
                  }}
                  title="Xóa tiêu chí này"
                >
                  <X size={13} />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={handleClearAllTags}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 6px',
              marginLeft: 'auto',
              textDecoration: 'underline',
            }}
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {/* ── DÒNG 3: BỘ LỌC CƠ BẢN (Loại NCC, Trạng thái) & Nút Thao tác ── */}
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
          {/* Phân Loại NCC */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Phân loại:</label>
            <select
              value={draftFilters.supplierType || ''}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierType: e.target.value }))}
              style={{ ...selectStyle(Boolean(draftFilters.supplierType)), minWidth: 150 }}
            >
              <option value="">-- Tất cả phân loại --</option>
              <option value="Goods">📦 Hàng hóa (Goods)</option>
              <option value="Service">🛠️ Dịch vụ (Service)</option>
              <option value="Both">⚡ Cả hai (Both)</option>
            </select>
          </div>

          {/* Trạng Thái Hoạt Động */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Trạng thái:</label>
            <select
              value={draftFilters.status || ''}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
              style={{ ...selectStyle(Boolean(draftFilters.status)), minWidth: 150 }}
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="Active">🟢 Đang hoạt động</option>
              <option value="Inactive">⚪ Tạm ngưng hoạt động</option>
            </select>
          </div>

          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 4,
                backgroundColor: '#eff6ff',
                color: '#0066FF',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #bfdbfe',
                whiteSpace: 'nowrap',
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 20px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0066FF',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(0, 102, 255, 0.25)',
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
              height: 34,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
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

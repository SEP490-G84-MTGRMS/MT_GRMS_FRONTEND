import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { Package } from 'lucide-react';
import type { Product } from '../types/pos.types';

interface Props {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  placeholder?: string;
  ariaLabel?: string;
  buttonLabel?: string;
  resetTrigger?: unknown;
}

export const PosProductSearchInput: FC<Props> = ({
  products,
  onSelectProduct,
  placeholder = 'Quét Barcode, SKU, tên sản phẩm...',
  ariaLabel = 'Quét Barcode, SKU hoặc tìm tên sản phẩm',
  buttonLabel = 'Tìm kiếm',
  resetTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    setHighlightedIndex(-1);
  }, [resetTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchingProducts = useMemo(() => {
    if (!trimmedQuery) return [];
    return products.filter((p) =>
      [p.name, p.sku, p.barcode].some((val) => val?.toLowerCase().includes(trimmedQuery))
    );
  }, [products, trimmedQuery]);

  const handleSelectProductItem = (product: Product) => {
    onSelectProduct(product);
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const submitSearchQuery = () => {
    if (!trimmedQuery) return;

    const exactMatch = products.find(
      (p) =>
        p.barcode?.trim().toLowerCase() === trimmedQuery ||
        p.sku?.trim().toLowerCase() === trimmedQuery
    );
    if (exactMatch) {
      handleSelectProductItem(exactMatch);
      return;
    }

    if (highlightedIndex >= 0 && highlightedIndex < matchingProducts.length) {
      handleSelectProductItem(matchingProducts[highlightedIndex]);
      return;
    }

    if (matchingProducts.length === 1) {
      handleSelectProductItem(matchingProducts[0]);
      return;
    }

    setIsSearchDropdownOpen(true);
    if (matchingProducts.length > 1 && highlightedIndex === -1) {
      setHighlightedIndex(0);
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!trimmedQuery || matchingProducts.length === 0) return;
      setIsSearchDropdownOpen(true);
      setHighlightedIndex((prev) => (prev < matchingProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!trimmedQuery || matchingProducts.length === 0) return;
      setIsSearchDropdownOpen(true);
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matchingProducts.length - 1));
    } else if (e.key === 'Escape') {
      setIsSearchDropdownOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitSearchQuery();
    }
  };

  return (
    <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
      <form
        className="pos-barcode-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearchQuery();
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchDropdownOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (searchQuery.trim().length > 0) {
              setIsSearchDropdownOpen(true);
            }
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="pos-barcode-input"
          autoComplete="off"
        />
        <button
          type="button"
          className="pos-barcode-submit-btn"
          onClick={submitSearchQuery}
        >
          {buttonLabel}
        </button>
      </form>

      {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
        <div
          className="pos-search-dropdown"
          style={{ position: 'relative', top: 0, marginTop: 6 }}
        >
          <div className="pos-search-dropdown-header">
            <span>Kết quả tìm kiếm ({matchingProducts.length} mặt hàng)</span>
          </div>

          {matchingProducts.length > 0 ? (
            <div className="pos-search-dropdown-list">
              {matchingProducts.map((p, index) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className={`pos-search-dropdown-item ${highlightedIndex === index ? 'active' : ''}`}
                  onClick={() => handleSelectProductItem(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectProductItem(p);
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="pos-search-item-thumb" />
                  ) : (
                    <div className="pos-search-item-thumb-placeholder">
                      <Package size={20} />
                    </div>
                  )}

                  <div className="pos-search-item-details">
                    <div className="pos-search-item-name">{p.name}</div>
                    <div className="pos-search-item-meta">
                      <span className="badge-sku">Mã: {p.barcode || p.sku}</span>
                      <span>&bull;</span>
                      <span className={`badge-stock ${p.quantityOnHand <= 0 ? 'out' : ''}`}>
                        {p.quantityOnHand > 0 ? `Tồn: ${p.quantityOnHand} ${p.baseUnit}` : 'Hết hàng'}
                      </span>
                    </div>
                  </div>

                  <div className="pos-search-item-price-col">
                    <div className="pos-search-item-price">{p.basePrice.toLocaleString('vi-VN')} đ</div>
                    <div className="pos-search-item-unit">/{p.baseUnit}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pos-search-empty-state">
              <div>Không tìm thấy mặt hàng nào phù hợp với "{searchQuery}"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


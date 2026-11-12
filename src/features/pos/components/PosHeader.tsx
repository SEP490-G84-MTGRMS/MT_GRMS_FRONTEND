import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Menu,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  Receipt,
  Package,
  ArrowLeftRight,
  DoorOpen,
  ShoppingCart,
  Lock,
} from 'lucide-react';
import type { OrderTab, Product } from '../types/pos.types';
import type { ShiftDetailResponse } from '../types/posShift.types';
import { useAuthStore } from '../../../stores/useAuthStore';

interface Props {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBarcodeSubmit?: (e?: React.FormEvent) => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  tabs?: OrderTab[];
  activeTabId?: number;
  onSelectTab?: (id: number) => void;
  onCloseTab?: (id: number) => void;
  onAddTab?: () => void;
  salesMode?: 'fast' | 'normal';
  onToggleSalesMode?: (mode: 'fast' | 'normal') => void;
  onCloseShift?: () => void;
  branchName?: string;
  branches?: Array<{ id: string; name: string; address?: string }>;
  selectedBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  onOpenInventoryLookup?: () => void;
  currentShift?: ShiftDetailResponse | null;
  onOpenCashMovement?: () => void;
  onOpenShift?: () => void;
  ownerShiftMode?: 'attach' | 'shiftless' | null;
  onOpenOwnerShiftModeModal?: () => void;
}

export const PosHeader: FC<Props> = ({
  searchQuery = '',
  onSearchChange,
  onBarcodeSubmit,
  products = [],
  onSelectProduct,
  tabs = [],
  activeTabId = 1,
  onSelectTab,
  onCloseTab,
  onAddTab,
  salesMode = 'fast',
  onToggleSalesMode,
  onCloseShift,
  branchName,
  branches = [],
  selectedBranchId,
  onSelectBranch,
  onOpenInventoryLookup,
  currentShift,
  onOpenCashMovement,
  onOpenShift,
  ownerShiftMode,
  onOpenOwnerShiftModeModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';
  const roleLabel = isStoreOwner ? 'Chủ cửa hàng' : 'Nhân viên';
  const rawCashierName = user?.fullName || (isStoreOwner ? 'Trần Văn Chủ' : 'Lê Thị Thu Ngân');
  // Rút gọn phần chú thích chức vụ/cửa hàng trong ngoặc đơn để không làm tràn thanh tiêu đề
  const cashierDisplayName = rawCashierName.replace(/\s*\([^)]*\)/g, '').trim();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Autocomplete Search State
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Drag & Scroll State cho dãy Tab hóa đơn
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Lọc sản phẩm theo từ khóa tìm kiếm
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchingProducts = trimmedQuery
    ? products.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmedQuery) ||
        p.sku.toLowerCase().includes(trimmedQuery) ||
        p.barcode.toLowerCase().includes(trimmedQuery)
    )
    : [];

  const checkScrollable = useCallback(() => {
    if (tabsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsScrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [tabs.length, checkScrollable]);

  // Tự động cuộn đến tab đang chọn khi activeTabId đổi
  useEffect(() => {
    if (tabsScrollRef.current) {
      const activeEl = tabsScrollRef.current.querySelector('.pos-tab-item.active') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      setTimeout(checkScrollable, 200);
    }
  }, [activeTabId, tabs.length, checkScrollable]);

  // Cuộn ngang bằng con lăn chuột (Mouse wheel to scroll)
  const handleTabsWheel = (e: React.WheelEvent) => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollLeft += e.deltaY;
      checkScrollable();
    }
  };

  // Kéo chuột qua lại (Drag to scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDraggingTabs(true);
    setDragStartX(e.pageX - (tabsScrollRef.current?.offsetLeft || 0));
    setScrollLeftState(tabsScrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs || !tabsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (tabsScrollRef.current.offsetLeft || 0);
    const walk = (x - dragStartX) * 1.5;
    tabsScrollRef.current.scrollLeft = scrollLeftState - walk;
    checkScrollable();
  };

  const handleMouseUpOrLeave = () => {
    setIsDraggingTabs(false);
  };

  const handleScrollLeft = () => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: -160, behavior: 'smooth' });
      setTimeout(checkScrollable, 200);
    }
  };

  const handleScrollRight = () => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
      setTimeout(checkScrollable, 200);
    }
  };

  // Base path cho /pos hoặc /employee/pos
  const posBasePath = location.pathname.startsWith('/employee/pos') ? '/employee/pos' : '/pos';

  // Close hamburger dropdown & search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectProductItem = (product: Product) => {
    onSelectProduct?.(product);
    onSearchChange?.('');
    setIsSearchDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsSearchDropdownOpen(true);
      setHighlightedIndex((prev) =>
        prev < matchingProducts.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsSearchDropdownOpen(true);
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : matchingProducts.length - 1
      );
    } else if (e.key === 'Escape') {
      setIsSearchDropdownOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Kiểm tra nếu là Barcode scanner bắn chính xác hoặc SKU chính xác 100%
      const exactMatch = products.find(
        (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q
      );
      if (exactMatch) {
        handleSelectProductItem(exactMatch);
        return;
      }

      // 2. Nếu người dùng đang dùng phím mũi tên highlight 1 món
      if (highlightedIndex >= 0 && highlightedIndex < matchingProducts.length) {
        handleSelectProductItem(matchingProducts[highlightedIndex]);
        return;
      }

      // 3. Nếu chỉ có đúng 1 món duy nhất khớp kết quả
      if (matchingProducts.length === 1) {
        handleSelectProductItem(matchingProducts[0]);
        return;
      }

      // 4. Nếu có nhiều hơn 1 kết quả (vd: gõ "nước mắm"), KHÔNG tự động chọn bừa món đầu tiên,
      // mà mở dropdown để người dùng nhìn thấy danh sách và chủ động chọn!
      if (matchingProducts.length > 1) {
        setIsSearchDropdownOpen(true);
        if (highlightedIndex === -1) {
          setHighlightedIndex(0);
        }
        return;
      }

      // 5. Nếu không có món nào khớp
      if (matchingProducts.length === 0) {
        onBarcodeSubmit?.();
      }
    }
  };

  return (
    <header className="pos-header-container">
      {/* 1. HÀNG TRÊN CÙNG: Brand + Quét mã / Search + Chế độ + Thu ngân + Menu Hamburger */}
      <div className="pos-header-top-row">
        {/* Cột trái: Chi nhánh & Quầy (STORE_OWNER đổi được, EMPLOYEE cố định) */}
        <div className="pos-header-left">
          <div className="pos-header-branding" onClick={() => navigate(posBasePath)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {isStoreOwner && branches.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f766e', whiteSpace: 'nowrap', flexShrink: 0 }}>Chi nhánh:</span>
                <select
                  value={selectedBranchId || branches[0]?.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSelectBranch?.(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1.5px solid #0f766e',
                    backgroundColor: '#f0fdfa',
                    color: '#0f766e',
                    fontWeight: 700,
                    fontSize: 12.5,
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: 240,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title="Chủ tiệm chuyển đổi chi nhánh bán hàng"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="pos-header-subtitle" style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', margin: 0, whiteSpace: 'nowrap' }}>
                Chi nhánh: <b>{branchName || (user?.tenantName ? user.tenantName.split(' ')[0] + ' Ba Đình' : 'An Nhiên Mart - Chi nhánh Ba Đình')}</b>
              </div>
            )}
          </div>
        </div>

        {/* Cột giữa: Form quét Barcode / Search với Autocomplete Dropdown */}
        <div className="pos-header-center-search" ref={searchContainerRef}>
          <form
            className="pos-barcode-search-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="text"
              id="product_search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange?.(e.target.value);
                setIsSearchDropdownOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setIsSearchDropdownOpen(true);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="[F2] Quét Barcode, SKU, tên sản phẩm..."
              className="pos-barcode-input"
              autoComplete="off"
            />
            <button
              type="button"
              className="pos-barcode-submit-btn"
              onClick={() => {
                if (matchingProducts.length === 1) {
                  handleSelectProductItem(matchingProducts[0]);
                } else if (matchingProducts.length > 1) {
                  setIsSearchDropdownOpen(true);
                } else {
                  onBarcodeSubmit?.();
                }
              }}
            >
              Tìm kiếm
            </button>
          </form>

          {/* Autocomplete Dropdown hiển thị các sản phẩm gợi ý */}
          {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="pos-search-dropdown">
              <div className="pos-search-dropdown-header">
                <span>Kết quả tìm kiếm ({matchingProducts.length} mặt hàng)</span>
              </div>

              {matchingProducts.length > 0 ? (
                <div className="pos-search-dropdown-list">
                  {matchingProducts.map((p, index) => (
                    <div
                      key={p.id}
                      className={`pos-search-dropdown-item ${highlightedIndex === index ? 'active' : ''}`}
                      onClick={() => handleSelectProductItem(p)}
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

        {/* Cột phải: Chế độ bán, Thông tin thu ngân, Nút Hamburger */}
        <div className="pos-header-right-actions">
          {onToggleSalesMode && (
            <div className="pos-mode-switch">
              <button
                type="button"
                className={`pos-mode-btn ${salesMode === 'fast' ? 'active' : ''}`}
                onClick={() => onToggleSalesMode('fast')}
                title="Chế độ quét barcode nhanh"
              >
                ● Bán nhanh
              </button>
              <button
                type="button"
                className={`pos-mode-btn ${salesMode === 'normal' ? 'active' : ''}`}
                onClick={() => onToggleSalesMode('normal')}
                title="Chế độ chọn danh mục cảm ứng (F3)"
              >
                ○ Bán thường
              </button>
            </div>
          )}



          {/* Trạng thái ca làm việc cho Thu Ngân (Cashier) */}
          {!isStoreOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentShift ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 8px',
                    borderRadius: 6,
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    color: '#334155',
                  }}
                  title={`Ca đang mở: ${currentShift.shiftName}`}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <b>{currentShift.shiftCode}</b>
                </div>
              ) : (
                onOpenShift && (
                  <button
                    type="button"
                    onClick={onOpenShift}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #f59e0b',
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Chưa mở ca - Bấm để mở ca bán hàng"
                  >
                    <DoorOpen size={14} />
                    <span>Mở Ca</span>
                  </button>
                )
              )}
            </div>
          )}

          {/* Badge chế độ bán hàng cho Chủ cửa hàng / Admin */}
          {isStoreOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentShift ? (
                ownerShiftMode === 'attach' ? (
                  <button
                    type="button"
                    onClick={onOpenOwnerShiftModeModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: '#f0fdfa',
                      border: '1.5px solid #0f766e',
                      color: '#0f766e',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Đang bán vào ca ${currentShift.shiftCode} (Bỏ tiền vào ngăn kéo quầy). Bấm để đổi chế độ.`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShoppingCart size={13} color="#0f766e" /> Bán vào ca #{currentShift.shiftCode}
                    </span>
                    <span style={{ fontSize: 11, textDecoration: 'underline', color: '#0d9488' }}>[Đổi]</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenOwnerShiftModeModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid #94a3b8',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Đang bán riêng vào Két sắt (Không tính vào ca nhân viên). Bấm để đổi chế độ."
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={13} color="#475569" /> Bán riêng (Két sắt)
                    </span>
                    <span style={{ fontSize: 11, textDecoration: 'underline', color: '#64748b' }}>[Đổi]</span>
                  </button>
                )
              ) : null}
            </div>
          )}

          <div
            className="pos-cashier-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              border: isStoreOwner ? '1px solid #10b981' : '1px solid #cbd5e1',
              backgroundColor: isStoreOwner ? '#ecfdf5' : '#f8fafc',
              color: isStoreOwner ? '#065f46' : '#334155',
              fontSize: 12.5,
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={`${roleLabel}: ${rawCashierName} (${isStoreOwner ? 'Được phép bán nợ' : 'Ẩn nút bán nợ'})`}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {roleLabel}: <b>{cashierDisplayName}</b>
            </span>
          </div>

          {/* Menu Hamburger 3 gạch */}
          <div className="pos-hamburger-wrapper" ref={menuRef}>
            <button
              type="button"
              className={`pos-hamburger-btn ${isMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="Menu thao tác quầy"
              aria-label="Thao tác nhanh"
            >
              <Menu size={16} className="text-slate-700" />
              <span className="pos-hamburger-label">Thao tác</span>
            </button>

            {isMenuOpen && (
              <div className="pos-hamburger-dropdown">
                {/* Lối tắt quay lại Dashboard cho Chủ Cửa Hàng hoặc Nhân Viên */}
                {isStoreOwner ? (
                  <>
                    <button
                      type="button"
                      className="pos-dropdown-item"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/store-owner/dashboard');
                      }}
                    >
                      <ArrowLeft size={16} className="text-teal-700" />
                      <div className="item-content">
                        <div className="item-title">Về Dashboard Chủ Cửa Hàng</div>
                        <div className="item-desc">Quay lại trang tổng quan bán lẻ & quản trị</div>
                      </div>
                    </button>
                    <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="pos-dropdown-item"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/employee/schedule');
                      }}
                    >
                      <ArrowLeft size={16} className="text-teal-700" />
                      <div className="item-content">
                        <div className="item-title">Về Dashboard Nhân Viên</div>
                        <div className="item-desc">Xem lịch làm việc, bảng chấm công & đơn hàng</div>
                      </div>
                    </button>
                    <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                  </>
                )}

                <button
                  type="button"
                  className="pos-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onOpenInventoryLookup) {
                      onOpenInventoryLookup();
                    } else {
                      navigate(location.pathname.startsWith('/employee') ? '/employee/inventory-lookup' : '/pos/inventory-lookup');
                    }
                  }}
                >
                  <Layers size={16} className="text-teal-700" />
                  <div className="item-content">
                    <div className="item-title">Tra cứu tồn kho & Lô FEFO</div>
                    <div className="item-desc">Tồn đa chi nhánh, hạn dùng & chọn bán lô</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="pos-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(location.pathname.startsWith('/employee') ? '/employee/orders' : '/pos/orders');
                  }}
                >
                  <Receipt size={16} className="text-teal-700" />
                  <div className="item-content">
                    <div className="item-title">Quản lý đơn hàng & Đổi trả</div>
                    <div className="item-desc">Tra cứu hóa đơn, in lại bill & xử lý đổi trả</div>
                  </div>
                </button>

                {/* 1. Thu / Chi tiền mặt két: CHỈ dành cho Nhân viên thu ngân trực tiếp quản lý ca bán hàng */}
                {!isStoreOwner && onOpenCashMovement && (
                  <button
                    type="button"
                    className="pos-dropdown-item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (!currentShift) {
                        alert('Quầy chưa mở ca làm việc. Vui lòng mở ca trước khi lập phiếu thu/chi két.');
                        onOpenShift?.();
                        return;
                      }
                      onOpenCashMovement();
                    }}
                  >
                    <ArrowLeftRight size={16} className="text-teal-700" />
                    <div className="item-content">
                      <div className="item-title">Thu / Chi tiền mặt két</div>
                      <div className="item-desc">
                        {currentShift ? 'Lập phiếu gửi tiền, rút tiền hoặc chi phát sinh tại két' : 'Cần mở ca trước khi thu/chi két'}
                      </div>
                    </div>
                  </button>
                )}

                {!isStoreOwner && (
                  <button
                    type="button"
                    className="pos-dropdown-item highlight"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onCloseShift) {
                        onCloseShift();
                      } else {
                        navigate(location.pathname.startsWith('/employee') ? '/employee/pos/shift' : '/pos/shift');
                      }
                    }}
                  >
                    <Clock size={16} className="text-teal-700" />
                    <div className="item-content">
                      <div className="item-title">Sổ ca & Chốt ca quầy</div>
                      <div className="item-desc">Kiểm đếm két, thu chi & bàn giao ca</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. HÀNG DƯỚI: Danh sách Tab hóa đơn kéo dời xuống cân bằng + Nút + [F1] luôn nằm cố định bên ngoài */}
      {tabs.length > 0 && (
        <div className="pos-header-tabs-row">
          {/* Mũi tên điều hướng sang trái nếu tràn đơn */}
          {canScrollLeft && (
            <button
              type="button"
              className="pos-tab-nav-arrow left"
              onClick={handleScrollLeft}
              title="Cuộn sang trái"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          <div
            ref={tabsScrollRef}
            className={`pos-tabs-scroll-area ${isDraggingTabs ? 'is-dragging' : ''}`}
            onWheel={handleTabsWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onScroll={checkScrollable}
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`pos-tab-item ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => onSelectTab?.(tab.id)}
              >
                <span className="pos-tab-name">{tab.name}</span>
                {/* Dấu x đóng hóa đơn: Hiện khi có > 1 hóa đơn, hoặc hóa đơn duy nhất đang có hàng (để làm mới đơn) */}
                {(tabs.length > 1 || tab.cart.length > 0) && (
                  <button
                    type="button"
                    className="pos-tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab?.(tab.id);
                    }}
                    title={tabs.length > 1 ? 'Đóng hóa đơn' : 'Làm mới đơn (Xóa giỏ hàng)'}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mũi tên điều hướng sang phải nếu còn đơn phía sau */}
          {canScrollRight && (
            <button
              type="button"
              className="pos-tab-nav-arrow right"
              onClick={handleScrollRight}
              title="Cuộn sang phải"
            >
              <ChevronRight size={14} />
            </button>
          )}

          {/* Nút + [F1] cố định bên ngoài thanh cuộn tab để luôn hiển thị */}
          <button
            type="button"
            className="pos-add-tab-btn-outside"
            onClick={onAddTab}
            title="Mở thêm hóa đơn mới [F1]"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>[F1]</span>
          </button>
        </div>
      )}
    </header>
  );
};

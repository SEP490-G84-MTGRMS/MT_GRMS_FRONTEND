import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bookmark, Printer, Clock, Plus, ChevronLeft, ChevronRight, Layers, Receipt } from 'lucide-react';
import type { OrderTab } from '../types/pos.types';

interface Props {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBarcodeSubmit?: (e?: React.FormEvent) => void;
  tabs?: OrderTab[];
  activeTabId?: number;
  onSelectTab?: (id: number) => void;
  onCloseTab?: (id: number) => void;
  onAddTab?: () => void;
  salesMode?: 'fast' | 'normal';
  onToggleSalesMode?: (mode: 'fast' | 'normal') => void;
  onHoldOrder?: () => void;
  onPrintRecent?: () => void;
  onCloseShift?: () => void;
}

export const PosHeader: FC<Props> = ({
  searchQuery = '',
  onSearchChange,
  onBarcodeSubmit,
  tabs = [],
  activeTabId = 1,
  onSelectTab,
  onCloseTab,
  onAddTab,
  salesMode = 'fast',
  onToggleSalesMode,
  onHoldOrder,
  onPrintRecent,
  onCloseShift,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drag & Scroll State cho dãy Tab hóa đơn
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Close hamburger dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="pos-header-container">
      {/* 1. HÀNG TRÊN CÙNG: Brand + Quét mã / Search + Chế độ + Thu ngân + Menu Hamburger */}
      <div className="pos-header-top-row">
        {/* Cột trái: Tên quầy và Chi nhánh */}
        <div className="pos-header-left">
          <div className="pos-header-branding" onClick={() => navigate(posBasePath)} style={{ cursor: 'pointer' }}>
            <h1 className="pos-header-title">Quầy Bán Hàng</h1>
            <div className="pos-header-subtitle">
              Chi nhánh: <b>Chi nhánh trung tâm</b> &bull; Quầy #01
            </div>
          </div>
        </div>

        {/* Cột giữa: Form quét Barcode / Search */}
        <div className="pos-header-center-search">
          <form
            className="pos-barcode-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              onBarcodeSubmit?.(e);
            }}
          >
            <input
              type="text"
              id="product_search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="[F2] Quét Barcode, SKU, tên sản phẩm..."
              className="pos-barcode-input"
            />
            <button type="submit" className="pos-barcode-submit-btn">
              Quét mã
            </button>
          </form>
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

          <div className="pos-cashier-badge">
            Thu ngân: <b>Nguyễn Bá Sơn (NV004)</b>
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
                <button
                  type="button"
                  className="pos-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onHoldOrder?.();
                  }}
                >
                  <Bookmark size={16} className="text-teal-700" />
                  <div className="item-content">
                    <div className="item-title">Giữ đơn hàng (Recall)</div>
                    <div className="item-desc">Tạm lưu giỏ hàng hiện tại vào bộ nhớ</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="pos-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPrintRecent?.();
                  }}
                >
                  <Printer size={16} className="text-teal-700" />
                  <div className="item-content">
                    <div className="item-title">In bill gần nhất</div>
                    <div className="item-desc">Xem và in lại hóa đơn vừa thanh toán</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="pos-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(location.pathname.startsWith('/employee') ? '/employee/inventory-lookup' : '/pos/inventory-lookup');
                  }}
                >
                  <Layers size={16} className="text-teal-700" />
                  <div className="item-content">
                    <div className="item-title">Tra cứu tồn kho & Lô FEFO</div>
                    <div className="item-desc">Tồn đa chi nhánh, hạn dùng & xả hàng</div>
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
                    <div className="item-title">Quản lý hóa đơn & Đặt trước</div>
                    <div className="item-desc">Lịch sử hóa đơn, in lại bill & giữ kho</div>
                  </div>
                </button>

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
                {tabs.length > 1 && (
                  <button
                    type="button"
                    className="pos-tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab?.(tab.id);
                    }}
                    title="Đóng hóa đơn"
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

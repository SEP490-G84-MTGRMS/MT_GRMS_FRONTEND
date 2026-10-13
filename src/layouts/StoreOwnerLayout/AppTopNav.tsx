import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  DashboardIcon,
  TruckIcon,
  PackageIcon,
  BellIcon,
  ChevronRightIcon,
  MenuIcon,
  TrendingUpIcon,
} from '../../features/admin/components';

/* ─── Data ─── */

interface NavSubItem {
  label: string;
  to: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: FC<{ size?: number; color?: string }>;
  to?: string; // direct link (no dropdown)
  children?: NavSubItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    icon: DashboardIcon,
    to: '/admin/dashboard',
  },
  {
    id: 'goods',
    label: 'Hàng hóa',
    icon: PackageIcon,
    children: [
      { label: 'Sản phẩm theo NCC', to: '/store-owner/suppliers/products', badge: 'Master' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Mua hàng',
    icon: TruckIcon,
    children: [
      { label: 'Nhà cung cấp', to: '/store-owner/suppliers' },
      { label: 'Đặt hàng theo ma trận', to: '/store-owner/purchase-orders/create-matrix', badge: 'Grid' },
    ],
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icon: TrendingUpIcon,
    children: [
      { label: 'Khách hàng & Công nợ (FE-08)', to: '/store-owner/customers', badge: 'FE-08' },
      { label: 'Chi phí vận hành (FE-07)', to: '/store-owner/expenses', badge: 'FE-07' },
    ],
  },
];

/* ─── Brand Logo SVG ─── */
const BrandLogo: FC = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
      fill="url(#navBrandGrad)"
    />
    <path
      d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
      fill="#14B8A6"
      fillOpacity="0.9"
    />
    <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
    <defs>
      <linearGradient id="navBrandGrad" x1="4" y1="2" x2="24" y2="31" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0F766E" />
        <stop offset="1" stopColor="#134E4A" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Chevron Down ─── */
const ChevronDown: FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.18s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      opacity: 0.85,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Dropdown ─── */
interface DropdownProps {
  items: NavSubItem[];
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  currentPath: string;
}

const NavDropdown: FC<DropdownProps> = ({ items, isOpen, anchorRef, onClose, currentPath }) => {
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const handleClick = (e: MouseEvent) => {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: (() => {
          if (!anchorRef.current) return 110;
          const rect = anchorRef.current.getBoundingClientRect();
          return rect.bottom + 6;
        })(),
        left: (() => {
          if (!anchorRef.current) return 0;
          const rect = anchorRef.current.getBoundingClientRect();
          return rect.left;
        })(),
        zIndex: 9999,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0, 50, 150, 0.13), 0 2px 8px rgba(0, 50, 150, 0.06)',
        border: '1px solid var(--border-light)',
        padding: '8px 0',
        minWidth: 220,
        overflow: 'hidden',
      }}
      role="menu"
    >
      {items.map((item) => {
        const isActive = currentPath === item.to || currentPath.startsWith(item.to + '/');
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 18px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--blue-primary)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--blue-light)' : 'transparent',
              transition: 'all 0.14s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--bg-soft-blue)';
                e.currentTarget.style.color = 'var(--text-main)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 18,
                  borderRadius: '0 3px 3px 0',
                  backgroundColor: 'var(--blue-primary)',
                }}
              />
            )}
            <ChevronRightIcon size={13} color={isActive ? 'var(--blue-primary)' : '#bbb'} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isActive ? 'rgba(15,118,110,0.15)' : 'var(--blue-light)',
                  color: 'var(--blue-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
};

/* ─── Main TopNav Component ─── */
export const AppTopNav: FC = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const anchorRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  // Close dropdown on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const getAnchorRef = useCallback((id: string): React.RefObject<HTMLDivElement | null> => {
    if (!anchorRefs.current.has(id)) {
      anchorRefs.current.set(id, { current: null });
    }
    return anchorRefs.current.get(id)!;
  }, []);

  const toggleMenu = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  const isGroupActive = (group: NavGroup): boolean => {
    if (group.id === 'overview') {
      return (
        location.pathname === '/admin/dashboard' ||
        location.pathname === '/admin' ||
        location.pathname === '/admin/' ||
        location.pathname === '/dashboard' ||
        location.pathname === '/store-owner/dashboard' ||
        location.pathname === '/store-owner' ||
        location.pathname === '/store-owner/'
      );
    }
    if (group.to) return location.pathname === group.to || location.pathname.startsWith(group.to + '/');
    if (group.children) {
      return group.children.some(
        (c) =>
          location.pathname === c.to ||
          location.pathname.startsWith(c.to + '/') ||
          (c.to === '/store-owner/suppliers' && (location.pathname === '/admin/suppliers' || location.pathname.startsWith('/admin/suppliers/'))) ||
          (c.to === '/store-owner/suppliers/products' && (location.pathname === '/admin/suppliers/products' || location.pathname.startsWith('/admin/suppliers/products/'))) ||
          (c.to === '/store-owner/purchase-orders/create-matrix' && (location.pathname === '/admin/purchase-orders/create-matrix' || location.pathname.startsWith('/admin/purchase-orders/create-matrix/')))
      );
    }
    return false;
  };

  return (
    <>
      {/* ── Row 1: Global Header ── */}
      <div
        style={{
          height: 56,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          boxShadow: '0 1px 4px rgba(0, 40, 120, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 200,
        }}
      >
        {/* Brand */}
        <Link
          to="/admin/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
        >
          <BrandLogo />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              MT-GRMS
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
              Quản lý Chuỗi Tạp Hóa
            </div>
          </div>
        </Link>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
          {/* Tenant badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 36,
              padding: '0 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-soft-blue)',
              border: '1px solid var(--border-light)',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>🏪</span>
            <span>Mini Minh Đức</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--green-money)', display: 'inline-block' }} />
          </div>

          {/* Bell */}
          <button
            type="button"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-soft-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              color: 'var(--text-muted)',
              flexShrink: 0,
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
            title="Thông báo"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--blue-light)';
              e.currentTarget.style.color = 'var(--blue-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-soft-blue)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <BellIcon size={16} />
            <span style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--red-accent)',
              border: '1.5px solid #fff',
            }} />
          </button>

          {/* Profile */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 12px 0 4px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
              boxSizing: 'border-box',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-soft-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              SO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.15 }}>Minh Đức</span>
              <span style={{ fontSize: 10, color: 'var(--blue-primary)', fontWeight: 600, lineHeight: 1 }}>Store Owner</span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: 'none',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-soft-blue)',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
            className="topnav-hamburger"
            title="Menu"
          >
            <MenuIcon size={18} />
          </button>
        </div>
      </div>

      {/* ── Row 2: Primary Navigation bar ── */}
      <nav
        className="topnav-primary"
        style={{
          backgroundColor: 'var(--blue-primary)',
          borderBottom: '1px solid var(--blue-dark)',
          position: 'sticky',
          top: 56,
          zIndex: 190,
          boxShadow: '0 2px 8px rgba(0, 50, 150, 0.15)',
        }}
        aria-label="Điều hướng chính"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            height: 44,
            padding: '0 24px',
            gap: 4,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {NAV_GROUPS.map((group) => {
            const active = isGroupActive(group);
            const isOpen = openMenu === group.id;
            const ref = getAnchorRef(group.id);

            if (group.to) {
              // Direct link (no dropdown)
              return (
                <NavLink
                  key={group.id}
                  to={group.to}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 16px',
                    height: '100%',
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: active ? 700 : 500,
                    color: '#ffffff',
                    backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'transparent',
                    borderRadius: 0,
                    borderBottom: active ? '3px solid #ffffff' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <group.icon size={16} color="currentColor" />
                  <span>{group.label}</span>
                </NavLink>
              );
            }

            // Dropdown trigger
            return (
              <div
                key={group.id}
                ref={(el) => { ref.current = el; }}
                style={{ position: 'relative', display: 'flex', alignItems: 'stretch', height: '100%', flexShrink: 0 }}
              >
                <button
                  type="button"
                  onClick={() => toggleMenu(group.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 16px',
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: active || isOpen ? '3px solid #ffffff' : '3px solid transparent',
                    backgroundColor: active || isOpen ? 'rgba(0,0,0,0.2)' : 'transparent',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: active || isOpen ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (!active && !isOpen) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active && !isOpen) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  <group.icon size={16} color="currentColor" />
                  <span>{group.label}</span>
                  <ChevronDown open={isOpen} />
                </button>

                {group.children && (
                  <NavDropdown
                    items={group.children}
                    isOpen={isOpen}
                    anchorRef={ref}
                    onClose={() => setOpenMenu(null)}
                    currentPath={location.pathname}
                  />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            backgroundColor: 'rgba(15,23,42,0.45)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 280,
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '4px 0 24px rgba(0,50,150,0.1)',
              padding: '24px 0 32px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border-light)', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>MT-GRMS</div>
              <div style={{ fontSize: 11, color: 'var(--blue-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quản lý Chuỗi Tạp Hóa
              </div>
            </div>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} style={{ padding: '0 12px 4px' }}>
                {group.to ? (
                  <NavLink
                    to={group.to}
                    onClick={() => setMobileOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-pill)',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--blue-primary)' : 'var(--text-muted)',
                      backgroundColor: isActive ? 'var(--blue-light)' : 'transparent',
                    })}
                  >
                    <group.icon size={18} />
                    {group.label}
                  </NavLink>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px 4px' }}>
                      {group.label}
                    </div>
                    {group.children?.map((child) => {
                      const isActive = location.pathname === child.to || location.pathname.startsWith(child.to + '/');
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 14px 9px 28px',
                            borderRadius: 'var(--radius-pill)',
                            textDecoration: 'none',
                            fontSize: 13.5,
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? 'var(--blue-primary)' : 'var(--text-muted)',
                            backgroundColor: isActive ? 'var(--blue-light)' : 'transparent',
                          }}
                        >
                          <ChevronRightIcon size={13} />
                          {child.label}
                          {child.badge && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-pill)', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

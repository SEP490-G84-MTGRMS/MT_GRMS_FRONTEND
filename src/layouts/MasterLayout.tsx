import type { FC } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import '../styles/dashboard.css';

const NAV_SECTIONS = [
  {
    label: 'Bán hàng',
    items: [
      { to: '/pos', icon: '🏪', label: 'Quầy POS Bán hàng' },
      { to: '/dashboard/orders', icon: '🧾', label: 'Đơn hàng' },
    ],
  },
  {
    label: 'Kho & Mua hàng',
    items: [
      { to: '/store-owner/suppliers', icon: '🤝', label: 'Nhà Cung Cấp', badge: 'Mới' },
      { to: '/dashboard/inventory', icon: '📦', label: 'Tồn kho' },
      { to: '/dashboard/purchase-orders', icon: '📋', label: 'Đơn Nhập hàng' },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { to: '/store-owner/expenses', icon: '💸', label: 'Chi phí vận hành (FE-07)', badge: 'FE-07' },
      { to: '/dashboard/ap-ledger', icon: '💳', label: 'Công nợ NCC (AP)' },
      { to: '/dashboard/ar-ledger', icon: '💰', label: 'Công nợ KH (AR)' },
      { to: '/dashboard/cashflow', icon: '📊', label: 'Dòng tiền' },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { to: '/dashboard/products', icon: '🏷️', label: 'Sản phẩm' },
      { to: '/dashboard/customers', icon: '👥', label: 'Khách hàng' },
      { to: '/dashboard/categories', icon: '🗂️', label: 'Danh mục SP' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { to: '/dashboard/settings', icon: '⚙️', label: 'Cài đặt cửa hàng' },
    ],
  },
];

export const MasterLayout: FC = () => {
  const location = useLocation();

  // Get current page name for breadcrumb
  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentItem = allItems.find(item => location.pathname.startsWith(item.to));

  return (
    <div className="dashboard-root">
      {/* Top Header */}
      <header className="dashboard-header">
        <a href="/" className="dashboard-brand" aria-label="Trang chủ MT-GRMS">
          <div className="dashboard-brand-logo">MT</div>
          <div>
            <div className="dashboard-brand-name">MT-GRMS</div>
            <div className="dashboard-brand-sub">Quản lý Chuỗi Tạp Hóa</div>
          </div>
        </a>

        <div className="dashboard-header-right">
          <div className="dashboard-tenant-badge">🏪 Siêu thị Mini Minh Đức</div>
          <div className="dashboard-avatar" title="Tài khoản Admin">AD</div>
        </div>
      </header>

      {/* Body: Sidebar + Main */}
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="sidebar-item-badge sidebar-item-badge--blue">{item.badge}</span>
                  )}
                </NavLink>
              ))}
              {i < NAV_SECTIONS.length - 1 && <div className="sidebar-divider" />}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Breadcrumb */}
          <div className="dashboard-breadcrumb">
            <a href="/dashboard">Dashboard</a>
            {currentItem && (
              <>
                <span>›</span>
                <strong>{currentItem.label}</strong>
              </>
            )}
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

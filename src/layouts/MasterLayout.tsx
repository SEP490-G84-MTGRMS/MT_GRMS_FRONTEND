import type { FC } from 'react';
<<<<<<< HEAD
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Store } from 'lucide-react';
=======
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
      { to: '/dashboard/suppliers', icon: '🤝', label: 'Nhà Cung Cấp', badge: 'Mới' },
      { to: '/dashboard/inventory', icon: '📦', label: 'Tồn kho' },
      { to: '/dashboard/purchase-orders', icon: '📋', label: 'Đơn Nhập hàng' },
    ],
  },
  {
    label: 'Tài chính',
    items: [
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
>>>>>>> f1504be62cde29a5c3f71a0fab54e8f5c68353ef

export const MasterLayout: FC = () => {
  const location = useLocation();

  // Get current page name for breadcrumb
  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentItem = allItems.find(item => location.pathname.startsWith(item.to));

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col bg-[#f7faff]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0066ff]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-lg text-gray-900 tracking-tight leading-none">
              MT-GRMS <span className="text-[#0066ff]">Manager</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium mt-1">
              Hệ thống Quản lý Chuỗi Cửa Hàng Bán Lẻ
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0066ff] text-xs font-semibold">
            Chi nhánh Quận 1 (Trụ sở)
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
            AN
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 p-4 shrink-0 shadow-sm flex flex-col justify-between">
          <nav className="space-y-1.5 text-sm">
            <div className="font-bold text-gray-400 uppercase text-[11px] px-3 py-2 tracking-wider">
              Phân hệ Quản trị
            </div>

            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0066ff] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng quan</span>
            </NavLink>

            <NavLink
              to="/dashboard/expenses"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0066ff] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <ReceiptText className="w-4 h-4" />
              <span>Chi phí vận hành (FE-07)</span>
            </NavLink>
          </nav>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400 text-center">
            MT-GRMS v1.0 · Design KiotViet
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
=======
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

>>>>>>> f1504be62cde29a5c3f71a0fab54e8f5c68353ef
          <Outlet />
        </main>
      </div>
    </div>
  );
};

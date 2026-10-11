import type { FC } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  DashboardIcon,
  StoreIcon,
  TruckIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../features/admin/components";

interface AdminSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AdminSidebar: FC<AdminSidebarProps> = ({ isOpen = true, onToggle }) => {
  return (
    <aside className="admin-sidebar" id="adminSidebar">
      {/* Brand Header */}
      <div className="admin-sidebar-header">
        <Link
          to="/admin/dashboard"
          className="admin-brand-link"
          title="MT-GRMS Master Admin"
        >
          <div
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
                fill="url(#brandBlueGradAdminReact)"
              />
              <path
                d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
                fill="#00C2FF"
                fillOpacity="0.9"
              />
              <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
              <defs>
                <linearGradient
                  id="brandBlueGradAdminReact"
                  x1="4"
                  y1="2"
                  x2="24"
                  y2="31"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#0066FF" />
                  <stop offset="1" stopColor="#003D99" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">MT-GRMS</div>
            <div className="admin-brand-sub">Master Admin</div>
          </div>
        </Link>
        {onToggle && (
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onToggle}
            title={isOpen ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"}
            aria-label={isOpen ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"}
          >
            {isOpen ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="admin-sidebar-nav">
        <div className="admin-nav-section-title">Quản trị cốt lõi</div>

        <NavLink
          to="/admin/dashboard"
          title="Tổng quan Nền tảng"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <DashboardIcon size={19} />
          <span className="admin-nav-label">Tổng quan</span>
        </NavLink>

        <NavLink
          to="/admin/tenants"
          title="Khách hàng thuê (128 chuỗi)"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <StoreIcon size={19} />
          <span className="admin-nav-label">Khách hàng thuê</span>
          <span className="nav-badge">128</span>
        </NavLink>

        <div className="admin-nav-section-title" style={{ marginTop: 14 }}>
          Store Owner
        </div>

        <NavLink
          to="/store-owner/suppliers"
          title="Quản lý Nhà cung cấp"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <TruckIcon size={19} />
          <span className="admin-nav-label">Nhà cung cấp</span>
          <span className="nav-badge" style={{ background: "var(--blue-primary)", color: "#ffffff" }}>
            18 NCC
          </span>
        </NavLink>
      </nav>

      {/* Footer Actions */}
      <div className="admin-sidebar-footer">
        <Link
          to="/"
          className="admin-back-home-btn"
          title="Quay lại Trang Chủ Giới Thiệu"
        >
          <HomeIcon size={17} /> <span className="admin-footer-label">Về Trang Chủ</span>
        </Link>
      </div>
    </aside>
  );
};



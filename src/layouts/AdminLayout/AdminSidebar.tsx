import { useState, useRef, useEffect } from "react";
import type { FC } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Layers,
  ExternalLink,
  LogOut,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import {
  DashboardIcon,
  StoreIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../features/admin/components";
import { useAuthStore } from "../../stores/useAuthStore";

interface AdminSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AdminSidebar: FC<AdminSidebarProps> = ({
  isOpen = true,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside or Escape
  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node) &&
        accountTriggerRef.current &&
        !accountTriggerRef.current.contains(e.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    logout();
    navigate("/auth/login");
  };

  return (
    <aside className="admin-sidebar" id="adminSidebar">
      {/* Brand Header */}
      <div className="admin-sidebar-header">
        <Link
          to="/admin/dashboard"
          className="admin-brand-link"
          title="MT-GRMS SaaS Admin Portal"
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
            <div className="admin-brand-sub">SaaS Admin</div>
          </div>
        </Link>
        {onToggle && (
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onToggle}
            title={
              isOpen ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"
            }
            aria-label={
              isOpen ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"
            }
          >
            {isOpen ? (
              <ChevronLeftIcon size={14} />
            ) : (
              <ChevronRightIcon size={14} />
            )}
          </button>
        )}
      </div>

      {/* Navigation Items (Navbar dọc) */}
      <nav className="admin-sidebar-nav">
        <div className="admin-nav-section-title">Quản trị Nền tảng</div>

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
          title="Khách hàng thuê"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <StoreIcon size={19} />
          <span className="admin-nav-label">Khách hàng thuê</span>
        </NavLink>

        <NavLink
          to="/admin/subscriptions"
          title="Gói dịch vụ & Biểu phí SaaS"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <Layers size={19} />
          <span className="admin-nav-label">Gói dịch vụ SaaS</span>
        </NavLink>

        <div className="admin-nav-section-title" style={{ marginTop: 14 }}>
          Cửa hàng & Tiện ích
        </div>

        <Link
          to="/store-owner/dashboard"
          title="Xem góc nhìn Chủ tiệm Tạp hóa"
          className="admin-nav-item"
          style={{ textDecoration: "none" }}
        >
          <ExternalLink size={18} />
          <span className="admin-nav-label">Vào Tiệm Tạp Hóa</span>
        </Link>
      </nav>

      {/* Footer: User Account (Interactive Clickable) & Actions */}
      <div className="admin-sidebar-footer" style={{ position: "relative" }}>
        {/* Account Details & Logout Popover */}
        {isAccountMenuOpen && (
          <div
            ref={accountMenuRef}
            className="admin-account-popover"
            style={
              isOpen
                ? {
                    position: "absolute",
                    bottom: "calc(100% + 10px)",
                    left: 12,
                    right: 12,
                    background: "#ffffff",
                    borderRadius: 18,
                    boxShadow:
                      "0 14px 34px rgba(0, 30, 90, 0.18), 0 2px 10px rgba(0, 0, 0, 0.05)",
                    border: "1px solid var(--border-light, #EDF2F9)",
                    padding: 14,
                    zIndex: 1000,
                    boxSizing: "border-box",
                  }
                : {
                    position: "fixed",
                    bottom: 24,
                    left: 78,
                    width: 250,
                    background: "#ffffff",
                    borderRadius: 18,
                    boxShadow:
                      "0 14px 34px rgba(0, 30, 90, 0.18), 0 2px 10px rgba(0, 0, 0, 0.05)",
                    border: "1px solid var(--border-light, #EDF2F9)",
                    padding: 14,
                    zIndex: 1000,
                    boxSizing: "border-box",
                  }
            }
          >
            {/* Popover Header: Avatar & Info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                className="admin-avatar"
                style={{
                  width: 38,
                  height: 38,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                AD
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: "var(--text-main, #0F172A)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.fullName || "Super Admin"}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted, #64748B)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.email || "admin@mtgrms.vn"}
                </span>
              </div>
            </div>

            {/* Role Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "var(--radius-pill, 9999px)",
                background: "var(--blue-light, #F0F6FF)",
                color: "var(--blue-primary, #0066FF)",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 10,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <ShieldCheck size={13} />
              <span>SaaS Master Admin</span>
            </div>

            {/* Info Rows */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                padding: "9px 0",
                borderTop: "1px solid var(--border-light, #EDF2F9)",
                borderBottom: "1px solid var(--border-light, #EDF2F9)",
                marginBottom: 12,
                fontSize: 11.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "var(--text-muted, #64748B)" }}>
                  Trạng thái
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 600,
                    color: "var(--green-money, #00C853)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "var(--green-money, #00C853)",
                    }}
                  />
                  Đang hoạt động
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "var(--text-muted, #64748B)" }}>
                  Quyền hạn
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-main, #0F172A)",
                  }}
                >
                  Toàn quyền nền tảng
                </span>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="admin-popover-logout-btn"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: "var(--radius-pill, 9999px)",
                background: "#FFF0F0",
                border: "1px solid #FFD6D6",
                color: "#FF3B30",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FFE2E2";
                e.currentTarget.style.borderColor = "#FFBDBD";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFF0F0";
                e.currentTarget.style.borderColor = "#FFD6D6";
              }}
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        {/* User Account Card Trigger */}
        <div
          ref={accountTriggerRef}
          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          className={`admin-sidebar-user-card ${isAccountMenuOpen ? "active" : ""}`}
          title="Nhấn để xem thông tin tài khoản và đăng xuất"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsAccountMenuOpen((prev) => !prev);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 10px",
            background: isAccountMenuOpen
              ? "var(--blue-light, #F0F6FF)"
              : "var(--bg-soft-blue, #F7FAFF)",
            border: `1px solid ${
              isAccountMenuOpen
                ? "var(--blue-primary, #0066FF)"
                : "var(--border-light, #EDF2F9)"
            }`,
            borderRadius: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            if (!isAccountMenuOpen) {
              e.currentTarget.style.borderColor =
                "var(--blue-primary, #0066FF)";
              e.currentTarget.style.background = "#F0F6FF";
            }
          }}
          onMouseLeave={(e) => {
            if (!isAccountMenuOpen) {
              e.currentTarget.style.borderColor =
                "var(--border-light, #EDF2F9)";
              e.currentTarget.style.background = "var(--bg-soft-blue, #F7FAFF)";
            }
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
            }}
          >
            <div className="admin-avatar" style={{ flexShrink: 0 }}>
              AD
            </div>
            <div
              className="admin-user-info"
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.fullName || "Super Admin"}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--blue-primary)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Quản trị Nền tảng
              </span>
            </div>
          </div>

          <div
            className="admin-user-chevron"
            style={{
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              transition: "transform 0.15s ease",
              transform: isAccountMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronUp size={15} />
          </div>
        </div>

        <Link
          to="/"
          className="admin-back-home-btn"
          title="Quay lại Trang Chủ Giới Thiệu"
        >
          <HomeIcon size={17} />{" "}
          <span className="admin-footer-label">Về Trang Chủ</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;

import { useState, useRef, useEffect, useCallback } from "react";
import type { FC } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  DashboardIcon,
  StoreIcon,
  PackageIcon,
  BellIcon,
  SubscriptionPlanIcon,
} from "../../features/admin/components";
import { LogOut, ExternalLink } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";

interface NavSubItem {
  label: string;
  to: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: FC<{ size?: number; color?: string }>;
  to?: string;
  children?: NavSubItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Tổng quan Nền tảng",
    icon: DashboardIcon,
    to: "/admin/dashboard",
  },
  {
    id: "tenants",
    label: "Khách hàng thuê (Tenants)",
    icon: StoreIcon,
    to: "/admin/tenants",
  },
  {
    id: "subscriptions",
    label: "Gói dịch vụ SaaS",
    icon: SubscriptionPlanIcon,
    to: "/admin/subscriptions",
  },
  {
    id: "master-data",
    label: "Dữ liệu Master",
    icon: PackageIcon,
    children: [
      {
        label: "Hàng hóa mẫu toàn hệ thống",
        to: "/admin/products",
        badge: "Master",
      },
      {
        label: "Nhà cung cấp đối tác mẫu",
        to: "/admin/suppliers",
        badge: "18 NCC",
      },
      { label: "Điều chuyển kho mẫu", to: "/admin/transfers", badge: "FE-15" },
    ],
  },
];

/* ─── Brand Logo SVG ─── */
const AdminBrandLogo: FC = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 2C16 2 4 14.5 4 21C4 26.5228 8.47715 31 14 31C19.5228 31 24 26.5228 24 21C24 14.5 16 2 16 2Z"
      fill="url(#adminLogoGrad)"
    />
    <path
      d="M20 10C20 10 28 17.5 28 22C28 25.866 24.866 29 21 29C17.134 29 14 25.866 14 22C14 17.5 20 10 20 10Z"
      fill="#00C2FF"
      fillOpacity="0.95"
    />
    <circle cx="14" cy="22" r="3.5" fill="#FFFFFF" />
    <defs>
      <linearGradient
        id="adminLogoGrad"
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
);

export const AdminTopNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const isGroupActive = (group: NavGroup) => {
    if (group.to) {
      return (
        location.pathname === group.to ||
        location.pathname.startsWith(group.to + "/")
      );
    }
    if (group.children) {
      return group.children.some(
        (c) =>
          location.pathname === c.to ||
          location.pathname.startsWith(c.to + "/"),
      );
    }
    return false;
  };

  return (
    <nav
      style={{
        backgroundColor: "#0048BA", // Xanh biển đậm uy quyền chuyên biệt cho SaaS Admin
        borderBottom: "1px solid #00368C",
        position: "sticky",
        top: 0,
        zIndex: 200,
        boxShadow: "0 2px 10px rgba(0, 30, 90, 0.22)",
      }}
      aria-label="Thanh điều hướng Quản trị viên"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 50,
          padding: "0 20px",
          gap: 12,
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {/* Brand Logo & SaaS Admin Tag */}
        <Link
          to="/admin/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
            marginRight: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            <AdminBrandLogo />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                }}
              >
                MT-GRMS
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-pill, 9999px)",
                  backgroundColor: "#00C2FF",
                  color: "#003366",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                SaaS Admin
              </span>
            </div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.82)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Hệ Thống Quản Trị Nền Tảng
            </div>
          </div>
        </Link>

        {/* Admin Navigation Menus */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            height: 50,
            gap: 4,
            overflowX: "auto",
            scrollbarWidth: "none",
            flex: 1,
          }}
        >
          {ADMIN_NAV_GROUPS.map((group) => {
            const active = isGroupActive(group);
            const isOpen = openDropdown === group.id;

            if (group.to) {
              return (
                <NavLink
                  key={group.id}
                  to={group.to}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "0 14px",
                    height: "100%",
                    textDecoration: "none",
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color: "#ffffff",
                    backgroundColor: active
                      ? "rgba(0, 0, 0, 0.22)"
                      : "transparent",
                    borderBottom: active
                      ? "3px solid #00C2FF"
                      : "3px solid transparent",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    clearTimer();
                    setOpenDropdown(null);
                    if (!active)
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <group.icon size={16} color="currentColor" />
                  <span>{group.label}</span>
                  {group.id === "tenants" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "var(--radius-pill, 9999px)",
                        backgroundColor: "#00C2FF",
                        color: "#002B66",
                        marginLeft: 4,
                      }}
                    >
                      128
                    </span>
                  )}
                  {group.id === "subscriptions" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "var(--radius-pill, 9999px)",
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                        color: "#ffffff",
                        marginLeft: 4,
                      }}
                    >
                      4 gói
                    </span>
                  )}
                </NavLink>
              );
            }

            // Dropdown Menu (Dữ liệu Master)
            return (
              <div
                key={group.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "stretch",
                  height: "100%",
                }}
                onMouseEnter={() => {
                  clearTimer();
                  setOpenDropdown(group.id);
                }}
                onMouseLeave={() => {
                  clearTimer();
                  closeTimerRef.current = window.setTimeout(
                    () => setOpenDropdown(null),
                    180,
                  );
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((prev) =>
                      prev === group.id ? null : group.id,
                    )
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "0 14px",
                    height: "100%",
                    background: "none",
                    border: "none",
                    borderBottom:
                      active || isOpen
                        ? "3px solid #00C2FF"
                        : "3px solid transparent",
                    backgroundColor:
                      active || isOpen ? "rgba(0, 0, 0, 0.22)" : "transparent",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: active || isOpen ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                  }}
                >
                  <group.icon size={16} color="currentColor" />
                  <span>{group.label}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s ease",
                      opacity: 0.85,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && group.children && (
                  <div
                    style={{
                      position: "absolute",
                      top: 50,
                      left: 0,
                      backgroundColor: "#ffffff",
                      borderRadius: "0 0 16px 16px",
                      boxShadow: "0 12px 32px rgba(0, 30, 90, 0.18)",
                      border: "1px solid #E2E8F0",
                      borderTop: "none",
                      minWidth: 260,
                      padding: "8px 0",
                      zIndex: 300,
                    }}
                  >
                    {group.children.map((sub) => {
                      const isSubActive = location.pathname === sub.to;
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          onClick={() => setOpenDropdown(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "9px 18px",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: isSubActive ? 700 : 500,
                            color: isSubActive
                              ? "var(--blue-primary, #0066FF)"
                              : "#334155",
                            backgroundColor: isSubActive
                              ? "#F0F6FF"
                              : "transparent",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive)
                              e.currentTarget.style.backgroundColor = "#F8FAFC";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive)
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                          }}
                        >
                          <span>{sub.label}</span>
                          {sub.badge && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "var(--radius-pill, 9999px)",
                                backgroundColor: "#E2E8F0",
                                color: "#475569",
                              }}
                            >
                              {sub.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Nút chuyển đổi nhanh: Vào Store Owner (Tiệm Tạp Hóa) */}
          <Link
            to="/store-owner/dashboard"
            title="Chuyển sang Quầy Tiệm Tạp Hóa (Store Owner)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 32,
              alignSelf: "center",
              padding: "0 13px",
              borderRadius: "var(--radius-pill, 9999px)",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              marginLeft: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.color = "#0048BA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.color = "#ffffff";
            }}
          >
            <StoreIcon size={13} color="currentColor" />
            <span>Vào Tiệm Tạp Hóa</span>
            <ExternalLink size={11} color="currentColor" />
          </Link>
        </div>

        {/* Right Section: System Status + Notifications + Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {/* System Notification Bell */}
          <button
            type="button"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              color: "#ffffff",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
            title="Cảnh báo hệ thống SaaS"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.26)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.14)";
            }}
          >
            <BellIcon size={15} />
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "#FF3B30",
                border: "1.5px solid #0048BA",
              }}
            />
          </button>

          {/* Admin Profile Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 32,
              padding: "0 10px 0 4px",
              borderRadius: "var(--radius-pill, 9999px)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.26)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.14)";
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#ffffff",
                color: "#0048BA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              AD
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                }}
              >
                Super Admin
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "#00C2FF",
                  fontWeight: 700,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Master Admin
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
            title="Đăng xuất khỏi hệ thống"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FF3B30";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
};
export default AdminTopNav;

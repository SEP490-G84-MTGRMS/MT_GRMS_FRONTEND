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
  StoreIcon,
  SubscriptionPlanIcon,
} from "../../features/admin/components";
import { Gift } from "lucide-react";

/* ─── Data ─── */

interface NavSubItem {
  label: string;
  to: string;
  badge?: string;
  badgeType?: "red" | "blue";
}

interface NavSection {
  title: string;
  items: NavSubItem[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: FC<{ size?: number; color?: string }>;
  to?: string; // direct link (no dropdown)
  children?: NavSubItem[];
  sections?: NavSection[];
}

const UsersIcon: FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const GiftNavIcon: FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <Gift size={size} color={color} />
);

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: DashboardIcon,
    to: "/admin/dashboard",
  },
  {
    id: "goods",
    label: "Hàng hóa",
    icon: PackageIcon,
    sections: [
      {
        title: "Danh mục & Sản phẩm",
        items: [
          { label: "Danh mục hàng hóa", to: "/store-owner/products", badge: "FE-01" },
          { label: "Sản phẩm theo NCC", to: "/store-owner/suppliers/products", badge: "Master" },
          {
            label: "Thiết lập bảng giá",
            to: "/store-owner/suppliers/products?view=pricing",
          },
        ],
      },
      {
        title: "Kho & Hạn dùng (FEFO)",
        items: [
          {
            label: "Kiểm kho & Cân đối",
            to: "/store-owner/suppliers/products?view=inventory",
          },
          {
            label: "Chuyển hàng liên kho",
            to: "/store-owner/transfers",
            badge: "FE-15",
          },
        ],
      },
      {
        title: "Quy cách & Đóng gói",
        items: [
          {
            label: "Combo - Đóng gói",
            to: "/store-owner/suppliers/products?view=combos",
          },
          {
            label: "In mã vạch & Tem giá",
            to: "/store-owner/suppliers/products?view=barcodes",
          },
        ],
      },
    ],
  },
  {
    id: "purchasing",
    label: "Nhập hàng",
    icon: TruckIcon,
    sections: [
      {
        title: "Nhà cung cấp",
        items: [
          { label: "Danh sách nhà cung cấp", to: "/store-owner/suppliers" },
          {
            label: "Hóa đơn đầu vào",
            to: "/store-owner/suppliers?view=invoices",
            badge: "Mới",
            badgeType: "red",
          },
        ],
      },
      {
        title: "Đặt hàng & Nhập kho",
        items: [
          {
            label: "Đặt hàng theo chi nhánh",
            to: "/store-owner/purchase-orders/branches",
          },
          {
            label: "Đặt hàng ma trận",
            to: "/store-owner/purchase-orders/create-matrix",
            badge: "Chủ",
            badgeType: "blue",
          },
          {
            label: "Chốt đơn với nhà cung cấp",
            to: "/store-owner/purchase-orders/dispatch-hub",
            badge: "Hub",
            badgeType: "blue",
          },
          {
            label: "Danh sách đơn mua hàng (PO)",
            to: "/store-owner/purchase-orders/list",
            badge: "PO",
            badgeType: "blue",
          },
          { label: "Trả hàng nhập", to: "/store-owner/suppliers?view=returns" },
        ],
      },
      {
        title: "Dịch vụ & Tiện ích",
        items: [
          {
            label: "Chi phí mua dịch vụ",
            to: "/store-owner/expenses",
            badge: "Mới",
            badgeType: "red",
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Tài chính",
    icon: TrendingUpIcon,
    sections: [
      {
        title: "Chi phí & Vận hành",
        items: [
          {
            label: "Chi phí vận hành (FE-07)",
            to: "/store-owner/expenses",
            badge: "FE-07",
            badgeType: "red",
          },
          {
            label: "Sổ quỹ & Dòng tiền (FE-17)",
            to: "/store-owner/cashbook",
            badge: "FE-17",
          },
        ],
      },
      {
        title: "Khách hàng & Công nợ",
        items: [
          {
            label: "Khách hàng & Sổ nợ (FE-08)",
            to: "/store-owner/customers",
            badge: "FE-08",
            badgeType: "blue",
          },
          {
            label: "Công nợ nhà cung cấp",
            to: "/store-owner/suppliers?view=debt",
          },
        ],
      },
      {
        title: "Báo cáo tài chính & Thuế",
        items: [
          {
            label: "Báo cáo Lãi / Lỗ & KPIs (FE-10)",
            to: "/store-owner/reports/pnl",
            badge: "FE-10",
          },
          {
            label: "Kê khai thuế HKD (FE-19)",
            to: "/store-owner/tax-snapshots",
            badge: "FE-19",
          },
        ],
      },
    ],
  },
  {
    id: 'employees',
    label: 'Nhân viên',
    icon: UsersIcon,
    sections: [
      {
        title: "Nhân sự & Hồ sơ",
        items: [
          { label: "Danh sách nhân viên", to: "/store-owner/employees" },
          {
            label: "Hồ sơ & Hợp đồng",
            to: "/store-owner/employees?view=profiles",
          },
        ],
      },
      {
        title: "Lịch & Chấm công",
        items: [
          {
            label: "Lịch làm việc chi nhánh",
            to: "/store-owner/employees/schedule",
            badge: "Lịch",
            badgeType: "blue",
          },
          {
            label: "Bảng chấm công GPS/QR",
            to: "/store-owner/employees/attendance",
            badge: "GPS/QR",
            badgeType: "blue",
          },
        ],
      },
      {
        title: "Lương & Đãi ngộ",
        items: [
          {
            label: "Bảng tính lương tháng",
            to: "/store-owner/employees/payroll",
            badge: "Mới",
            badgeType: "red",
          },
          {
            label: "Thiết lập ca & Phụ cấp",
            to: "/store-owner/employees/schedule?view=shifts",
          },
        ],
      },
    ],
  },
  {
    id: 'promotions',
    label: 'Khuyến mãi',
    icon: GiftNavIcon,
    sections: [
      {
        title: "Chương trình ưu đãi",
        items: [
          {
            label: "Chương trình khuyến mãi",
            to: "/store-owner/promotions",
            badge: "Mới",
            badgeType: "red",
          },
          {
            label: "Khuyến mãi theo khung giờ",
            to: "/store-owner/promotions?view=flash-sale",
          },
        ],
      },
      {
        title: "Voucher & Mã giảm giá",
        items: [
          {
            label: "Danh sách Voucher & Coupon",
            to: "/store-owner/vouchers",
            badge: "Hot",
            badgeType: "blue",
          },
          {
            label: "Phát hành mã quà tặng",
            to: "/store-owner/vouchers?action=create",
          },
        ],
      },
      {
        title: "Tích điểm & Hội viên",
        items: [
          {
            label: "Thiết lập tích điểm",
            to: "/store-owner/loyalty-config",
            badge: "Xu",
            badgeType: "blue",
          },
          {
            label: "Hạng thành viên & Chiết khấu",
            to: "/store-owner/loyalty-config?view=tiers",
          },
        ],
      },
    ],
  },
  {
    id: 'subscriptions',
    label: 'Gói dịch vụ',
    icon: SubscriptionPlanIcon,
    to: '/admin/subscriptions',
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
      <linearGradient
        id="navBrandGrad"
        x1="4"
        y1="2"
        x2="24"
        y2="31"
        gradientUnits="userSpaceOnUse"
      >
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
    className="topnav-chevron"
    style={{
      transition: "transform 0.18s ease",
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      opacity: 0.85,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Dropdown ─── */
interface DropdownProps {
  items?: NavSubItem[];
  sections?: NavSection[];
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  currentPath: string;
}

const NavDropdown: FC<DropdownProps> = ({
  items,
  sections,
  isOpen,
  anchorRef,
  onClose,
  onMouseEnter,
  onMouseLeave,
  currentPath,
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 100,
    left: 0,
  });

  const updateCoords = useCallback(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [updateCoords]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose, anchorRef]);

  const isMega = Boolean(sections && sections.length > 0);
  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect && rect.bottom > 0 ? rect.bottom : coords.top;
  const rawLeft = rect && rect.left > 0 ? rect.left : coords.left;
  const maxLeft =
    typeof window !== "undefined"
      ? window.innerWidth - (isMega ? 700 : 250) - 16
      : rawLeft;
  const left = Math.max(16, Math.min(rawLeft, maxLeft));

  const checkItemActive = (to: string) => {
    const [toPath, toQuery] = to.split("?");
    const [currPath, currQuery] = currentPath.split("?");

    if (toQuery) {
      return (
        currPath === toPath && Boolean(currQuery && currQuery.includes(toQuery))
      );
    }

    if (toPath === "/store-owner/suppliers") {
      const hasOtherView = Boolean(currQuery && currQuery.includes("view="));
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !currPath.includes("/products") &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/suppliers/products") {
      const hasOtherView = Boolean(currQuery && currQuery.includes("view="));
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/expenses") {
      const hasOtherView = Boolean(
        currQuery &&
        (currQuery.includes("view=") || currQuery.includes("tab=")),
      );
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/employees") {
      const hasOtherView = Boolean(currQuery && currQuery.includes("view="));
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !currPath.includes("/schedule") &&
        !currPath.includes("/attendance") &&
        !currPath.includes("/payroll") &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/employees/schedule") {
      const hasOtherView = Boolean(currQuery && currQuery.includes("view="));
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/promotions") {
      const hasOtherView = Boolean(
        currQuery &&
          (currQuery.includes("view=") || currQuery.includes("action=")),
      );
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/vouchers") {
      const hasOtherView = Boolean(
        currQuery &&
          (currQuery.includes("view=") || currQuery.includes("action=")),
      );
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    if (toPath === "/store-owner/loyalty-config") {
      const hasOtherView = Boolean(
        currQuery &&
          (currQuery.includes("view=") || currQuery.includes("action=")),
      );
      return (
        (currPath === toPath || currPath.startsWith(toPath + "/")) &&
        !hasOtherView
      );
    }

    return currPath === toPath || currPath.startsWith(toPath + "/");
  };

  return (
    <div
      ref={dropRef}
      className={`topnav-dropdown-bridge ${isOpen ? "is-open" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 9999,
        paddingTop: 6, // Seamless gapless bridge to keep dropdown open during mouse hover
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow:
            "0 12px 36px rgba(0, 30, 90, 0.15), 0 2px 8px rgba(0, 30, 90, 0.06)",
          border: "1px solid var(--border-light)",
          padding: isMega ? "18px 24px" : "8px 0",
          minWidth: isMega ? 680 : 230,
          overflow: "hidden",
          display: isMega ? "flex" : "block",
          gap: isMega ? 20 : 0,
        }}
        role="menu"
      >
        {/* Mega Menu Layout: 3 Columns like KiotViet */}
        {isMega &&
          sections?.map((sec, secIdx) => (
            <div
              key={sec.title}
              style={{
                flex: 1,
                minWidth: 195,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                borderRight:
                  secIdx < sections.length - 1 ? "1px solid #EDF2F9" : "none",
                paddingRight: secIdx < sections.length - 1 ? 20 : 0,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#64748B",
                  padding: "2px 10px 10px",
                  lineHeight: 1.3,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const isActive = checkItemActive(item.to);
                return (
                  <NavLink
                    key={item.label + item.to}
                    to={item.to}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: "13.5px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? "var(--blue-primary)"
                        : "var(--text-main)",
                      backgroundColor: isActive
                        ? "var(--blue-light)"
                        : "transparent",
                      transition: "all 0.14s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-soft-blue)";
                        e.currentTarget.style.color = "var(--blue-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-main)";
                      }
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "var(--radius-pill)",
                          backgroundColor:
                            item.badgeType === "red"
                              ? "#FF3B30"
                              : "var(--blue-light)",
                          color:
                            item.badgeType === "red"
                              ? "#ffffff"
                              : "var(--blue-primary)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.3,
                          letterSpacing: "0.02em",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

        {/* Standard Single-Column List */}
        {!isMega &&
          items?.map((item) => {
            const isActive = checkItemActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 18px",
                  textDecoration: "none",
                  fontSize: "13.5px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--blue-primary)" : "var(--text-muted)",
                  backgroundColor: isActive
                    ? "var(--blue-light)"
                    : "transparent",
                  transition: "all 0.14s ease",
                  position: "relative",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-soft-blue)";
                    e.currentTarget.style.color = "var(--text-main)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 18,
                      borderRadius: "0 3px 3px 0",
                      backgroundColor: "var(--blue-primary)",
                    }}
                  />
                )}
                <ChevronRightIcon
                  size={13}
                  color={isActive ? "var(--blue-primary)" : "#bbb"}
                  style={{ flexShrink: 0 }}
                />
                <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: "var(--radius-pill)",
                      backgroundColor:
                        item.badgeType === "red"
                          ? "#FF3B30"
                          : isActive
                            ? "rgba(15,118,110,0.15)"
                            : "var(--blue-light)",
                      color:
                        item.badgeType === "red"
                          ? "#ffffff"
                          : "var(--blue-primary)",
                      fontFamily:
                        item.badgeType === "red"
                          ? "var(--font-sans)"
                          : "var(--font-mono)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};

/* ─── Main TopNav Component ─── */
export const AppTopNav: FC = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const anchorRefs = useRef<
    Map<string, React.RefObject<HTMLDivElement | null>>
  >(new Map());
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Close dropdown on route change and cleanup timer
  useEffect(() => {
    clearCloseTimer();
    setOpenMenu(null);
    setMobileOpen(false);
    return () => {
      clearCloseTimer();
    };
  }, [location.pathname, clearCloseTimer]);

  const getAnchorRef = useCallback(
    (id: string): React.RefObject<HTMLDivElement | null> => {
      if (!anchorRefs.current.has(id)) {
        anchorRefs.current.set(id, { current: null });
      }
      return anchorRefs.current.get(id)!;
    },
    [],
  );

  const handleMenuEnter = useCallback(
    (id: string) => {
      clearCloseTimer();
      setOpenMenu(id);
    },
    [clearCloseTimer],
  );

  const handleMenuLeave = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu(null);
    }, 180);
  }, [clearCloseTimer]);

  const toggleMenu = useCallback(
    (id: string) => {
      clearCloseTimer();
      setOpenMenu((prev) => (prev === id ? null : id));
    },
    [clearCloseTimer],
  );

  const isGroupActive = (group: NavGroup): boolean => {
    if (group.id === "overview") {
      return (
        location.pathname === "/admin/dashboard" ||
        location.pathname === "/admin" ||
        location.pathname === "/admin/" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/store-owner/dashboard" ||
        location.pathname === "/store-owner" ||
        location.pathname === "/store-owner/"
      );
    }
    if (group.id === "goods") {
      return (
        location.pathname === "/store-owner/suppliers/products" ||
        location.pathname.startsWith("/store-owner/suppliers/products/") ||
        location.pathname === "/admin/suppliers/products" ||
        location.pathname.startsWith("/admin/suppliers/products/")
      );
    }
    if (group.id === "purchasing") {
      const isSupplier =
        location.pathname === "/store-owner/suppliers" ||
        location.pathname.startsWith("/store-owner/suppliers/") ||
        location.pathname === "/admin/suppliers" ||
        location.pathname.startsWith("/admin/suppliers/");
      const isProduct =
        location.pathname === "/store-owner/suppliers/products" ||
        location.pathname.startsWith("/store-owner/suppliers/products/") ||
        location.pathname === "/admin/suppliers/products" ||
        location.pathname.startsWith("/admin/suppliers/products/");
      const isPurchaseOrder = location.pathname.includes("/purchase-orders");
      return (isSupplier && !isProduct) || isPurchaseOrder;
    }
    if (group.id === "finance") {
      return (
        location.pathname === "/store-owner/expenses" ||
        location.pathname.startsWith("/store-owner/expenses/") ||
        location.pathname === "/admin/expenses" ||
        location.pathname.startsWith("/admin/expenses/") ||
        location.pathname === "/store-owner/customers" ||
        location.pathname.startsWith("/store-owner/customers/") ||
        location.pathname === "/customers" ||
        location.pathname.startsWith("/customers/")
      );
    }
    if (group.id === "subscriptions") {
      return (
        location.pathname === "/admin/subscriptions" ||
        location.pathname.startsWith("/admin/subscriptions/") ||
        location.pathname === "/admin/plans" ||
        location.pathname.startsWith("/admin/plans/") ||
        location.pathname === "/store-owner/subscriptions" ||
        location.pathname.startsWith("/store-owner/subscriptions/")
      );
    }
    if (group.to)
      return (
        location.pathname === group.to ||
        location.pathname.startsWith(group.to + "/")
      );
    if (group.sections) {
      return group.sections.some((sec) =>
        sec.items.some(
          (c) =>
            location.pathname === c.to ||
            location.pathname.startsWith(c.to.split("?")[0] + "/"),
        ),
      );
    }
    if (group.children) {
      return group.children.some(
        (c) =>
          location.pathname === c.to ||
          location.pathname.startsWith(c.to + "/") ||
          (c.to === "/store-owner/suppliers" &&
            (location.pathname === "/admin/suppliers" ||
              location.pathname.startsWith("/admin/suppliers/"))) ||
          (c.to === "/store-owner/suppliers/products" &&
            (location.pathname === "/admin/suppliers/products" ||
              location.pathname.startsWith("/admin/suppliers/products/"))) ||
          (c.to === "/store-owner/purchase-orders/create-matrix" &&
            (location.pathname === "/admin/purchase-orders/create-matrix" ||
              location.pathname.startsWith(
                "/admin/purchase-orders/create-matrix/",
              ))),
      );
    }
    return false;
  };

  return (
    <>
      {/* ── Row 1: Global Header ── */}
      <div
        onMouseEnter={() => {
          clearCloseTimer();
          setOpenMenu(null);
        }}
        style={{
          height: 56,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
          boxShadow: "0 1px 4px rgba(0, 40, 120, 0.04)",
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}
      >
        {/* Brand */}
        <Link
          to="/admin/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <BrandLogo />
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              MT-GRMS
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--blue-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              Quản lý Chuỗi Tạp Hóa
            </div>
          </div>
        </Link>

        {/* Right actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {/* Tenant badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 36,
              padding: "0 14px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--bg-soft-blue)",
              border: "1px solid var(--border-light)",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            <StoreIcon size={14} color="var(--blue-primary)" />
            <span>Mini Minh Đức</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--green-money)",
                display: "inline-block",
              }}
            />
          </div>

          {/* Bell */}
          <button
            type="button"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-soft-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              color: "var(--text-muted)",
              flexShrink: 0,
              boxSizing: "border-box",
              transition: "all 0.15s ease",
            }}
            title="Thông báo"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--blue-light)";
              e.currentTarget.style.color = "var(--blue-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-soft-blue)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <BellIcon size={16} />
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "var(--red-accent)",
                border: "1.5px solid #fff",
              }}
            />
          </button>

          {/* Profile */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 12px 0 4px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border-light)",
              backgroundColor: "#fff",
              cursor: "pointer",
              flexShrink: 0,
              boxSizing: "border-box",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-soft-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fff";
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0F766E, #14B8A6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              SO
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.15,
                }}
              >
                Minh Đức
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--blue-primary)",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Store Owner
              </span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: "none",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-soft-blue)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              flexShrink: 0,
              boxSizing: "border-box",
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
          backgroundColor: "var(--blue-primary)",
          borderBottom: "1px solid var(--blue-dark)",
          position: "sticky",
          top: 56,
          zIndex: 190,
          boxShadow: "0 2px 8px rgba(0, 50, 150, 0.15)",
        }}
        aria-label="Điều hướng chính"
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            height: 44,
            padding: "0 24px",
            gap: 4,
            overflowX: "auto",
            scrollbarWidth: "none",
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                    height: "100%",
                    textDecoration: "none",
                    fontSize: 13.5,
                    fontFamily: "var(--font-sans)",
                    fontWeight: active ? 700 : 500,
                    color: "#ffffff",
                    backgroundColor: active ? "rgba(0,0,0,0.2)" : "transparent",
                    borderRadius: 0,
                    borderBottom: active
                      ? "3px solid #ffffff"
                      : "3px solid transparent",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    clearCloseTimer();
                    setOpenMenu(null);
                    if (!active)
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor = "transparent";
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
                id={`nav-group-${group.id}`}
                ref={(el) => {
                  ref.current = el;
                }}
                className="topnav-group"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "stretch",
                  height: "100%",
                  flexShrink: 0,
                }}
                onMouseEnter={() => handleMenuEnter(group.id)}
                onMouseOver={() => handleMenuEnter(group.id)}
                onMouseLeave={handleMenuLeave}
              >
                <button
                  type="button"
                  id={`nav-btn-${group.id}`}
                  className={`topnav-group-btn ${isOpen ? "is-open" : ""}`}
                  onClick={() => toggleMenu(group.id)}
                  onMouseEnter={() => handleMenuEnter(group.id)}
                  onMouseOver={() => handleMenuEnter(group.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                    height: "100%",
                    background: "none",
                    border: "none",
                    borderBottom:
                      active || isOpen
                        ? "3px solid #ffffff"
                        : "3px solid transparent",
                    backgroundColor:
                      active || isOpen ? "rgba(0,0,0,0.2)" : "transparent",
                    color: "#ffffff",
                    fontSize: 13.5,
                    fontWeight: active || isOpen ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                  }}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  <group.icon size={16} color="currentColor" />
                  <span>{group.label}</span>
                  <ChevronDown open={isOpen} />
                </button>

                {(group.children || group.sections) && (
                  <NavDropdown
                    items={group.children}
                    sections={group.sections}
                    isOpen={isOpen}
                    anchorRef={ref}
                    onClose={() => {
                      clearCloseTimer();
                      setOpenMenu(null);
                    }}
                    onMouseEnter={clearCloseTimer}
                    onMouseLeave={handleMenuLeave}
                    currentPath={location.pathname + location.search}
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
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            backgroundColor: "rgba(15,23,42,0.45)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 280,
              height: "100%",
              backgroundColor: "#ffffff",
              boxShadow: "4px 0 24px rgba(0,50,150,0.1)",
              padding: "24px 0 32px",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "0 20px 20px",
                borderBottom: "1px solid var(--border-light)",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text-main)",
                }}
              >
                MT-GRMS
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--blue-primary)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Quản lý Chuỗi Tạp Hóa
              </div>
            </div>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} style={{ padding: "0 12px 4px" }}>
                {group.to ? (
                  <NavLink
                    to={group.to}
                    onClick={() => setMobileOpen(false)}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 14px",
                      borderRadius: "var(--radius-pill)",
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive
                        ? "var(--blue-primary)"
                        : "var(--text-muted)",
                      backgroundColor: isActive
                        ? "var(--blue-light)"
                        : "transparent",
                    })}
                  >
                    <group.icon size={18} />
                    {group.label}
                  </NavLink>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--text-faint)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "10px 14px 4px",
                      }}
                    >
                      {group.label}
                    </div>
                    {group.sections
                      ? group.sections.map((sec) => (
                          <div key={sec.title} style={{ marginBottom: 6 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#64748b",
                                padding: "4px 14px 2px 24px",
                              }}
                            >
                              {sec.title}
                            </div>
                            {sec.items.map((child) => {
                              const isActive = (() => {
                                const [toPath, toQuery] = child.to.split("?");
                                const currPath = location.pathname;
                                const currQuery = location.search;
                                if (toQuery) {
                                  return (
                                    currPath === toPath &&
                                    currQuery.includes(toQuery)
                                  );
                                }
                                if (toPath === "/store-owner/suppliers") {
                                  const hasOtherView =
                                    currQuery.includes("view=");
                                  return (
                                    (currPath === toPath ||
                                      currPath.startsWith(toPath + "/")) &&
                                    !currPath.includes("/products") &&
                                    !hasOtherView
                                  );
                                }
                                if (
                                  toPath === "/store-owner/suppliers/products"
                                ) {
                                  const hasOtherView =
                                    currQuery.includes("view=");
                                  return (
                                    (currPath === toPath ||
                                      currPath.startsWith(toPath + "/")) &&
                                    !hasOtherView
                                  );
                                }
                                if (toPath === "/store-owner/expenses") {
                                  const hasOtherView =
                                    currQuery.includes("view=") ||
                                    currQuery.includes("tab=");
                                  return (
                                    (currPath === toPath ||
                                      currPath.startsWith(toPath + "/")) &&
                                    !hasOtherView
                                  );
                                }
                                return (
                                  currPath === toPath ||
                                  currPath.startsWith(toPath + "/")
                                );
                              })();
                              return (
                                <NavLink
                                  key={child.label + child.to}
                                  to={child.to}
                                  onClick={() => setMobileOpen(false)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "7px 14px 7px 32px",
                                    borderRadius: "var(--radius-pill)",
                                    textDecoration: "none",
                                    fontSize: 13,
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive
                                      ? "var(--blue-primary)"
                                      : "var(--text-muted)",
                                    backgroundColor: isActive
                                      ? "var(--blue-light)"
                                      : "transparent",
                                  }}
                                >
                                  <span style={{ flex: 1 }}>{child.label}</span>
                                  {child.badge && (
                                    <span
                                      style={{
                                        fontSize: 9.5,
                                        fontWeight: 700,
                                        padding: "1px 6px",
                                        borderRadius: "var(--radius-pill)",
                                        backgroundColor:
                                          child.badgeType === "red"
                                            ? "#FF3B30"
                                            : "#e0f2fe",
                                        color:
                                          child.badgeType === "red"
                                            ? "#ffffff"
                                            : "#0284c7",
                                      }}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        ))
                      : group.children?.map((child) => {
                          const isActive = (() => {
                            if (child.to === "/store-owner/suppliers") {
                              return (
                                (location.pathname === child.to ||
                                  location.pathname.startsWith(
                                    child.to + "/",
                                  )) &&
                                !location.pathname.includes("/products")
                              );
                            }
                            return (
                              location.pathname === child.to ||
                              location.pathname.startsWith(child.to + "/")
                            );
                          })();
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={() => setMobileOpen(false)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 14px 9px 28px",
                                borderRadius: "var(--radius-pill)",
                                textDecoration: "none",
                                fontSize: 13.5,
                                fontWeight: isActive ? 700 : 500,
                                color: isActive
                                  ? "var(--blue-primary)"
                                  : "var(--text-muted)",
                                backgroundColor: isActive
                                  ? "var(--blue-light)"
                                  : "transparent",
                              }}
                            >
                              <ChevronRightIcon size={13} />
                              {child.label}
                              {child.badge && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-pill)",
                                    backgroundColor: "#e0f2fe",
                                    color: "#0284c7",
                                  }}
                                >
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

import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from "react";
import type { FC, RefObject } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  DashboardIcon,
  TruckIcon,
  PackageIcon,
  ChevronRightIcon,
  MenuIcon,
  TrendingUpIcon,
} from "../../features/admin/components";
import {
  Gift,
  MessageCircle,
  SquarePen,
  Settings,
  User,
  Store,
  LogOut,
  ChevronRight,
  Wallet,
  FileText,
  CreditCard,
  Boxes,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  NotificationBadge,
  NotificationPopover,
  NotificationDrawer,
} from "../../features/notifications";
import { BranchSelectorDropdown } from "./BranchSelectorDropdown";
import { posShiftApi } from "../../features/pos/api/posShiftApi";
/* ─── Data ─── */

interface NavSubItem {
  label: string;
  to: string;
  badge?: string;
  badgeType?: "red" | "blue" | "orange";
  divider?: boolean;
  desc?: string;
  icon?: FC<{ size?: number; color?: string }> | string;
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
  badge?: number | string;
  badgeType?: "red" | "blue" | "orange";
  children?: NavSubItem[];
  sections?: NavSection[];
}

const UsersIcon: FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "currentColor",
}) => (
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

const GiftNavIcon: FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "currentColor",
}) => <Gift size={size} color={color} />;

const StoreNavIcon: FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "currentColor",
}) => <Store size={size} color={color} strokeWidth={1.8} />;

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: DashboardIcon,
    to: "/store-owner/dashboard",
  },
  {
    id: "store",
    label: "Cửa hàng",
    icon: StoreNavIcon,
    to: "/store-owner/subscriptions",
  },
  {
    id: "goods",
    label: "Hàng hóa",
    icon: PackageIcon,
    sections: [
      {
        title: "Danh mục & Sản phẩm",
        items: [
          {
            label: "Danh mục hàng hóa",
            to: "/store-owner/products",
            badge: "",
          },
          {
            label: "Nhóm hàng",
            to: "/store-owner/categories",
            badge: "",
          },
          {
            label: "Sản phẩm theo NCC",
            to: "/store-owner/suppliers/products",
            badge: "",
            badgeType: "blue",
          },
          {
            label: "Sản phẩm theo Cửa hàng",
            to: "/store-owner/stores/products",
            badge: "Mới",
            badgeType: "blue",
          },
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
            label: "Tồn kho cửa hàng",
            to: "/store-owner/inventory",
            badge: "FE-04",
            badgeType: "blue",
          },
          {
            label: "Chi tiết lô & Hạn sử dụng",
            to: "/store-owner/batches",
            badge: "FEFO",
            badgeType: "blue",
          },
          {
            label: "Kiểm kho & Cân đối",
            to: "/store-owner/suppliers/products?view=inventory",
          },
          {
            label: "Chuyển hàng liên kho",
            to: "/store-owner/transfers",
            badge: "",
            badgeType: "blue",
          },
        ],
      },
      {
        title: "Quy cách & Đóng gói",
        items: [
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
            label: "Cửa Hàng với nhà cung cấp",
            to: "/store-owner/suppliers/branches",
          },
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
          },
          {
            label: "Chốt đơn với nhà cung cấp",
            to: "/store-owner/purchase-orders/dispatch-hub",
          },
          {
            label: "Danh sách đơn mua hàng (PO)",
            to: "/store-owner/purchase-orders/list",
          },
          {
            label: "Phiếu nhập kho (GRN) & Lịch nhận",
            to: "/store-owner/goods-receipts",
          },
          {
            label: "Trả hàng nhà cung cấp (RTV)",
            to: "/store-owner/supplier-returns",
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Tiền & Báo cáo",
    icon: TrendingUpIcon,
    children: [
      {
        label: "Tổng quan tài chính & lãi lỗ",
        to: "/store-owner/finance",
        desc: "Số dư thực, việc cần duyệt & báo cáo P&L",
        icon: "📊",
      },
      {
        label: "Sổ quỹ",
        to: "/store-owner/cashbook",
        desc: "Két quầy, két sắt, ngân hàng & phân loại chi",
        icon: "💰",
      },
      {
        label: "Ca & két (duyệt chi, rút két)",
        to: "/store-owner/cash-control",
        desc: "Lịch sử ca POS, duyệt chi vượt mức & hạn mức",
        icon: "🔐",
        badgeType: "orange",
      },
      {
        label: "Chi phí & hóa đơn phải trả",
        to: "/store-owner/expenses",
        desc: "Tiền điện, mặt bằng, bảo trì (đã bỏ mục trùng)",
        icon: "🧾",
      },
      {
        label: "Thuế & sổ sách",
        to: "/store-owner/tax-snapshots",
        desc: "Tờ khai 01/CNKD & 7 sổ TT152 theo ngưỡng 1 tỷ",
        icon: "🏛️",
      },
      {
        label: "Khách nợ & Thu công nợ",
        to: "/store-owner/customers",
        desc: "Sổ nợ, hạn mức tín dụng & thu nợ VietQR",
        icon: "👥",
      },
    ],
  },
  {
    id: "employees",
    label: "Nhân viên",
    icon: UsersIcon,
    sections: [
      {
        title: "Nhân sự & Hồ sơ",
        items: [
          { label: "Danh sách nhân viên", to: "/store-owner/employees" }
        ],
      },
      {
        title: "Lịch & Chấm công",
        items: [
          {
            label: "Lịch làm việc chi nhánh",
            to: "/store-owner/employees/schedule"
          },
          {
            label: "Bảng chấm công",
            to: "/store-owner/employees/attendance"
          },
          {
            label: "Duyệt đơn yêu cầu",
            to: "/store-owner/employees/approval-requests"
          },
          {
            label: "Cấu hình ca làm việc",
            to: "/store-owner/employees/shifts"
          },
        ],
      },
      {
        title: "Lương & Đãi ngộ",
        items: [
          {
            label: "Bảng tính lương tháng",
            to: "/store-owner/employees/payroll",
          }
        ],
      },
    ],
  },
  {
    id: "promotions",
    label: "Khuyến mãi",
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
        ],
      },
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

/* ─── Dropdown Active Helpers ─── */
const NAV_PATH_EXCLUSIONS: Record<
  string,
  { excludedSegments?: string[]; excludedParams?: string[] }
> = {
  "/store-owner/suppliers": {
    excludedSegments: ["/products", "/branches"],
    excludedParams: ["view"],
  },
  "/store-owner/suppliers/products": { excludedParams: ["view"] },
  "/store-owner/expenses": { excludedParams: ["view", "tab"] },
  "/store-owner/employees": {
    excludedSegments: ["/schedule", "/shifts", "/attendance", "/payroll"],
    excludedParams: ["view"],
  },
  "/store-owner/employees/schedule": { excludedParams: ["view"] },
  "/store-owner/promotions": { excludedParams: ["view", "action"] },
  "/store-owner/vouchers": { excludedParams: ["view", "action"] },
  "/store-owner/loyalty-config": { excludedParams: ["view", "action"] },
};

function matchesQueryParams(currQuery: string, toQuery: string): boolean {
  const currParams = new URLSearchParams(currQuery);
  const toParams = new URLSearchParams(toQuery);
  let count = 0;
  let match = true;
  toParams.forEach((value, key) => {
    count += 1;
    if (currParams.get(key) !== value) {
      match = false;
    }
  });
  return count > 0 && match;
}

function isQueryNavItemActive(
  toPath: string,
  toQuery: string,
  currPath: string,
  normalizedQuery: string,
): boolean {
  if (
    toPath === "/store-owner/subscriptions" &&
    toQuery === "tab=subscriptions" &&
    !normalizedQuery
  ) {
    return currPath === toPath;
  }
  if (
    toPath === "/store-owner/subscriptions" ||
    toPath === "/store-owner/account"
  ) {
    return currPath === toPath && normalizedQuery === toQuery;
  }
  return currPath === toPath && matchesQueryParams(normalizedQuery, toQuery);
}

function isNavItemActive(
  to: string,
  currPath: string,
  currQuery: string,
): boolean {
  const [toPath, toQuery] = to.split("?");
  const normalizedQuery = currQuery.startsWith("?")
    ? currQuery.slice(1)
    : currQuery;

  if (toQuery) {
    return isQueryNavItemActive(toPath, toQuery, currPath, normalizedQuery);
  }

  const pathMatches =
    currPath === toPath ||
    currPath.startsWith(toPath + "/") ||
    (toPath === "/store-owner/customers" &&
      (currPath === "/customers" || currPath.startsWith("/customers/")));
  if (!pathMatches) {
    return false;
  }

  const rule = NAV_PATH_EXCLUSIONS[toPath];
  if (!rule) {
    return true;
  }

  if (rule.excludedSegments?.some((seg) => currPath.includes(seg))) {
    return false;
  }

  const currParams = new URLSearchParams(normalizedQuery);
  return !rule.excludedParams?.some((param) => currParams.has(param));
}

/* ─── Dropdown ─── */
interface DropdownProps {
  items?: NavSubItem[];
  sections?: NavSection[];
  isOpen: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
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
  const hasRichCards = Boolean(items && items.some((i) => Boolean(i.desc)));
  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect && rect.bottom > 0 ? rect.bottom : coords.top;
  const rawLeft = rect && rect.left > 0 ? rect.left : coords.left;
  const maxLeft =
    typeof window !== "undefined"
      ? window.innerWidth - (isMega ? 700 : hasRichCards ? 360 : 250) - 16
      : rawLeft;
  const left = Math.max(16, Math.min(rawLeft, maxLeft));

  const checkItemActive = (to: string) => {
    const [currPath, currQuery = ""] = currentPath.split("?");
    return isNavItemActive(to, currPath, currQuery);
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
          padding: isMega ? "18px 24px" : hasRichCards ? "8px 6px" : "8px 0",
          minWidth: isMega
            ? sections && sections.length <= 2
              ? 460
              : 680
            : hasRichCards
              ? 330
              : 210,
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
                  <Link
                    key={item.label + item.to}
                    to={item.to}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "active" : undefined}
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
                  </Link>
                );
              })}
            </div>
          ))}

        {/* Single-Column List (Standard or Rich Cards) */}
        {!isMega &&
          items?.map((item) => {
            const isActive = checkItemActive(item.to);

            if (hasRichCards) {
              return (
                <Fragment key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "active" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 12px",
                      borderRadius: 10,
                      textDecoration: "none",
                      backgroundColor: isActive ? "#F0FDFA" : "transparent",
                      border: isActive ? "1px solid #CCFBF1" : "1px solid transparent",
                      transition: "all 0.15s ease",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "#F8FAFC";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: isActive ? "#CCFBF1" : "#F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {typeof item.icon === "string" ? item.icon : item.icon ? <item.icon size={18} /> : "📊"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: isActive ? "#0F766E" : "#0F172A",
                          lineHeight: 1.25,
                        }}
                      >
                        {item.label}
                      </div>
                      {item.desc && (
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "#64748B",
                            marginTop: 2,
                            lineHeight: 1.3,
                            whiteSpace: "normal",
                          }}
                        >
                          {item.desc}
                        </div>
                      )}
                    </div>
                    {item.badge && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 20,
                          height: 20,
                          padding: "0 6px",
                          borderRadius: 10,
                          backgroundColor:
                            item.badgeType === "orange"
                              ? "#EA580C"
                              : item.badgeType === "red"
                                ? "#EF4444"
                                : "#0F766E",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </Fragment>
              );
            }

            return (
              <Fragment key={item.to}>
                {item.divider && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "#F1F5F9",
                      margin: "5px 0",
                    }}
                  />
                )}
                <Link
                  to={item.to}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "active" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 18px",
                    textDecoration: "none",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive
                      ? "var(--blue-primary)"
                      : "var(--text-muted)",
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
                  <span style={{ flex: 1, whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
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
                            : item.badgeType === "orange"
                              ? "#EA580C"
                              : isActive
                                ? "rgba(15,118,110,0.15)"
                                : "var(--blue-light)",
                        color:
                          item.badgeType === "red" || item.badgeType === "orange"
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
                </Link>
              </Fragment>
            );
          })}
      </div>
    </div>
  );
};

/* ─── Main TopNav Component ─── */
export const AppTopNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const userRole = (user?.role || "").toUpperCase();
  const isEmployee =
    userRole === "EMPLOYEE" ||
    userRole === "CASHIER" ||
    userRole === "STAFF";

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountTimerRef = useRef<number | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsTimerRef = useRef<number | null>(null);
  const [pendingCashApprovalCount, setPendingCashApprovalCount] = useState<number>(0);

  const visibleNavGroups = useMemo(() => {
    let groups = NAV_GROUPS;
    if (isEmployee) {
      // Ẩn hoàn toàn menu Tài chính, Nhân sự và Cấu hình gói cước gian hàng đối với Employee
      groups = groups.filter(
        (g) => g.id !== "finance" && g.id !== "employees" && g.id !== "store"
      );
    }
    return groups.map((g) => {
      if (g.id === "finance") {
        return {
          ...g,
          badge: pendingCashApprovalCount > 0 ? pendingCashApprovalCount : undefined,
          children: g.children?.map((c) => {
            if (c.to === "/store-owner/cash-control") {
              return {
                ...c,
                badge:
                  pendingCashApprovalCount > 0
                    ? String(pendingCashApprovalCount)
                    : undefined,
              };
            }
            return c;
          }),
        };
      }
      return g;
    });
  }, [isEmployee, pendingCashApprovalCount]);

  useEffect(() => {
    if (user?.role === 'STORE_OWNER') {
      const fetchPending = async () => {
        try {
          const res = await posShiftApi.getPendingMovements('');
          if (res?.movements) {
            const count = res.movements.filter(
              (m) => m.status === 'PendingApproval' || m.status === 2 || ((m.category === 'CASH_DRAW' || m.category === 2) && !m.isConfirmedByOwner)
            ).length;
            setPendingCashApprovalCount(count);
          }
        } catch {
          // ignore
        }
      };
      fetchPending();
    }
  }, [user?.role, location.pathname]);

  const clearSettingsTimer = useCallback(() => {
    if (settingsTimerRef.current !== null) {
      window.clearTimeout(settingsTimerRef.current);
      settingsTimerRef.current = null;
    }
  }, []);

  const handleSettingsEnter = useCallback(() => {
    clearSettingsTimer();
    setSettingsMenuOpen(true);
  }, [clearSettingsTimer]);

  const handleSettingsLeave = useCallback(() => {
    clearSettingsTimer();
    settingsTimerRef.current = window.setTimeout(() => {
      setSettingsMenuOpen(false);
    }, 220);
  }, [clearSettingsTimer]);
  const anchorRefs = useRef<
    Map<string, RefObject<HTMLDivElement | null>>
  >(new Map());
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearAccountTimer = useCallback(() => {
    if (accountTimerRef.current !== null) {
      window.clearTimeout(accountTimerRef.current);
      accountTimerRef.current = null;
    }
  }, []);

  const handleAccountEnter = useCallback(() => {
    clearAccountTimer();
    setAccountMenuOpen(true);
  }, [clearAccountTimer]);

  const handleAccountLeave = useCallback(() => {
    clearAccountTimer();
    accountTimerRef.current = window.setTimeout(() => {
      setAccountMenuOpen(false);
    }, 220);
  }, [clearAccountTimer]);

  // Close dropdown on route change and cleanup timer
  useEffect(() => {
    clearCloseTimer();
    clearAccountTimer();
    clearSettingsTimer();
    setOpenMenu(null);
    setMobileOpen(false);
    setAccountMenuOpen(false);
    setSettingsMenuOpen(false);
    return () => {
      clearCloseTimer();
      clearAccountTimer();
      clearSettingsTimer();
    };
  }, [location.pathname, clearCloseTimer, clearAccountTimer, clearSettingsTimer]);

  // Close settings menu on click outside or Escape
  useEffect(() => {
    if (!settingsMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setSettingsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuOpen]);

  // Close account menu on click outside or Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const getAnchorRef = useCallback(
    (id: string): RefObject<HTMLDivElement | null> => {
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
        location.pathname === "/store-owner/finance" ||
        location.pathname.startsWith("/store-owner/finance/") ||
        location.pathname === "/store-owner/cashbook" ||
        location.pathname.startsWith("/store-owner/cashbook/") ||
        location.pathname === "/store-owner/cash-control" ||
        location.pathname.startsWith("/store-owner/cash-control/") ||
        location.pathname === "/store-owner/pos-cash-control" ||
        location.pathname.startsWith("/store-owner/pos-cash-control/") ||
        location.pathname === "/store-owner/shifts" ||
        location.pathname.startsWith("/store-owner/shifts/") ||
        location.pathname === "/store-owner/tax-snapshots" ||
        location.pathname.startsWith("/store-owner/tax-snapshots/") ||
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
    if (group.id === "store") {
      return (
        location.pathname === "/store-owner/subscriptions" ||
        location.pathname.startsWith("/store-owner/subscriptions/") ||
        location.pathname === "/store-owner/settings" ||
        location.pathname.startsWith("/store-owner/settings/")
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
      {/* ── Single Unified Top Navigation Bar (Merged Header & Navigation) ── */}
      <nav
        className="topnav-primary"
        style={{
          backgroundColor: "var(--blue-primary)",
          borderBottom: "1px solid var(--blue-dark)",
          position: "sticky",
          top: 0,
          zIndex: 200,
          boxShadow: "0 2px 10px rgba(0, 50, 150, 0.18)",
        }}
        aria-label="Điều hướng chính"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 50,
            padding: "0 20px",
            gap: 12,
            boxSizing: "border-box",
          }}
        >
          {/* Brand Logo & Name */}
          <Link
            to={
              location.pathname.startsWith("/store-owner")
                ? "/store-owner/dashboard"
                : "/admin/dashboard"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              flexShrink: 0,
              marginRight: 10,
            }}
          >
            <BrandLogo />
            <div>
              <div
                style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                }}
              >
                MT-GRMS
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Quản lý Tạp Hóa
              </div>
            </div>
          </Link>

          {/* Menus List */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              height: 50,
              gap: 2,
              overflowX: "auto",
              scrollbarWidth: "none",
              flex: 1,
            }}
          >
            {visibleNavGroups.map((group) => {
              const active = isGroupActive(group);
              const isOpen = openMenu === group.id;
              const ref = getAnchorRef(group.id);

              if (group.to) {
                const targetTo =
                  group.id === "overview" &&
                    location.pathname.startsWith("/store-owner")
                    ? "/store-owner/dashboard"
                    : group.to;
                // Direct link (no dropdown)
                return (
                  <NavLink
                    key={group.id}
                    to={targetTo}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "0 14px",
                      height: "100%",
                      textDecoration: "none",
                      fontSize: 13.5,
                      fontFamily: "var(--font-sans)",
                      fontWeight: active ? 700 : 500,
                      color: "#ffffff",
                      backgroundColor: active
                        ? "rgba(0,0,0,0.2)"
                        : "transparent",
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
                      gap: 7,
                      padding: "0 14px",
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
                    {group.badge != null && Number(group.badge) > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 9,
                          backgroundColor: "#EA580C",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        {group.badge}
                      </span>
                    )}
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

          {/* Right actions: Chọn chi nhánh + Hỗ trợ + Góp ý + Divider + Thông báo + Cài đặt + Profile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            {/* 0. Dropdown chọn chi nhánh */}
            <BranchSelectorDropdown />

            {/* 1. Hỗ trợ */}
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "var(--radius-pill)",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={() =>
                alert(
                  "Tổng đài hỗ trợ MT-GRMS: 1900 6522 (8h00 - 22h00 hàng ngày)",
                )
              }
              title="Tổng đài CSKH: 1900 6522"
            >
              <MessageCircle size={15} strokeWidth={2} />
              <span>Hỗ trợ</span>
            </button>

            {/* 2. Góp ý */}
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "var(--radius-pill)",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={() =>
                alert(
                  "Cảm ơn bạn! Mọi ý kiến đóng góp xin gửi về: hotro@mt-grms.vn",
                )
              }
              title="Gửi ý kiến đóng góp tính năng"
            >
              <SquarePen size={15} strokeWidth={2} />
              <span>Góp ý</span>
            </button>

            {/* 3. Divider */}
            <div
              style={{
                width: 1,
                height: 18,
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                margin: "0 2px",
              }}
            />

            {/* 4. Bell notification (Dynamic Notification Center) */}
            <div style={{ position: "relative" }}>
              <NotificationBadge />
              <NotificationPopover />
            </div>

            {/* 5. Settings Gear icon with Interactive Dropdown */}
            <div
              style={{ position: "relative" }}
              ref={settingsMenuRef}
              onMouseEnter={handleSettingsEnter}
              onMouseLeave={handleSettingsLeave}
            >
              <button
                type="button"
                onClick={() => {
                  clearSettingsTimer();
                  setSettingsMenuOpen((v) => !v);
                }}
                style={{
                  position: "relative",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: settingsMenuOpen
                    ? "rgba(255, 255, 255, 0.4)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = settingsMenuOpen
                    ? "rgba(255, 255, 255, 0.4)"
                    : "transparent";
                }}
                title={
                  pendingCashApprovalCount > 0
                    ? `Cài đặt (${pendingCashApprovalCount} phiếu chi/rút két chờ duyệt)`
                    : "Thiết lập gian hàng, thanh toán & Gói dịch vụ"
                }
                aria-expanded={settingsMenuOpen}
                aria-haspopup="true"
              >
                <Settings size={18} strokeWidth={2} />
                {pendingCashApprovalCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      border: "1.5px solid #0f766e",
                    }}
                  />
                )}
              </button>

              {settingsMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    paddingTop: 8,
                    zIndex: 1000,
                  }}
                  onMouseEnter={handleSettingsEnter}
                  onMouseLeave={handleSettingsLeave}
                >
                  <div
                    style={{
                      width: 330,
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      boxShadow:
                        "0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)",
                      border: "1px solid #E2E8F0",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {/* Header menu */}
                    <div
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Settings size={16} className="text-teal-700" />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Cài đặt & Thiết lập
                      </span>
                    </div>

                    <div style={{ padding: "8px 0" }}>
                      {/* Mục 1: Cấu hình VietQR & SePay */}
                      <Link
                        to="/store-owner/payment-config"
                        onClick={() => setSettingsMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 16px",
                          textDecoration: "none",
                          color: "inherit",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#ecfdf5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: "#ccfbf1",
                            color: "#0f766e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          <CreditCard size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "#065f46",
                              }}
                            >
                              Cấu hình VietQR & SePay
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                backgroundColor: "#10b981",
                                color: "#ffffff",
                                padding: "1px 6px",
                                borderRadius: 10,
                              }}
                            >
                              Mới
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            Tài khoản ngân hàng, SePay API Key & Webhook
                          </div>
                        </div>
                      </Link>

                      <div
                        style={{
                          height: 1,
                          backgroundColor: "#f1f5f9",
                          margin: "6px 16px",
                        }}
                      />

                      {/* Mục 2: Hạn Mức & Duyệt Chi Két POS */}
                      <Link
                        to="/store-owner/cash-control"
                        onClick={() => setSettingsMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 16px",
                          textDecoration: "none",
                          color: "inherit",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f0fdfa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: "#ccfbf1",
                            color: "#0f766e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          <ShieldCheck size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "#0f766e",
                              }}
                            >
                              Hạn Mức & Duyệt Chi Két POS
                            </span>
                            {pendingCashApprovalCount > 0 ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  backgroundColor: "#ef4444",
                                  color: "#ffffff",
                                  padding: "1px 7px",
                                  borderRadius: 10,
                                }}
                              >
                                {pendingCashApprovalCount} cần duyệt
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  backgroundColor: "#0f766e",
                                  color: "#ffffff",
                                  padding: "1px 6px",
                                  borderRadius: 10,
                                }}
                              >
                                POS
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            Thiết lập hạn mức, phê duyệt chi két & xác nhận tiền rút két
                          </div>
                        </div>
                      </Link>

                      <div
                        style={{
                          height: 1,
                          backgroundColor: "#f1f5f9",
                          margin: "6px 16px",
                        }}
                      />

                      {/* Mục 3: Gói dịch vụ MT-GRMS */}
                      <Link
                        to="/store-owner/subscriptions"
                        onClick={() => setSettingsMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 16px",
                          textDecoration: "none",
                          color: "inherit",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: "#dbeafe",
                            color: "#1d4ed8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          <Boxes size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            Gói dịch vụ MT-GRMS
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            Gói dịch vụ & Gia hạn phần mềm
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Profile Avatar User Dropdown */}
            <div
              style={{ position: "relative" }}
              ref={accountMenuRef}
              onMouseEnter={handleAccountEnter}
              onMouseLeave={handleAccountLeave}
            >
              <button
                type="button"
                onClick={() => {
                  clearAccountTimer();
                  setAccountMenuOpen((v) => !v);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: accountMenuOpen
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  marginLeft: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = accountMenuOpen
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(255, 255, 255, 0.2)";
                }}
                title="Tài khoản cá nhân"
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
              >
                <User size={18} strokeWidth={2} />
              </button>

              {accountMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    paddingTop: 8,
                    zIndex: 1000,
                  }}
                  onMouseEnter={handleAccountEnter}
                  onMouseLeave={handleAccountLeave}
                >
                  <div
                    style={{
                      width: 270,
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      boxShadow:
                        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      border: "1px solid #E2E8F0",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header info tài khoản */}
                    <Link
                      to="/store-owner/account?tab=account-profile"
                      onClick={() => setAccountMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "16px",
                        textDecoration: "none",
                        backgroundColor: "#F8FAFC",
                        borderBottom: "1px solid #E2E8F0",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F1F5F9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#F8FAFC";
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          backgroundColor: "#EDF2F7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "#64748B",
                        }}
                      >
                        <User size={22} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 700,
                            color: "#1E293B",
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {user?.phone || user?.fullName || "0369880798"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#EF4444",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Chưa bật xác thực 2 lớp
                        </div>
                      </div>
                      <ChevronRight size={16} color="#94A3B8" />
                    </Link>

                    <div style={{ height: 1, backgroundColor: "#F1F5F9" }} />

                    {/* Ví gian hàng & Hợp đồng (chỉ dành cho Chủ gian hàng & Admin) */}
                    {!isEmployee && (
                      <Link
                        to="/store-owner/account?tab=wallet"
                        onClick={() => setAccountMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 16px",
                          textDecoration: "none",
                          color: "#1E293B",
                          backgroundColor: "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <Wallet size={18} strokeWidth={1.9} color="#334155" />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: "#1E293B",
                          }}
                        >
                          Ví tiền
                        </span>
                      </Link>
                    )}

                    <Link
                      to="/store-owner/account?tab=terms"
                      onClick={() => setAccountMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        textDecoration: "none",
                        color: "#1E293B",
                        backgroundColor: "transparent",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <FileText size={18} strokeWidth={1.9} color="#334155" />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "#1E293B",
                        }}
                      >
                        Điều khoản & Hợp đồng
                      </span>
                    </Link>

                    <div style={{ height: 1, backgroundColor: "#F1F5F9" }} />

                    {/* Row 5: Đăng xuất */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                        navigate("/login");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        width: "100%",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#FEF2F2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <LogOut size={18} strokeWidth={1.9} color="#EF4444" />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "#EF4444",
                        }}
                      >
                        Đăng xuất
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: "none",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-pill)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            className="topnav-hamburger"
            title="Menu"
          >
            <MenuIcon size={16} />
          </button>
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
            {visibleNavGroups.map((group) => (
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
                            const isActive = isNavItemActive(
                              child.to,
                              location.pathname,
                              location.search,
                            );
                            return (
                              <Link
                                key={child.label + child.to}
                                to={child.to}
                                onClick={() => setMobileOpen(false)}
                                aria-current={isActive ? "page" : undefined}
                                className={isActive ? "active" : undefined}
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
                              </Link>
                            );
                          })}
                        </div>
                      ))
                      : group.children?.map((child) => {
                        const isActive = isNavItemActive(
                          child.to,
                          location.pathname,
                          location.search,
                        );
                        return (
                          <Link
                            key={child.to}
                            to={child.to}
                            onClick={() => setMobileOpen(false)}
                            aria-current={isActive ? "page" : undefined}
                            className={isActive ? "active" : undefined}
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
                          </Link>
                        );
                      })}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Extended Global Notification Drawer */}
      <NotificationDrawer />
    </>
  );
};
